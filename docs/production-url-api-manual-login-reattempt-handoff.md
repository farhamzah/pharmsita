# Provide Production URL/API dan Manual Koordinator Login untuk Re-Attempt Smoke

Tanggal: 2026-06-24
Task: 164
Prioritas: High
Status: WAITING FOR USER/OPERATOR INPUT

## Tujuan

Dokumen ini menjadi handoff form agar operator/user dapat menyediakan URL production, API base URL, dan session koordinator yang aman sebelum smoke production diulang.

Scope tetap PharmSITA standalone. Jangan memakai domain, akun, token, cookie, database, atau artifact dari Core/Farmasi UBP workspace.

## Background

Task 163 sudah mencoba mengecek browser. Hasilnya `BLOCKED INPUT` karena tab aktif masih:

```text
http://localhost:5173/?qa=149copy2#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc
```

Production smoke tidak boleh dijalankan dari localhost.

## Input yang Harus Disediakan

Isi form ini sebelum re-attempt:

```text
Frontend production URL:
API production base URL:
Koordinator session: ready / not ready
Sample search keyword:
Operator:
Reviewer:
Release ID:
Permission screenshot sanitized: yes / no
```

## Format Wajib

Frontend production URL:

```text
https://<domain-asli>
```

API production base URL:

```text
https://<domain-asli>/api/v1
```

Sample search keyword:

```text
<nama-atau-nim-mahasiswa-yang-aman-untuk-evidence>
```

## Manual Login Step

1. Buka browser normal.
2. Buka frontend production URL.
3. Login manual sebagai role koordinator.
4. Pastikan dashboard/halaman koordinator terbuka.
5. Jangan kirim password, token, cookie, atau localStorage.
6. Beri tahu: `Koordinator session ready`.

Jika perlu akun QA, gunakan akun sementara dengan hak minimal dan rotasi password setelah test.

## Ready-to-Run Gate

| Gate | Required | Status |
|---|---|---|
| Frontend URL HTTPS production | Yes | Missing |
| API base URL HTTPS production | Yes | Missing |
| Browser session koordinator ready | Yes | Missing |
| Sample search keyword tersedia | Yes | Missing |
| Screenshot sanitized diizinkan | Yes | Missing |

Decision: `WAITING FOR INPUT`

## Re-Attempt Command for Browser Smoke

Setelah semua gate ready, gunakan deep link:

```text
https://<domain-asli>/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=<sample-search>&limit=2&sortBy=nim&sortDir=desc
```

Expected checks:

- HTTPS valid;
- role koordinator aktif;
- route monitoring terbuka;
- search, stage, page size, sorting restored;
- `Salin link view` menampilkan `Link tersalin`;
- clipboard berisi canonical production URL;
- shared URL reopened;
- Back/Forward sync;
- evidence sanitized.

## Security Notes

Jangan kirim:

- password;
- OTP;
- access token/refresh token;
- cookie;
- localStorage;
- `DATABASE_URL`;
- `AUTH_SECRET`;
- SSH key.

Kirim cukup:

- URL frontend;
- URL API;
- konfirmasi session ready;
- sample search keyword;
- izin screenshot sanitized.

## Report Task 164

Task 164 menetapkan handoff input dan manual login flow untuk re-attempt smoke production. Status saat dibuat adalah `WAITING FOR USER/OPERATOR INPUT`.

## Task Berikutnya

Task 165: Re-Attempt Production Browser Smoke dengan Session Koordinator Ready.

Prioritas: High

Reason: setelah input Task 164 lengkap, smoke production bisa benar-benar dijalankan dan evidence aktual dapat dicatat.

## Task 165 Re-Attempt Record

Dokumen re-attempt tersedia di:

```text
docs/production-browser-smoke-reattempt-session-ready.md
```

Hasil saat dibuat: `BLOCKED - SESSION NOT READY`, karena browser masih localhost dan input production belum tersedia.
