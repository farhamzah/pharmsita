# PharmSITA Detail Source Alignment - 2026-06-24

## Sumber Referensi

Dokumen ini dibuat setelah membaca dan membandingkan referensi baru dari user:

- `docs/reference/pharmsita-detail-2026-06-24/database-Pharmsita.txt`
- `docs/reference/pharmsita-detail-2026-06-24/Alur Sistem PharmSITA Detail.pdf`
- `docs/reference/pharmsita-detail-2026-06-24/alur-sistem-pharmsita-detail.extracted.txt`

Referensi baru ini selaras dengan arah alignment sebelumnya di `docs/pharmsita-full-workflow-alignment-26-flows.md`, tetapi memberikan model database yang lebih eksplisit dan harus dijadikan batas canonical untuk pekerjaan berikutnya.

## Kesimpulan QA

Status: **selaras secara konsep, belum sepenuhnya selaras secara schema canonical**.

Sistem yang sudah dibuat sudah memiliki fondasi penting:

- Auth, first login, multi-role, profile edit, dan admin user management.
- PostgreSQL runtime, migration runner, bootstrap admin, backup/restore drill, dan release artifact.
- Pendaftaran TA, assignment pembimbing, guidance workflow, material validation, sidang, revisi, audit, dan completion gate.
- Local production-readiness evidence dan release packaging baseline.

Namun referensi baru memakai struktur lifecycle TA yang lebih canonical:

- `thesis_registrations` sebagai pendaftaran TA.
- `theses` sebagai entitas TA aktif setelah disetujui koordinator.
- `thesis_stages` dan `thesis_stage_histories` sebagai state machine utama.
- `guidance_requests` dan `guidance_materials` sebagai model bimbingan eksplisit.
- `stage_submissions` untuk pengajuan seminar proposal, sidang akhir, dan revisi.
- `thesis_schedules`, `thesis_assessments`, dan `revision_notes` untuk jadwal, penilaian, dan butir revisi.

Karena itu, sistem tidak boleh langsung dianggap selesai production secara domain sampai boundary schema canonical ini dipetakan.

## Mapping Database Referensi vs Implementasi Saat Ini

| Area | Referensi Baru | Implementasi Saat Ini | Status |
|---|---|---|---|
| User identity | `users.username`, `full_name`, `gender`, `study_program_id`, `first_login` | `users.identifier`, `name`, role utama, status password, profile per role | Partial |
| Role | `roles`, `user_roles.role_id` | `user_roles.role` text dan `role_permissions` text | Partial |
| Program studi | `faculties`, `study_programs` | `student_profiles.program_studi` text | Belum canonical |
| Skema/jenis TA | `thesis_schemes`, `thesis_types.scheme_id` | `thesis_types.skema` text | Partial |
| Tahap TA | `thesis_stages`, `thesis_stage_histories` | `student_progress_steps` dan status workflow terpisah | Partial |
| Pendaftaran TA | `thesis_registrations` | `final_project_registrations` | Partial, perlu alias/boundary |
| TA aktif | `theses` | Masih tersebar di registration, progress, guidance, exam, revision | Belum canonical |
| Pembimbing/kuota | `thesis_committees`, `lecturer_quotas` | `supervisor_assignments`, `lecturer_profiles.quota_limit` | Partial |
| Bimbingan | `guidance_requests`, `guidance_materials` | `guidance_workflows`, `guidance_materials` | Partial |
| Pengajuan tahap | `stage_submissions`, requirement validations | `thesis_submissions`, exams, revision workflows | Partial |
| Jadwal sidang | `thesis_schedules` | `exams`, `exam_panelists` | Partial |
| Penilaian sidang | `thesis_assessments` | exam assessment service/model internal | Partial |
| Butir revisi | `revision_notes` | `revision_items` dan material bridge | Partial |
| Notifikasi | `notifications` | Belum ada model persistent khusus | Missing |
| Pengaturan sistem | `system_settings` | Environment/config runtime | Missing |
| Pimpinan/reporting | Monitoring/reporting di PDF | Belum menjadi role/workflow lengkap | Missing |

## Mapping Alur Detail PDF

| Alur PDF | Status Sistem | Catatan |
|---|---|---|
| Login multi-role dan first login | Sudah ada | Perlu tetap diverifikasi terhadap role canonical. |
| Mahasiswa daftar TA | Sudah ada | Nama tabel masih `final_project_registrations`, perlu boundary ke `thesis_registrations`. |
| Koordinator validasi pendaftaran dan assign pembimbing | Sudah ada sebagian | Perlu create/update `theses`, `thesis_committees`, dan stage history canonical. |
| 4 jenis bimbingan | Sudah ada sebagian | Mapping jenis sudah dibuat, tetapi perlu `guidance_requests` canonical. |
| Validasi material bimbingan | Sudah ada | Perlu hubungan eksplisit ke request/stage canonical. |
| Minimum 8 bimbingan valid sebelum seminar/sidang | Sudah ada sebagai gate sebagian | Perlu konsisten memakai `guidance_materials` canonical. |
| Pengajuan seminar proposal/sidang akhir | Ada sebagian | Perlu `stage_submissions` sebagai boundary utama. |
| Revisi proposal/sidang dan completion gate | Sudah ada cukup kuat | Perlu bridge `revision_notes` dari hasil sidang ke material revisi. |
| Jadwal sidang dan conflict validation | Ada sebagian | Perlu canonical `thesis_schedules` dan validasi konflik ruang/penguji/waktu. |
| Penilaian sidang oleh penguji | Ada sebagian | Perlu model `thesis_assessments` sesuai rubrik PDF. |
| Monitoring dosen/koordinator | Ada sebagian | Perlu normalisasi data TA aktif. |
| Master data operator | Ada sebagian | Perlu tambah faculty/study program/scheme canonical. |
| Pimpinan archive/reporting | Belum lengkap | Perlu backlog baru setelah canonical schema stabil. |

