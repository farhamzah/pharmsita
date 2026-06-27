# VPS Preflight Package Handoff and Operator Command Checklist

Task: 186
Source clean artifact: pharmsita-task185-f680dfd
Source commit: f680dfd83cf2b9d8fa1014fb08129f2f7da60fa1
Status: READY FOR OPERATOR PREFLIGHT

## Boundary

PharmSITA is deployed as a standalone application.
Do not connect this release to Core/Farmasi UBP services during this handoff.

This checklist prepares the operator to upload and verify the clean release artifact before any
production cutover decision. It does not approve production by itself.

## Local Artifact to Hand Off

Use the clean artifact from Task 185:

| Item | Value |
| --- | --- |
| Release ID | pharmsita-task185-f680dfd |
| Archive | releases/pharmsita-task185-f680dfd/pharmsita-task185-f680dfd.tar.gz |
| Rollback archive | releases/pharmsita-task185-f680dfd/pharmsita-task185-f680dfd-rollback.tar.gz |
| Checksum file | releases/pharmsita-task185-f680dfd/artifact-checksums.sha256 |
| Manifest | releases/pharmsita-task185-f680dfd/manifest.json |
| Git commit | f680dfd83cf2b9d8fa1014fb08129f2f7da60fa1 |
| Manifest dirty flag | false |

Expected artifact SHA256:

```text
0269ff621bfc12f87a2a9805aa739cbdc3d65abb941ba1e17c13e0f238b7cd52  pharmsita-task185-f680dfd.tar.gz
8b5f7f3f1b82829f8ddc1a4a1d9e4c405979fd92ff6879266cea29042480ce6e  pharmsita-task185-f680dfd-rollback.tar.gz
```

## Upload Packet

Upload these files to the VPS release upload directory, for example `/var/www/pharmsita/releases`:

```text
pharmsita-task185-f680dfd.tar.gz
pharmsita-task185-f680dfd-rollback.tar.gz
artifact-checksums.sha256
```

Keep the previous known-good release on the VPS before switching `current`.
The rollback archive only contains rollback metadata, not the full previous release artifact.

## VPS Environment Inputs

Before running commands, the operator must prepare:

| Input | Required | Example |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `postgres://pharmsita:***@127.0.0.1:5432/pharmsita` |
| Frontend URL | Yes | `https://<domain-asli>` |
| API URL | Yes | `https://<domain-asli>/api/v1` |
| Backup manifest | Yes | `/var/backups/pharmsita/postgres/<backup>.manifest.json` |
| Operator name | Yes | `<nama-operator>` |
| Reviewer name | Yes | `<nama-reviewer>` |
| Signer name | Yes | `<nama-approver>` |

Do not use placeholder domain `pharmsita.example.ac.id` for real production sign-off.

## Operator Command Sequence

Run from the VPS.

### 1. Verify Uploaded Artifacts

```bash
cd /var/www/pharmsita/releases
sha256sum -c artifact-checksums.sha256
tar -tzf pharmsita-task185-f680dfd.tar.gz | head
tar -tzf pharmsita-task185-f680dfd-rollback.tar.gz | head
```

GO condition:

- checksum verification returns OK for both archives;
- both archives can be listed by `tar`.

BLOCKED condition:

- checksum mismatch;
- archive cannot be read;
- expected files are missing from upload directory.

### 2. Extract Release

```bash
cd /var/www/pharmsita/releases
tar -xzf pharmsita-task185-f680dfd.tar.gz
cd pharmsita-task185-f680dfd
sha256sum -c checksums.sha256
```

GO condition:

- payload checksum passes.

BLOCKED condition:

- `checksums.sha256` fails;
- extracted release does not contain `dist/`, `backend/dist/`, `backend/database/migrations/`, `tools/`, or `deploy/vps/`.

### 3. Install Runtime Dependencies

```bash
npm ci --omit=dev
```

GO condition:

- dependency install completes without error.

BLOCKED condition:

- dependency install fails;
- operator sees native package or permission errors that are not understood.

### 4. Load Production Environment and Guard

```bash
export DATABASE_URL="<postgres-url>"
export API_BASE_URL="https://<domain-asli>/api/v1"
export FRONTEND_URL="https://<domain-asli>"
npm run backend:check-production-env
```

GO condition:

- production env guard passes;
- no demo/local secret is used.

BLOCKED condition:

- missing production secret;
- demo mode still active;
- `DATABASE_URL` points to a wrong database.

### 5. Backup and Migration Safety Gate

If a fresh backup has not been created yet:

