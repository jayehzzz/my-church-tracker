#!/usr/bin/env python3
"""Create a private, file-inclusive backup of the confirmed shared database.

Read/export only: this script cannot import, restore, reset, or delete records.
Requires this project's installed Convex CLI and the operator's Convex login.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
import uuid
import zipfile


TARGET = "elated-bee-284"
TEAM = "jayden-ayeh"
PROJECT = "church-tracker"
ROOT = Path(__file__).resolve().parents[1]
DESTINATION = Path.home() / ".codex/private/church-backups" / TARGET


def main():
    os.umask(0o077)
    DESTINATION.mkdir(parents=True, exist_ok=True, mode=0o700)
    DESTINATION.chmod(0o700)
    lock = DESTINATION / ".backup.lock"
    # Fail closed if another run is active. A killed run may leave a lock;
    # inspect its process before an operator removes it.
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.write(fd, str(os.getpid()).encode())
    os.close(fd)
    try:
        config = json.loads((Path.home() / ".convex/config.json").read_text())
        request = urllib.request.Request(
            f"https://api.convex.dev/api/deployment/{TARGET}/team_and_project",
            headers={"Authorization": "Bearer " + config["accessToken"]},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            target = json.load(response)
        if (target.get("team"), target.get("project"), target.get("reference")) != (
            TEAM, PROJECT, "production"
        ):
            raise RuntimeError("Live database ownership/reference changed; backup stopped.")
        node = shutil.which("node")
        cli = ROOT / "node_modules/convex/bin/main.js"
        if not node or not cli.is_file():
            raise RuntimeError("Node.js or the project's installed Convex CLI is unavailable.")
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        run_dir = DESTINATION / (stamp + "-" + uuid.uuid4().hex[:8])
        run_dir.mkdir(mode=0o700)
        snapshot = run_dir / "snapshot.zip"
        env = dict(os.environ)
        # Ignore inherited deployment credentials/selection; use the signed-in
        # operator and the exact named deployment, never the recovery default.
        for key in list(env):
            if key.startswith("CONVEX_"):
                env.pop(key)
        env["CONVEX_DEPLOYMENT"] = f"prod:{TARGET}"
        version = json.loads((ROOT / "node_modules/convex/package.json").read_text())["version"]
        (run_dir / "package.json").write_text(json.dumps({
            "private": True, "dependencies": {"convex": version}
        }))
        # Export resolves an explicit deployment name using the current login.
        # Run outside the project so its .env.local cannot change authentication.
        result = subprocess.run(
            [node, str(cli), "export", "--deployment", TARGET,
             "--include-file-storage", "--path", str(snapshot)],
            cwd=run_dir, env=env, capture_output=True, text=True, timeout=1800,
        )
        (run_dir / "export.log").write_text(result.stdout + result.stderr)
        if result.returncode:
            raise RuntimeError(f"Export failed; private operator log: {run_dir / 'export.log'}")
        with zipfile.ZipFile(snapshot) as archive:
            damaged = archive.testzip()
            if damaged:
                raise RuntimeError("Backup ZIP integrity check failed.")
            counts = {}
            for name in archive.namelist():
                if name.endswith("/documents.jsonl"):
                    with archive.open(name) as rows:
                        counts[name.removesuffix("/documents.jsonl")] = sum(
                            1 for row in rows if row.strip()
                        )
        digest = hashlib.sha256()
        with snapshot.open("rb") as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(block)
        manifest = {
            "deployment": TARGET, "team": TEAM, "project": PROJECT,
            "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "file_storage_requested": True, "zip_integrity": "passed",
            "sha256": digest.hexdigest(), "size_bytes": snapshot.stat().st_size,
            "table_counts": counts,
            "restore_rehearsal": "not performed by this script",
        }
        (run_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(json.dumps({"status": "complete", "deployment": TARGET,
                          "directory": str(run_dir), "size_bytes": snapshot.stat().st_size}))
    finally:
        lock.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Provider responses/credentials are deliberately not printed here.
        print(f"Backup failed ({type(error).__name__}). Inspect the private backup directory.", file=sys.stderr)
        sys.exit(1)
