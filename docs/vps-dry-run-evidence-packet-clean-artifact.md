# VPS Dry-Run Evidence Packet from Clean Artifact

Task: 188
Date: 2026-06-30 Asia/Jakarta
Release ID: pharmsita-task187-de1730f
Source commit: de1730f5542439d87c3b95d65507650129f68ab5
Status: PASS - LOCAL ARTIFACT DRY-RUN

## Scope

This evidence packet verifies the clean Task 187 release artifact before it is used on a real VPS.
The dry-run checks artifact integrity, archive extraction, payload checksums, excluded secret/demo
paths, required payload paths, and operator command generation.

Network and database checks were intentionally skipped because this is a local preflight packet, not
the live VPS execution.

## Command Run

```powershell
npm.cmd run release:cutover:drill -- --release-archive releases\pharmsita-task187-de1730f\pharmsita-task187-de1730f.tar.gz --artifact-checksums releases\pharmsita-task187-de1730f\artifact-checksums.sha256 --work-dir releases\cutover-drill-task188 --skip-network --skip-db --force
```

## Outputs

| Output | Path |
| --- | --- |
| Cutover report | `releases/cutover-drill-task188/CUTOVER-DRILL.md` |
| Machine report | `releases/cutover-drill-task188/cutover-drill-report.json` |
| Extracted release root | `releases/cutover-drill-task188/extracted/pharmsita-task187-de1730f` |

The `releases/` directory is local/ignored and is not pushed to Git.

## Artifact Checksums

```text
d9c454e1ec90721cf21af3fab6d008cf2e5d429d62cf05863d0135b269ecf291  pharmsita-task187-de1730f.tar.gz
d75ff3512388690feb0463e1aff135fefa075b56689a86b6d170477ba2b9aec6  pharmsita-task187-de1730f-rollback.tar.gz
```

## Automated Result

| Check | Status | Detail |
| --- | --- | --- |
| Artifact checksum | PASS | `pharmsita-task187-de1730f.tar.gz` matched `artifact-checksums.sha256`. |
| Archive extraction | PASS | 318 tar entries extracted. |
| Excluded secret/demo paths | PASS | No secret/demo/runtime cache paths in archive. |
| Release manifest | PASS | `release=pharmsita-task187-de1730f; files=277; dirty=no`. |
| Payload checksums | PASS | 277 payload files verified. |
| Required release payload | PASS | 38 required paths present. |
| Backup gate | SKIP | Skipped intentionally with `--skip-db`. |
| VPS live dry-run | SKIP | Skipped intentionally with `--skip-network`. |
| Production no-demo smoke | SKIP | Skipped intentionally with `--skip-network`. |
| Nginx/systemd operator gate | PASS | Manual commands written to `CUTOVER-DRILL.md`. |

Summary: cutover drill passed with 0 warnings.

## Operator Command Packet

`CUTOVER-DRILL.md` generated the expected operator sequence:

1. verify `artifact-checksums.sha256`;
2. extract `pharmsita-task187-de1730f.tar.gz`;
3. install dependencies with `npm ci --omit=dev`;
4. run `backend:check-production-env`;
5. run backup, backup verification, restore drill, and migration gate;
6. run migration status, dry-run, and apply;
7. switch `/var/www/pharmsita/current`;
8. run `sudo nginx -t`;
9. restart and inspect `pharmsita-backend`;
10. run VPS dry-run, production smoke, live cutover QA, live evidence capture, operator review, sign-off packet, and upload review.

## Decision

Local artifact dry-run is PASS.

This does not approve production yet. Before live cutover, the VPS operator still must provide:

- real production domain and API URL;
- production `DATABASE_URL`;
- backup manifest;
- restore drill evidence;
- systemd/Nginx command output;
- live health/smoke/evidence output;
- final sign-off result.

## Next Gate

The next safest task is to commit this evidence and rebuild a new clean artifact so this Task 188
packet is included in the release payload.
