# Decoupled Core and PharmSITA Boundary Plan

Status: Task 88 Revisi.

## Keputusan

Core dan PharmSITA berjalan sebagai aplikasi terpisah. PharmSITA tidak punya dependency runtime ke Core, dan Core tidak perlu memanggil endpoint PharmSITA untuk membuat akun saat fase ini.

Keputusan ini dipilih agar development PharmSITA tidak terblokir oleh flow, form, status, atau deployment Core. Integrasi lintas aplikasi bisa dibuka lagi nanti sebagai fase tersendiri setelah masing-masing aplikasi stabil.

## Boundary Saat Ini

| Area | Pemilik | Catatan |
|---|---|---|
| Auth PharmSITA | PharmSITA | User, role, password hash, refresh token, first-login state. |
| Workflow TA | PharmSITA | Pendaftaran TA, bimbingan, sidang, revisi, completion gate, audit. |
| Master data PharmSITA | PharmSITA | Periode akademik, jenis TA, persyaratan, dosen, kuota. |
| Request akun Core | Core | Jika Core punya form request akun, status dan approval tetap di Core. |
| App access Core | Core | Tidak menentukan akses runtime PharmSITA pada fase ini. |

## Yang Dipertahankan di PharmSITA

- Admin user management untuk create/update user.
- Password awal dan reset password via admin PharmSITA.
- First-login challenge dan aktivasi password.
- RBAC internal PharmSITA.
- PostgreSQL adapter untuk data PharmSITA.
- Audit log internal PharmSITA.

## Yang Dihapus dari Boundary Saat Ini

- Endpoint `/api/v1/integrations/core/account-requests/provision`.
- Environment `CORE_PROVISIONING_SECRET`.
- Header `X-Pharmsita-Provisioning-Key`.
- Script live Core provisioning.
- Runbook yang meminta Core memanggil PharmSITA.
- Mapping role alias khusus Core seperti `pembimbing-dalam`, `pembimbing-lapangan`, dan `koordinator-kp`.

## Acceptance Criteria Task 88

- Backend build tetap sukses tanpa route integrasi Core.
- Frontend build tetap sukses.
- Auth smoke test tetap menguji admin provisioning internal, first-login, refresh token, logout, dan RBAC.
- Search repo tidak menemukan sisa `CORE_PROVISIONING_SECRET`, `live-core-provisioning`, atau `/integrations/core`.
- Repo `farmasi-ubp-workspace/core-farmasi` tidak diubah.

## Fase Integrasi Nanti

Jika nanti Core dan PharmSITA benar-benar ingin digabung, buat task baru dengan keputusan eksplisit:

1. Tetapkan source of truth identitas dan app access.
2. Buat contract payload lintas aplikasi.
3. Tentukan auth antar service.
4. Tentukan idempotency dan audit event.
5. Uji di staging sebelum VPS production.

Sampai fase itu dibuka, PharmSITA dianggap standalone.