## Keputusan Boundary

Untuk menjaga aplikasi tetap aman:

1. Jangan rename besar-besaran tabel yang sudah dipakai frontend/backend.
2. Tambahkan layer canonical secara bertahap lewat migration additive.
3. Pertahankan compatibility table lama selama repository/API belum selesai dipindahkan.
4. Setelah canonical model stabil, baru lakukan repository consolidation dan deprecation plan.

Ini penting karena langsung mengganti `final_project_registrations`, `guidance_workflows`, `exams`, atau `revision_workflows` bisa merusak QA lokal dan release artifact yang sudah stabil.

## Penyesuaian yang Dibutuhkan

### Schema canonical additive

Tambahkan migration non-destruktif untuk:

- `roles` canonical dan bridge ke `user_roles`.
- `faculties`, `study_programs`, dan kolom `users.study_program_id`.
- `thesis_schemes` dan hubungan ke `thesis_types`.
- `thesis_stages` dan `thesis_stage_histories`.
- `thesis_registrations` atau compatibility view dari `final_project_registrations`.
- `theses` sebagai entitas TA aktif.
- `thesis_committees` dan `lecturer_quotas`.
- `guidance_requests` yang terhubung ke `theses`, stage, lecturer, dan request status.
- `stage_submissions` dan `stage_submission_requirement_validations`.
- `thesis_schedules`, `thesis_assessments`, `revision_notes`.
- `notifications` dan `system_settings`.

### Repository/API bridge

Repository lama perlu dipetakan ke model canonical:

- Pendaftaran TA harus menghasilkan `theses` ketika disetujui koordinator.
- Assignment pembimbing harus menulis ke `thesis_committees`.
- Perubahan tahap harus menulis ke `thesis_stage_histories`.
- Bimbingan dan revisi harus membaca status dari stage canonical.
- Sidang dan penilaian harus menghasilkan `revision_notes`.

### Frontend bridge

Frontend tidak perlu langsung dirombak total. Yang perlu:

- Tetap memakai facade/service yang sudah ada.
- Tambahkan response mapping dari API canonical.
- Hindari hardcode nama tabel/schema di UI.
- Tambahkan UI untuk Pimpinan/reporting setelah data canonical tersedia.

## Risiko Jika Tidak Disesuaikan

- Data TA aktif bisa tersebar di beberapa workflow tanpa satu sumber kebenaran.
- Pendaftaran yang sudah approved belum tentu membentuk lifecycle TA lengkap.
- Revisi dan material bimbingan bisa tidak sinkron dengan hasil penilaian sidang.
- Reporting pimpinan akan sulit dibuat karena data agregat belum canonical.
- Migrasi production akan lebih berisiko jika schema canonical ditunda terlalu lama.

## Next Task

**Task 132: Canonical PharmSITA Schema Boundary Migration dari Referensi Database Detail**

Prioritas: **Extra High**

Reason: referensi database baru sudah menjadi model domain paling lengkap. Sebelum lanjut deployment production atau fitur reporting, kita perlu membuat migration additive yang menyelaraskan schema lokal dengan model canonical tanpa merusak fitur yang sudah berjalan.

Output Task 132:

- Migration draft canonical non-destruktif.
- Compatibility boundary untuk tabel lama.
- Seed/master data minimal untuk role, scheme, stage, dan system setting.
- Report mapping table lama ke table canonical.
- QA migration di PostgreSQL lokal.

## Task 132 Implementation Note

Task 132 sudah diimplementasikan melalui:

- `backend/database/migrations/009_canonical_pharmsita_schema_boundary.sql`
- `docs/canonical-pharmsita-schema-boundary-migration.md`

Migration dibuat additive/non-destruktif. Repository dan API belum dipindahkan penuh ke canonical write path; perubahan itu menjadi boundary task berikutnya.

**Task 133: Canonical Repository/API Write Path untuk Registrasi TA, Thesis Aktif, Committee, dan Stage History**

Prioritas: **Extra High**

Reason: schema canonical sudah tersedia, tetapi approval pendaftaran TA dan assignment pembimbing harus mulai menulis ke `thesis_registrations`, `theses`, `thesis_committees`, dan `thesis_stage_histories` agar data lifecycle TA tidak hanya bergantung pada tabel legacy.
