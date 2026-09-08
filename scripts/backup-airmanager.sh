#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_dir="/var/backups/airmanager/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
runuser -u postgres -- pg_dump --format=custom airmanager > "$backup_dir/database.dump"
tar --exclude='./node_modules' --exclude='./.git' -czf "$backup_dir/application.tgz" -C /opt/AirManager .
git -C /opt/AirManager bundle create "$backup_dir/source.bundle" --all
systemctl cat airmanager.service > "$backup_dir/service.txt"
pg_restore --list "$backup_dir/database.dump" > "$backup_dir/database-contents.txt"
(cd "$backup_dir" && sha256sum database.dump application.tgz source.bundle > SHA256SUMS)
# Retain at least the seven most recent backups; prune only this job's dated folders.
python3 - <<'PY2'
from pathlib import Path
import re,shutil
folders=sorted(p for p in Path('/var/backups/airmanager').iterdir() if p.is_dir() and re.fullmatch(r'\d{8}T\d{6}Z',p.name))
for p in folders[:-7]: shutil.rmtree(p)
PY2
printf 'Backup verified: %s\n' "$backup_dir"
