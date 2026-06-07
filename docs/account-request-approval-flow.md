# Standalone Account Approval Flow

Status: Task 88 Revisi. PharmSITA tidak lagi bergantung pada aplikasi Core untuk provisioning akun.

Dokumen ini menjelaskan alur akun internal PharmSITA setelah keputusan decouple. Jika ada permohonan akun di sistem lain, proses itu dianggap berada di luar boundary PharmSITA sampai ada task integrasi resmi.

## Prinsip

- PharmSITA menyimpan user, role, status, password hash, dan first-login state miliknya sendiri.
- Admin PharmSITA membuat atau memperbarui user lewat menu admin/user management PharmSITA.
- Password awal diberikan oleh admin melalui jalur resmi di luar sistem.
- User wajib mengganti password saat login pertama jika `forceChangeOnLogin=true`.
- Core, access registry eksternal, dan app access eksternal tidak menjadi dependency runtime PharmSITA saat ini.

## Alur Admin

1. Admin menerima permintaan pembuatan akun melalui proses operasional yang berlaku.
2. Admin membuka user management PharmSITA.
3. Admin membuat user dengan identifier, nama, email, role, status, dan password awal.
4. Backend menyimpan password sebagai hash, bukan plain text.
5. Backend menandai user baru atau reset password dengan:
   - `passwordStatus = needs_activation`
   - `forceChangeOnLogin = true`
   - `firstLoginCompletedAt = null`
6. Admin menginformasikan identifier dan password awal ke user melalui jalur resmi.

## Alur User

1. User login ke PharmSITA memakai identifier dan password awal.
2. Backend mengembalikan first-login challenge, bukan session normal.
3. User mengganti password.
4. Backend mengaktifkan akun login:
   - `passwordStatus = active`
   - `forceChangeOnLogin = false`
   - `firstLoginCompletedAt = now`
   - `passwordChangedAt = now`
5. Frontend mengarahkan user ke halaman profil sesuai role untuk melengkapi biodata.

## Status yang Dipakai

| Objek | Status | Makna |
|---|---|---|
| User | `Aktif` | Akun bisa login. |
| User | `Nonaktif` | Akun tidak bisa login. |
| User password | `needs_activation` | User wajib mengganti password saat login pertama. |
| User password | `active` | Password sudah aktif. |
| User password | `reset_requested` | Password perlu direset atau diaktifkan ulang. |

## Di Luar Scope Saat Ini

- Tidak ada endpoint provisioning dari Core ke PharmSITA.
- Tidak ada secret provisioning lintas aplikasi.
- Tidak ada sinkronisasi app access Core ke PharmSITA.
- Tidak ada shared database antara PharmSITA dan Core.
- Tidak ada live smoke test Core ke PharmSITA.

Rencana boundary detail ada di `docs/decoupled-core-pharmsita-boundary-plan.md`.
