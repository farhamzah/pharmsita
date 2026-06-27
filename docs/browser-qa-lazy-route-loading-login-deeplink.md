# Browser QA untuk Lazy Route Loading, Login Redirect, dan Deep Link

Tanggal: 2026-06-27
Task: 181
Prioritas: High
Status: PASS

## Tujuan

Task ini memverifikasi perubahan route-level code splitting dari Task 180 di browser lokal. Fokus QA adalah memastikan lazy route loading tidak merusak login redirect, protected route, hash deep link, dan dynamic route matcher.

## Environment

Target:

- `http://127.0.0.1:5173`

Mode:

- Vite dev server lokal
- Browser in-app
- Mock auth local

User QA:

- Identifier: `kordinator`
- Password: non-empty demo password
- Role: `kordinator`

## Test Matrix

| Area | Scenario | Result |
| --- | --- | --- |
| Login page | Direct open `#/login` | PASS |
| Login redirect | Login as `kordinator` redirects to `#/kordinator` | PASS |
| Lazy route fallback | `Memuat halaman...` appears briefly while coordinator route loads | PASS |
| Coordinator dashboard | Dashboard content renders after lazy chunk load | PASS |
| Deep link | Open `#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc` | PASS |
| URL state | Stage filter, search, page size, sorting URL preserved | PASS |
| Filtered result | Monitoring shows `Sisca Kaila`, one filtered row, page size 2 | PASS |
| Dynamic route | Open `#/kordinator/monitoring/detail/887766554` | PASS |
| Protected route | Logout, then open protected monitoring URL | PASS |
| Auth redirect | Protected route redirects to `#/login` when unauthenticated | PASS |
| Console errors | Browser console error logs | PASS, no errors observed |

## Evidence Notes

Observed coordinator dashboard after login:

- URL: `http://127.0.0.1:5173/#/kordinator`
- Dashboard text rendered: `Dashboard Koordinator`, lifecycle summary, monitored students.
- No console errors.

Observed monitoring deep link:

- URL preserved:
  `http://127.0.0.1:5173/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`
- Visible content included:
  - `Monitoring Mahasiswa`
  - `Seminar Proposal`
  - `Sisca Kaila`
  - `Menampilkan 1 dari 1 mahasiswa`
  - `Per halaman 2`
- No console errors.

Observed dynamic detail route:

- URL: `http://127.0.0.1:5173/#/kordinator/monitoring/detail/887766554`
- Detail page rendered.
- No console errors.

Observed protected redirect:

- After logout, direct protected route navigation redirected to:
  `http://127.0.0.1:5173/#/login`
- Login page rendered.
- No console errors.

## Result

Decision: `PASS`

Reason:

- Lazy route loading works.
- Login redirect works.
- Protected route redirect works.
- Deep link query state remains intact.
- Dynamic `:id` route matching still works.
- No browser console errors observed during tested flows.

## Task Berikutnya

Task 182: Commit dan Push Batch Task 178-181

Prioritas: High

Reason:

- Task 178-181 are complete.
- Build and browser QA passed.
- The changes should be committed and pushed as a clean optimization/QA batch.