```bash
npm run db:backup -- --label pre-migration
```

Verify the backup and restore drill:

```bash
npm run db:backup:verify -- --manifest /var/backups/pharmsita/postgres/<backup>.manifest.json
npm run db:restore:drill -- --manifest /var/backups/pharmsita/postgres/<backup>.manifest.json --confirm-restore-drill
npm run db:migrate:gate -- --manifest /var/backups/pharmsita/postgres/<backup>.manifest.json --require-restore-drill
```

GO condition:

- backup exists;
- backup verify passes;
- restore drill passes;
- migration gate passes.

BLOCKED condition:

- no backup manifest;
- restore drill was skipped;
- migration gate fails.

### 6. Migration Dry Run and Apply

```bash
npm run db:migrate:status
npm run db:migrate -- --dry-run
npm run db:migrate
npm run db:migrate:status
```

GO condition:

- dry run is understood;
- migration succeeds;
- final migration status is clean.

BLOCKED condition:

- pending migration is unexpected;
- migration fails;
- database state differs from the intended PharmSITA schema.

### 7. Cutover Drill Before Symlink

```bash
npm run release:cutover:drill -- \
  --release-archive ../pharmsita-task185-f680dfd.tar.gz \
  --artifact-checksums ../artifact-checksums.sha256 \
  --work-dir /tmp/pharmsita-cutover-drill \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --require-db-gate \
  --require-restore-drill \
  --api-base-url "$API_BASE_URL" \
  --frontend-url "$FRONTEND_URL" \
  --force
```

GO condition:

- `CUTOVER-DRILL.md` has no FAIL gate;
- WARN items are accepted by operator with reason.

BLOCKED condition:

- any FAIL gate exists;
- operator cannot explain a WARN item.

### 8. Switch Current Symlink and Restart

Only run this after all previous gates pass.

```bash
sudo ln -sfn /var/www/pharmsita/releases/pharmsita-task185-f680dfd /var/www/pharmsita/current
sudo nginx -t
sudo systemctl restart pharmsita-backend
sudo systemctl status pharmsita-backend --no-pager
```

GO condition:

- symlink points to `pharmsita-task185-f680dfd`;
- Nginx config is valid;
- backend service is active.

BLOCKED condition:

- Nginx config fails;
- backend service fails to start;
- logs show missing env or database connection errors.

### 9. Live Evidence Run

Run from the active release:

```bash
cd /var/www/pharmsita/current

npm run release:production-evidence:run -- \
  --release-id pharmsita-task185-f680dfd \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/pharmsita-task185-f680dfd.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --api-base-url "$API_BASE_URL" \
  --frontend-url "$FRONTEND_URL" \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --execute \
  --force
```

For real production, do not use:

- `--skip-system`
- `--skip-network`
- `--skip-db`
- `--allow-incomplete`

GO condition:

- production evidence run returns `SIGNED-OFF`;
- evidence folder contains GO/NO-GO, operator review, and sign-off packet.

BLOCKED condition:

- final status is `SIGN-OFF-BLOCKED`;
- health, readiness, HTTPS, database, or sign-off evidence is incomplete.

## Evidence to Return

After execution, operator sends these files/folders back for review:

```text
releases/production-evidence-run/REAL-VPS-EVIDENCE-RUN.md
releases/production-evidence-run/real-vps-evidence-run-result.json
releases/production-evidence-run/evidence/
releases/production-evidence-run/review/
releases/production-evidence-run/signoff/
releases/production-evidence-run/remediation/   # if created
```

Also send:

```text
/tmp/pharmsita-cutover-drill/CUTOVER-DRILL.md
/tmp/pharmsita-cutover-drill/cutover-drill-report.json
```

## Final Decision Rule

| Decision | Requirement |
| --- | --- |
| GO | artifact checksum PASS, backup/restore gate PASS, migration PASS, service active, HTTPS/API smoke PASS, and sign-off `SIGNED-OFF`. |
| BLOCKED | any checksum, backup, restore drill, migration, service, health, HTTPS, smoke, evidence, or sign-off gate fails. |
| REVIEW REQUIRED | only WARN items remain and operator/reviewer must explicitly accept the risk before traffic is opened. |

## Rollback Reminder

If cutover fails after symlink switch:

1. point `/var/www/pharmsita/current` back to the previous known-good release;
2. restart `pharmsita-backend`;
3. run `sudo nginx -t`;
4. verify logs and health;
5. do not restore database unless there is a confirmed migration/data issue and the operator approves restore from the pre-migration backup.
