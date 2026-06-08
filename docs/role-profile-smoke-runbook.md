# Role Profile Smoke Runbook

Dokumen ini menjelaskan QA gate untuk memastikan edit profil lintas role tetap aman sebelum release atau setelah deploy staging/VPS.

## Tujuan

Smoke test ini menguji workflow profil untuk role:

- Mahasiswa
- Dosen
- Koordinator
- Admin

Scope yang diverifikasi:

- API liveness dan readiness.
- Fixture akun QA khusus role tersedia dan aktif.
- Login UI per role berhasil.
- Halaman profil role terbuka.
- Tombol edit menunggu loading profile selesai.
- Form edit tidak tertutup oleh refresh session async.
- Save nomor HP dan alamat berhasil.
- Reload halaman tetap menampilkan data baru.
- API `/auth/profile` mengembalikan data yang sama.

## Command Lokal

Prasyarat:

- Backend berjalan di `http://127.0.0.1:4000/api/v1`.
- Frontend berjalan di `http://127.0.0.1:5173`.
- Admin lokal aktif. Default lokal yang dipakai script: `admin` / `AdminLocal115!`.

Jalankan:

```powershell
npm.cmd run ui:qa:role-profile
```

Output sukses menampilkan 13 check `PASS` dan path report JSON, misalnya:

```text
Role profile smoke passed: 13 checks.
Report: C:\Users\<user>\AppData\Local\Temp\pharmsita-role-profile-smoke-report.json
```

## Fixture QA

Script membuat atau mereset akun QA berikut:

| Identifier | Role | Password aktif setelah setup |
|---|---|---|
| `qa119-mahasiswa` | Mahasiswa | `Qa119Pass!` |
| `qa119-dosen` | Dosen | `Qa119Pass!` |
| `qa119-koordinator` | Koordinator | `Qa119Pass!` |

Password sementara fixture adalah `Qa119Temp!` dan langsung diselesaikan melalui first-login flow oleh script.

Admin tidak dibuat oleh script. Admin dipakai hanya untuk setup fixture melalui Admin API.

## Environment Override

Gunakan env berikut bila target bukan default lokal:

| Env | Default | Keterangan |
|---|---|---|
| `ROLE_PROFILE_QA_API_BASE_URL` | `http://127.0.0.1:4000/api/v1` | Base URL API |
| `ROLE_PROFILE_QA_FRONTEND_URL` | `http://127.0.0.1:5173` | URL frontend |
| `ROLE_PROFILE_QA_ADMIN_IDENTIFIER` | `admin` | Identifier admin fixture setup |
| `ROLE_PROFILE_QA_ADMIN_PASSWORD` | `AdminLocal115!` untuk localhost saja | Wajib diset untuk target non-localhost |
| `ROLE_PROFILE_QA_TEMP_PASSWORD` | `Qa119Temp!` | Password sementara akun QA |
| `ROLE_PROFILE_QA_ACTIVE_PASSWORD` | `Qa119Pass!` | Password aktif akun QA |
| `ROLE_PROFILE_QA_REPORT_PATH` | OS temp path | Lokasi report JSON |
| `ROLE_PROFILE_QA_BROWSER_DIR` | OS temp path | Browser profile sementara |
| `ROLE_PROFILE_QA_CDP_PORT` | random 9500-9899 | Port Chrome/Edge DevTools |
| `CHROME_PATH` | auto-detect | Path Chrome/Edge bila auto-detect gagal |

Untuk staging/VPS, jangan memakai default password admin lokal:

```bash
ROLE_PROFILE_QA_API_BASE_URL="https://staging-pharmsita.example.ac.id/api/v1" \
ROLE_PROFILE_QA_FRONTEND_URL="https://staging-pharmsita.example.ac.id" \
ROLE_PROFILE_QA_ADMIN_IDENTIFIER="pharmsita-smoke-admin" \
ROLE_PROFILE_QA_ADMIN_PASSWORD="<password-smoke-admin>" \
npm run ui:qa:role-profile
```

Script akan menolak target non-localhost jika `ROLE_PROFILE_QA_ADMIN_PASSWORD` tidak diset eksplisit.

## Pre-Release Gate

Jalankan gate ini setelah:

1. `npm.cmd run build`
2. `npm.cmd run backend:build`
3. migration PostgreSQL selesai
4. backend dan frontend target sudah berjalan

Gate dianggap `PASS` bila:

- semua check table berstatus `PASS`
- report JSON tersimpan
- tidak ada akun operasional harian yang dipakai sebagai fixture selain admin/smoke admin yang memang disiapkan

Gate dianggap `FAIL` bila:

- salah satu role tidak bisa login
- tombol edit tidak pernah siap
- form edit tertutup sebelum save
- save/reload tidak menampilkan data baru
- API `/auth/profile` tidak match dengan UI

Jika `FAIL`, jangan lanjutkan cutover sampai penyebabnya diperbaiki dan command ini `PASS`.

## Catatan Production

Smoke test ini adalah write test karena mengubah atau membuat akun `qa119-*`. Untuk production live, gunakan hanya jika akun QA/smoke memang diizinkan oleh operator. Jika tidak, jalankan di staging atau database smoke terpisah.

Untuk production cutover penuh, role profile smoke melengkapi gate lain, bukan menggantikan:

- `smoke:production:no-demo --preflight-only`
- `release:cutover:drill`
- `release:live-cutover:qa`
- backup gate dan restore drill
