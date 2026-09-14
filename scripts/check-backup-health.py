#!/usr/bin/env python3
"""Check the latest private live backup for freshness and integrity."""
import datetime
import hashlib
import json
from pathlib import Path
import sys

TARGET = "elated-bee-284"
DESTINATION = Path.home() / ".codex/private/church-backups" / TARGET
MAX_AGE_HOURS = 36


def fail(message):
    print(f"Backup health check failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def main():
    if not DESTINATION.is_dir():
        fail("private backup directory is missing")
    candidates = sorted(
        path for path in DESTINATION.iterdir()
        if path.is_dir() and (path / "manifest.json").is_file()
    )
    if not candidates:
        fail("no completed backup manifest was found")
    latest = candidates[-1]
    manifest = json.loads((latest / "manifest.json").read_text())
    snapshot = latest / "snapshot.zip"
    if manifest.get("deployment") != TARGET:
        fail("latest manifest names the wrong deployment")
    if manifest.get("file_storage_requested") is not True:
        fail("latest backup does not include file storage")
    if manifest.get("zip_integrity") != "passed":
        fail("latest backup did not pass ZIP integrity")
    if not snapshot.is_file():
        fail("latest snapshot.zip is missing")
    expected = manifest.get("sha256")
    if not expected or digest(snapshot) != expected:
        fail("latest snapshot hash does not match its manifest")
    completed = datetime.datetime.fromisoformat(manifest["completed_at"])
    if completed.tzinfo is None:
        fail("latest timestamp has no timezone")
    age = datetime.datetime.now(datetime.timezone.utc) - completed.astimezone(datetime.timezone.utc)
    if age > datetime.timedelta(hours=MAX_AGE_HOURS):
        fail(f"latest backup is stale ({age.total_seconds() / 3600:.1f} hours old)")
    print(json.dumps({
        "status": "healthy",
        "deployment": TARGET,
        "backup": latest.name,
        "age_hours": round(age.total_seconds() / 3600, 2),
        "file_storage_requested": True,
        "zip_integrity": "passed",
        "sha256_verified": True,
    }))


if __name__ == "__main__":
    main()
