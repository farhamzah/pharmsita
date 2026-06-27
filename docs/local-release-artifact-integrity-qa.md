# Local Release Artifact Integrity QA

Task: 184
Release ID: pharmsita-task183-5d72081
Source commit: 5d7208104ee938b7db3185806c6221f44ba2c295
Date: 2026-06-27
Status: PASS WITH OPERATOR NOTE

## Scope

This QA verifies the local release artifact produced after the Task 178-181 push baseline.
The check covers artifact existence, SHA256 integrity, archive readability, required payload
entries, rollback content, and install/rollback checklist readiness.

## Artifact Files

| File | Status | Note |
| --- | --- | --- |
| releases/pharmsita-task183-5d72081/pharmsita-task183-5d72081.tar.gz | PASS | Archive exists and can be listed by tar. |
| releases/pharmsita-task183-5d72081/pharmsita-task183-5d72081-rollback.tar.gz | PASS | Rollback archive exists and can be listed by tar. |
| releases/pharmsita-task183-5d72081/artifact-checksums.sha256 | PASS | Contains hashes for release and rollback archives. |
| releases/pharmsita-task183-5d72081/manifest.json | PASS | Points to commit 5d7208104ee938b7db3185806c6221f44ba2c295 with dirty=false. |
| releases/pharmsita-task183-5d72081/INSTALL.md | PASS | Contains production install, migration, Nginx/systemd, and evidence commands. |
| releases/pharmsita-task183-5d72081/ROLLBACK.md | PASS | Contains app rollback and database rollback guidance. |

## SHA256 Verification

Expected and actual hashes match:

| Artifact | SHA256 |
| --- | --- |
| pharmsita-task183-5d72081.tar.gz | cd39c01a3e4a447b1a20c761d061f091e56ff0302f1f008ab760f24e33a2cf27 |
| pharmsita-task183-5d72081-rollback.tar.gz | 3fc914add39caf812094687e5be80cd91ecdaa6287bf58b54260ecbb58ac8319 |

## Archive Structure QA

| Check | Result |
| --- | --- |
| Main archive entry count | 316 |
| Rollback archive entry count | 5 |
| Main archive includes frontend `dist/index.html` | PASS |
| Main archive includes backend `backend/dist/server.js` | PASS |
| Main archive includes PostgreSQL migrations through `010_canonical_read_models.sql` | PASS |
| Main archive includes VPS Nginx template | PASS |
| Main archive includes VPS systemd template | PASS |
| Main archive includes migration and production evidence tools | PASS |
| Main archive includes Task 181 browser QA document | PASS |
| Main archive includes `INSTALL.md`, `ROLLBACK.md`, `manifest.json`, and `checksums.sha256` | PASS |
| Rollback archive includes current release manifest and checksums | PASS |
| Rollback archive includes previous release required marker | PASS |

## Install Checklist Review

`INSTALL.md` is sufficient for a controlled VPS rehearsal because it includes:

- dependency install guidance with `npm ci --omit=dev`;
- production environment guard with `backend:check-production-env`;
- database migration status, dry-run, and execution order;
- release cutover drill before symlink switch;
- Nginx config validation and backend service restart;
- live cutover QA, live evidence capture, operator review, and sign-off commands;
- clear note that secrets, `node_modules`, local JSON data, and demo seed data are excluded.

## Rollback Checklist Review

`ROLLBACK.md` is sufficient for local artifact readiness because it includes:

- symlink rollback to the previous release;
- backend service restart and Nginx validation;
- post-rollback VPS dry-run;
- log review locations;
- database rollback guidance using pre-migration `pg_dump`;
- explicit warning not to run demo seed as production rollback.

## Operator Note

The rollback archive does not include a previous release bundle. This is expected for this local
artifact because no previous release artifact was provided to `release:package`.

Before production cutover, the VPS operator must keep the last known good release available on the
server and verify the pre-migration database backup/restore drill.

## Decision

Local release artifact integrity is PASS.

Production cutover remains gated by real VPS evidence, production secrets, backup manifest,
restore drill, and final sign-off evidence.
