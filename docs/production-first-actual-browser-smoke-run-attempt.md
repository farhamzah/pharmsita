# Execute First Actual Browser Smoke Run Setelah Domain dan Session Koordinator Siap

Tanggal: 2026-06-24
Task: 163
Prioritas: High
Status: BLOCKED INPUT

## Tujuan

Dokumen ini mencatat attempt pertama untuk menjalankan browser smoke production role koordinator.

Scope tetap PharmSITA standalone. Jangan memakai domain, akun, cookie, token, database, atau artifact dari Core/Farmasi UBP workspace.

## Browser Check

Browser in-app berhasil diperiksa.

Selected tab saat attempt:

```text
URL: http://localhost:5173/?qa=149copy2#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc
Title: PharmSITA
```

Finding:

- Browser masih berada di localhost.
- Belum ada frontend production URL HTTPS.
- Belum ada API production base URL.
- Belum ada session koordinator production.

Karena itu, smoke production tidak dijalankan. Menjalankan test pada localhost tidak memenuhi scope Task 163.

## Required Input Before Re-Attempt

```text
Frontend URL:
API base URL:
Koordinator session: ready
Sample search keyword:
Permission screenshot sanitized: yes
```

## Execution Decision

Decision: `BLOCKED INPUT`

Reason:

Production smoke hanya boleh dijalankan pada domain HTTPS production dengan session koordinator aktif. Tab yang tersedia saat attempt masih localhost.

## Re-Attempt Steps

Setelah input tersedia:

1. Operator membuka frontend production HTTPS.
2. Operator login manual sebagai koordinator.
3. Konfirmasi session sudah aktif.
4. Jalankan deep link:

```text
https://<domain-asli>/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=<sample-search>&limit=2&sortBy=nim&sortDir=desc
```

5. Verifikasi:

- HTTPS valid;
- route monitoring terbuka;
- search/stage/page size/sorting restored;
- tombol `Salin link view` memberi feedback `Link tersalin`;
- clipboard berisi canonical URL production;
- shared URL reopened;
- Back/Forward state sync;
- evidence sanitized.

## Current Result

```text
Task: 163
Executed at: 2026-06-24
Browser URL: localhost
Production URL: Missing
Koordinator production session: Missing
Decision: BLOCKED INPUT
Reason: Production domain/session not available.
```

## Report Task 163

Task 163 sudah dicoba sebagai operator browser, tetapi tidak dieksekusi sebagai production smoke karena browser aktif masih localhost dan input production belum tersedia.

## Task Berikutnya

Task 164: Provide Production URL/API dan Manual Koordinator Login untuk Re-Attempt Smoke.

Prioritas: High

Reason: blocker saat ini bukan kode, melainkan input production. Setelah domain/API/session tersedia, smoke production bisa dijalankan ulang dan evidence aktual bisa diisi.

## Task 164 Handoff

Form handoff URL/API dan manual login tersedia di:

```text
docs/production-url-api-manual-login-reattempt-handoff.md
```

Gunakan dokumen itu sebelum re-attempt smoke production.
