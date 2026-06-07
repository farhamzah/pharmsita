# VPS Production Sign-Off Packet

Dokumen ini dipakai setelah real VPS evidence sudah direview. Tujuannya membuat satu paket final yang bisa dilampirkan ke catatan release production.

## Kapan Dipakai

Jalankan command ini hanya setelah:

- `release:live-evidence:capture` menghasilkan `GO-NO-GO.md` dan `evidence-manifest.json`
- `release:go-no-go:remediate` dijalankan jika evidence bukan `GO`
- `release:operator-evidence:review` menghasilkan `OPERATOR-EVIDENCE-REVIEW.md` dan `operator-evidence-review.json`
- reviewer menyatakan evidence `APPROVED`

## Command Production

Di VPS atau mesin review yang punya folder evidence lengkap:

```bash
npm run release:production-signoff:packet -- \
  --evidence-dir /tmp/pharmsita-live-evidence \
  --review-dir /tmp/pharmsita-review \
  --remediation-dir /tmp/pharmsita-remediation \
  --output-dir /tmp/pharmsita-production-signoff \
  --release-id <release-id> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --require-approved \
  --force
```

Jika review output disimpan di folder evidence yang sama, `--review-dir` boleh diarahkan ke folder evidence:

```bash
npm run release:production-signoff:packet -- \
  --evidence-dir /tmp/pharmsita-live-evidence \
  --review-dir /tmp/pharmsita-live-evidence \
  --remediation-dir /tmp/pharmsita-remediation \
  --release-id <release-id> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --require-approved \
  --force
```

## Intake Awal atau Evidence Belum Lengkap

Untuk latihan lokal atau intake output operator yang masih belum `GO`, gunakan `--allow-blocked`. Command tetap membuat packet, tetapi decision akan tetap `SIGN-OFF-BLOCKED`.

```bash
npm run release:production-signoff:packet -- \
  --evidence-dir releases/live-evidence-task110-db \
  --review-dir releases/operator-review-task111-db \
  --remediation-dir releases/remediation-task110-db \
  --output-dir releases/production-signoff-task112-local \
  --operator Codex \
  --reviewer Codex \
  --signer Codex \
  --allow-blocked \
  --force
```

## Output

| File | Fungsi |
|---|---|
| `PRODUCTION-SIGNOFF.md` | Ringkasan keputusan final, checks, dan daftar source file |
| `production-signoff-packet.json` | Packet machine-readable untuk arsip/review lanjutan |
| `production-signoff-checksums.sha256` | SHA-256 source evidence, review, remediation, dan packet output |

## Decision

| Decision | Arti |
|---|---|
| `SIGNED-OFF` | Evidence `GO`, operator review `APPROVED`, tidak ada failed/warning check, dan signer tersedia. |
| `SIGN-OFF-WITH-REVIEW` | Tidak ada failed check, tetapi masih ada warning atau identitas signer/reviewer/operator belum lengkap. |
| `SIGN-OFF-BLOCKED` | Evidence/review/remediation belum aman untuk produksi penuh. Jangan buka traffic production. |

## Arsip Release

Simpan file berikut sebagai lampiran release:

- `GO-NO-GO.md`
- `evidence-manifest.json`
- raw evidence files yang tercatat di manifest
- `REMEDIATION.md` dan `remediation-plan.json` bila evidence bukan `GO`
- `OPERATOR-EVIDENCE-REVIEW.md`
- `operator-evidence-review.json`
- `PRODUCTION-SIGNOFF.md`
- `production-signoff-packet.json`
- `production-signoff-checksums.sha256`

## Rule Aman

- `--require-approved` wajib untuk production asli.
- Jangan sign-off jika decision bukan `SIGNED-OFF`.
- Jika packet menghasilkan `SIGN-OFF-BLOCKED`, ulangi evidence capture di VPS/domain asli tanpa skip flag.
- Jangan menaruh `.env`, password database, token, atau output command yang berisi secret di folder evidence.
