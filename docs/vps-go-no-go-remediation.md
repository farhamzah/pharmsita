# VPS Go/No-Go Remediation

Dokumen ini dipakai setelah `release:live-evidence:capture` menghasilkan `GO-NO-GO.md` dan `evidence-manifest.json`.

## Tujuan

Remediation planner membaca gate yang `FAIL`, `WARN`, atau `SKIP`, lalu membuat:

- `REMEDIATION.md`
- `remediation-plan.json`
- severity per temuan
- tindakan per kategori: artifact, symlink, Nginx, systemd, database, readiness, HTTPS, frontend, dan smoke test

## Local Remediation QA

Gunakan evidence lokal/incomplete untuk memastikan parser berjalan:

```powershell
npm.cmd run release:go-no-go:remediate -- --evidence-dir releases\live-evidence-task109-db --operator Codex --force
```

## VPS Remediation Command

Jika evidence di VPS menghasilkan `NO-GO`, `INCOMPLETE`, atau `GO WITH REVIEW`:

```bash
cd /var/www/pharmsita/current
npm run release:go-no-go:remediate -- \
  --evidence-dir /tmp/pharmsita-live-evidence \
  --output-dir /tmp/pharmsita-remediation \
  --operator "<nama-operator>" \
  --notes "Remediation after real VPS evidence run" \
  --force
```

Atau langsung dengan manifest:

```bash
npm run release:go-no-go:remediate -- \
  --manifest /tmp/pharmsita-live-evidence/evidence-manifest.json \
  --output-dir /tmp/pharmsita-remediation \
  --operator "<nama-operator>" \
  --force
```

## Severity

| Severity | Arti |
|---|---|
| Extra High | Blocker cutover. Jangan buka traffic user. |
| High | Butuh sign-off atau fix sebelum production penuh. |
| Medium | Review operasional, biasanya bukan blocker jika semua gate wajib PASS. |

## Kategori Remediation

| Kategori | Contoh temuan |
|---|---|
| Artifact Integrity | archive/checksum hilang atau mismatch |
| Release Activation | symlink `current` salah |
| Nginx | `nginx -t` gagal atau proxy/root salah |
| Systemd/Backend Service | backend tidak active/running |
| Database Safety | backup gate atau restore drill belum PASS |
| Readiness | `/health/ready` belum `ready` |
| HTTPS/Domain | domain/TLS/API health gagal |
| Frontend/Nginx Root | frontend root tidak 200 |
| Production Smoke | no-demo smoke gagal |

## Operator Rule

1. Jika `REMEDIATION.md` punya item `Extra High`, stop cutover atau rollback.
2. Selesaikan action item sesuai kategori.
3. Jalankan ulang `release:live-evidence:capture` tanpa skip flags.
4. Jalankan ulang `release:go-no-go:remediate` jika decision belum `GO`.
5. Simpan `GO-NO-GO.md`, `evidence-manifest.json`, `REMEDIATION.md`, dan `remediation-plan.json` sebagai lampiran release.

## Review Setelah Remediation

Setelah item selesai dan evidence sudah dicapture ulang:

```bash
npm run release:operator-evidence:review -- --evidence-dir /tmp/pharmsita-live-evidence --remediation-dir /tmp/pharmsita-remediation --reviewer "<nama-reviewer>" --operator "<nama-operator>" --require-go --force
```

Jika review masih `BLOCKED`, ulangi remediation dan evidence capture.
