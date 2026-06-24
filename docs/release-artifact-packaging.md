# Release Artifact Packaging

Dokumen ini menjelaskan cara membuat paket release PharmSITA untuk VPS.

## Tujuan

Release package menjaga deployment lebih disiplin:

- Artifact frontend/backend berasal dari build yang sudah diuji.
- File secret seperti `.env`, `backend/.data`, dan `node_modules` tidak ikut dipaketkan.
- Setiap file payload punya checksum SHA-256.
- Archive release dan rollback bundle punya checksum terpisah.
- Operator punya instruksi install dan rollback di dalam bundle.

## Pre-Release Build

Dari root project:

```powershell
npm.cmd run build
npm.cmd run backend:build
npm.cmd run backend:check
npm.cmd run deploy:vps:dry-run -- --skip-network
```

## Create Release Package

```powershell
npm.cmd run release:package
```

Output default masuk ke:

```text
releases/<release-id>/
```

Isi utama:

| File | Fungsi |
|---|---|
| `<release-id>.tar.gz` | Artifact utama untuk di-upload ke VPS |
| `<release-id>-rollback.tar.gz` | Rollback notes dan metadata release |
| `manifest.json` | Metadata release, git commit, daftar file payload |
| `checksums.sha256` | Checksum seluruh file payload |
| `artifact-checksums.sha256` | Checksum archive utama dan rollback archive |
| `INSTALL.md` | Langkah install artifact |
| `ROLLBACK.md` | Langkah rollback aplikasi dan database |

Untuk release ID manual:

```powershell
npm.cmd run release:package -- --release-id pharmsita-2026.06.08-1
```

Untuk memasukkan artifact release sebelumnya ke rollback bundle:

```powershell
npm.cmd run release:package -- --previous-release releases/pharmsita-previous/pharmsita-previous.tar.gz
```

Jika output release ID yang sama sudah ada:

```powershell
npm.cmd run release:package -- --release-id pharmsita-2026.06.08-1 --force
```

## Payload

Artifact utama membawa:

- `dist/`
- `backend/dist/`
- `backend/database/migrations/`
- production tools untuk migration, bootstrap admin, no-demo smoke, role profile smoke, VPS dry-run, release cutover drill, live cutover QA, live evidence capture, Go/No-Go remediation, operator evidence review, dan audit cleanup
- production tools untuk database backup, restore drill, dan pre-migration safety gate
- `deploy/vps/`
- production runbooks, readiness gap review, evidence matrix, environment finalization packet, operator production access intake/smoke plan, production domain/API/session intake packet, production browser smoke execution packet, production browser smoke evidence reviewer packet, production smoke closure/remediation packet, production smoke actual evidence/remediation task packet, production access input collection/first browser smoke run packet, production first browser smoke attempt packet, production URL/API/manual login re-attempt handoff, production browser smoke re-attempt record, production evidence review GO/BLOCKED decision, production smoke remediation finding record, final production evidence closure/sign-off packet, production evidence actual submission/sign-off execution record, production evidence input intake/remediation output record, production evidence attachment review/final approval routing record, production final approval/specific remediation record, production attachment submission/final signer capture record, pre-push change audit/file inclusion review, build/smoke verification before commit, local PostgreSQL verification reports, local release evidence packet, detail source alignment, canonical schema boundary migration, canonical registration write path, canonical guidance write path, canonical stage/exam/revision write path, canonical read model migration, canonical progress advancement write path, canonical reporting API endpoint, coordinator lifecycle summary UI integration, coordinator lifecycle drilldown student directory, coordinator student directory stage filter API, coordinator student directory pagination/search API, coordinator student directory UI QA, coordinator student directory page size multi-page QA, coordinator student directory sorting contract, coordinator student directory sorting UI QA, coordinator student directory URL state sync, coordinator student directory deep link regression QA, coordinator student directory share link UX, coordinator student directory clipboard success QA, coordinator student directory share link production HTTPS smoke checklist, coordinator student directory production HTTPS smoke sign-off, coordinator student directory production HTTPS evidence review, coordinator student directory production evidence attachment intake, dan coordinator student directory production evidence review decision
- `package.json` dan `package-lock.json`
- env example production

Artifact utama tidak membawa:

- `.env` dan `.env.*` secret lokal
- `backend/.data`
- `node_modules`
- `backend/database/seeds`

## VPS Verification

Setelah upload:

```bash
sha256sum -c artifact-checksums.sha256
tar -tzf <release-id>.tar.gz | head
```

Setelah extract:

```bash
sha256sum -c checksums.sha256
npm ci --omit=dev
npm run backend:check-production-env
npm run release:cutover:drill -- --release-archive ../<release-id>.tar.gz --artifact-checksums ../artifact-checksums.sha256 --work-dir /tmp/pharmsita-cutover-drill --skip-network --skip-db --force
npm run db:migrate:status
npm run ui:qa:role-profile
npm run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1
npm run release:live-cutover:qa -- --release-dir . --release-archive ../<release-id>.tar.gz --artifact-checksums ../artifact-checksums.sha256 --skip-system --skip-network --skip-db --force
npm run release:live-evidence:capture -- --release-dir . --release-archive ../<release-id>.tar.gz --artifact-checksums ../artifact-checksums.sha256 --skip-system --skip-network --skip-db --allow-incomplete --force
npm run release:go-no-go:remediate -- --evidence-dir releases/live-evidence --force
npm run release:operator-evidence:review -- --evidence-dir releases/live-evidence --remediation-dir releases/live-evidence --allow-incomplete --force
npm run release:production-signoff:packet -- --evidence-dir releases/live-evidence --review-dir releases/live-evidence --remediation-dir releases/live-evidence --allow-blocked --force
npm run release:production-evidence:run -- --release-id <release-id> --skip-system --skip-network --skip-db --allow-incomplete --force
npm run release:production-evidence:upload-review -- --upload-dir releases/production-evidence-run --release-id <release-id> --allow-blocked --force
```

Archive utama diekstrak dengan struktur runtime langsung di root release:

```text
<release-id>/
  dist/
  backend/dist/
  backend/database/migrations/
  deploy/vps/
  tools/
  manifest.json
  checksums.sha256
```

## Rollback Boundary

Rollback aplikasi dilakukan dengan memindahkan symlink `current` ke release sebelumnya dan restart service. Rollback database hanya memakai backup `pg_dump` yang dibuat sebelum migration dan harus disetujui operator.
