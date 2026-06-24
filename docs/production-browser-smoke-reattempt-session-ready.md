# Re-Attempt Production Browser Smoke dengan Session Koordinator Ready

Tanggal: 2026-06-24
Task: 165
Prioritas: High
Status: BLOCKED - SESSION NOT READY

## Tujuan

Dokumen ini mencatat re-attempt production browser smoke untuk role koordinator setelah Task 164 meminta frontend URL, API base URL, dan manual login session.

Scope tetap PharmSITA standalone. Jangan memakai domain, akun, cookie, token, database, atau artifact dari Core/Farmasi UBP workspace.

## Re-Attempt Result

Re-attempt tidak dieksekusi sebagai production smoke.

Browser aktif saat dicek:

```text
URL: http://localhost:5173/?qa=149copy2#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc
Title: PharmSITA
```

Finding:

- Browser masih berada di localhost.
- Frontend production URL belum tersedia.
- API production base URL belum tersedia.
- Session koordinator production belum ready.

## Decision

Decision: `BLOCKED - SESSION NOT READY`

Reason:

Task 165 mensyaratkan domain production HTTPS dan session koordinator siap. Kondisi itu belum terpenuhi, sehingga smoke production tidak boleh diklaim berjalan.

## Required Input untuk Re-Attempt Berikutnya

```text
Frontend production URL:
API production base URL:
Koordinator session: ready
Sample search keyword:
Permission screenshot sanitized: yes
```

## Next Valid Execution

Setelah input tersedia, jalankan:

```text
https://<domain-asli>/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=<sample-search>&limit=2&sortBy=nim&sortDir=desc
```

Expected checks:

- HTTPS valid;
- session role koordinator aktif;
- monitoring deep link terbuka;
- search, stage, page size, dan sorting restored;
- tombol `Salin link view` menampilkan `Link tersalin`;
- clipboard berisi canonical production URL;
- shared URL reopened;
- Back/Forward state sync;
- evidence sanitized.

## Report Task 165

Task 165 sudah dicoba sebagai re-attempt browser, tetapi statusnya tetap blocked karena session koordinator production belum ready dan browser masih localhost.

## Task Berikutnya

Task 166: Production Evidence Review dan GO/BLOCKED Decision.

Prioritas: High

Reason: task ini hanya bisa berjalan setelah Task 165 benar-benar menghasilkan evidence production. Jika belum ada evidence, Task 166 akan otomatis `PENDING EVIDENCE`.

## Task 166 Decision Record

Dokumen review decision tersedia di:

```text
docs/production-evidence-review-go-blocked-decision.md
```

Status awal: `PENDING EVIDENCE`, karena re-attempt Task 165 belum menghasilkan evidence production.
