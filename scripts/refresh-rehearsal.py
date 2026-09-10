#!/usr/bin/env python3
"""Refresh the isolated rehearsal deployment from the current live database.

This copies the full production snapshot, including private church records and
file storage. The destination is hard-pinned to the disposable rehearsal
deployment and is verified before any replace operation runs.
"""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PRIVATE_ROOT = Path.home() / ".codex/private/church-rehearsal"
LIVE_DEPLOYMENT = "elated-bee-284"
LIVE_TEAM = "jayden-ayeh"
LIVE_PROJECT = "church-tracker"
LIVE_REFERENCE = "production"
REHEARSAL_DEPLOYMENT = "standing-mongoose-699"
REHEARSAL_TEAM = "jayden-ayeh"
REHEARSAL_PROJECT = "church-tracker-staging"
REHEARSAL_REFERENCE = "rehearsal"
REHEARSAL_URL = f"https://{REHEARSAL_DEPLOYMENT}.convex.cloud"


def convex_cli():
    node = shutil.which("node")
    cli = ROOT / "node_modules/convex/bin/main.js"
    if not node or not cli.is_file():
        raise RuntimeError("Node.js or the project's installed Convex CLI is unavailable.")
    return node, cli


def convex(args, *, capture=False, timeout=1800):
    node, cli = convex_cli()
    env = dict(os.environ)
    for key in list(env):
        if key.startswith("CONVEX_"):
            env.pop(key)
    return subprocess.run(
        [node, str(cli), *args],
        cwd=ROOT,
        env=env,
        check=True,
        capture_output=capture,
        text=True,
        timeout=timeout,
    )


def deployment_metadata(name):
    config = json.loads((Path.home() / ".convex/config.json").read_text())
    request = urllib.request.Request(
        f"https://api.convex.dev/api/deployment/{name}/team_and_project",
        headers={"Authorization": "Bearer " + config["accessToken"]},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def verify_deployment(name, expected):
    metadata = deployment_metadata(name)
    actual = (metadata.get("team"), metadata.get("project"), metadata.get("reference"))
    if actual != expected:
        raise RuntimeError(f"Deployment identity check failed for {name}; refresh stopped.")


def env_get(name, deployment):
    result = convex(["env", "get", name, "--deployment", deployment], capture=True, timeout=120)
    return result.stdout.strip()


def env_set(name, value, deployment):
    convex(["env", "set", name, value, "--deployment", deployment], capture=True, timeout=120)


def snapshot_counts(path):
    counts = {}
    with zipfile.ZipFile(path) as archive:
        damaged = archive.testzip()
        if damaged:
            raise RuntimeError(f"Snapshot ZIP integrity failed at {damaged}.")
        for name in archive.namelist():
            if name.endswith("/documents.jsonl"):
                with archive.open(name) as rows:
                    counts[name.removesuffix("/documents.jsonl")] = sum(
                        1 for row in rows if row.strip()
                    )
    return counts


def backup_live():
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/backup-live.py")],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=1800,
    )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if not lines:
        raise RuntimeError("Live backup completed without a result record.")
    payload = json.loads(lines[-1])
    snapshot = Path(payload["directory"]) / "snapshot.zip"
    manifest = Path(payload["directory"]) / "manifest.json"
    if not snapshot.is_file() or not manifest.is_file():
        raise RuntimeError("Live backup did not produce the expected snapshot and manifest.")
    return snapshot, json.loads(manifest.read_text())


def deploy_backend_to_rehearsal():
    PRIVATE_ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
    PRIVATE_ROOT.chmod(0o700)
    target_env = PRIVATE_ROOT / "convex-target.env"
    target_env.write_text(f"CONVEX_DEPLOYMENT=prod:{REHEARSAL_DEPLOYMENT}\n")
    target_env.chmod(0o600)

    local_env = ROOT / ".env.local"
    existed = local_env.exists()
    original = local_env.read_bytes() if existed else None
    try:
        convex(
            ["dev", "--once", "--env-file", str(target_env), "--typecheck", "enable"],
            timeout=1800,
        )
    finally:
        if existed:
            local_env.write_bytes(original)
        elif local_env.exists():
            local_env.unlink()


def verify_rehearsal_copy(expected_counts):
    PRIVATE_ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
    verification = PRIVATE_ROOT / "verification.zip"
    if verification.exists():
        verification.unlink()
    convex(
        [
            "export",
            "--deployment",
            REHEARSAL_DEPLOYMENT,
            "--include-file-storage",
            "--path",
            str(verification),
        ],
        capture=True,
    )
    actual_counts = snapshot_counts(verification)
    if actual_counts != expected_counts:
        raise RuntimeError("Rehearsal table counts do not match the production snapshot.")
    return actual_counts


def main():
    os.umask(0o077)
    verify_deployment(LIVE_DEPLOYMENT, (LIVE_TEAM, LIVE_PROJECT, LIVE_REFERENCE))
    verify_deployment(
        REHEARSAL_DEPLOYMENT,
        (REHEARSAL_TEAM, REHEARSAL_PROJECT, REHEARSAL_REFERENCE),
    )

    env_set("AUTH0_DOMAIN", env_get("AUTH0_DOMAIN", LIVE_DEPLOYMENT), REHEARSAL_DEPLOYMENT)
    env_set("AUTH0_CLIENT_ID", env_get("AUTH0_CLIENT_ID", LIVE_DEPLOYMENT), REHEARSAL_DEPLOYMENT)
    env_set("CHURCH_ENV", "staging", REHEARSAL_DEPLOYMENT)
    env_set("CHURCH_DATA_DISPOSABLE", "true", REHEARSAL_DEPLOYMENT)

    if env_get("CHURCH_ENV", REHEARSAL_DEPLOYMENT) != "staging":
        raise RuntimeError("Rehearsal environment is not marked staging; refresh stopped.")
    if env_get("CHURCH_DATA_DISPOSABLE", REHEARSAL_DEPLOYMENT).lower() != "true":
        raise RuntimeError("Rehearsal deployment is not marked disposable; refresh stopped.")

    snapshot, manifest = backup_live()
    expected_counts = manifest.get("table_counts") or snapshot_counts(snapshot)

    deploy_backend_to_rehearsal()
    convex(
        [
            "import",
            "--deployment",
            REHEARSAL_DEPLOYMENT,
            "--replace-all",
            "--yes",
            str(snapshot),
        ],
        timeout=1800,
    )
    actual_counts = verify_rehearsal_copy(expected_counts)

    print(
        json.dumps(
            {
                "status": "complete",
                "source": LIVE_DEPLOYMENT,
                "rehearsal": REHEARSAL_DEPLOYMENT,
                "rehearsal_url": REHEARSAL_URL,
                "backup_directory": str(snapshot.parent),
                "table_counts_verified": len(actual_counts),
            }
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Rehearsal refresh failed ({type(error).__name__}): {error}", file=sys.stderr)
        sys.exit(1)
