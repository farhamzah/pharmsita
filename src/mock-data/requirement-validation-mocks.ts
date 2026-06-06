// requirement-validation-mocks.ts
// Mock data khusus untuk fitur validasi persyaratan koordinator

import type { StudentRequirement } from './requirements';

/**
 * Tipe ringkasan mahasiswa untuk tampilan list koordinator
 */
export interface StudentValidationSummary {
  studentId: string;
  nim: string;
  nama: string;
  angkatan: string;
  programStudi: string;
  tahapanAktif: string;
  linkBerkasDrive?: string; // Google Drive folder link yang disubmit mahasiswa
  statusPengajuan: 'Belum Mengajukan' | 'Menunggu Validasi' | 'Disetujui' | 'Ditolak';
}

/**
 * Data mahasiswa untuk fitur validasi persyaratan koordinator
 * Linked ke mockStudentProfiles dengan id: 's_prof_1', 's_prof_2', dll
 */
export const mockStudentValidationList: StudentValidationSummary[] = [
  {
    studentId: 's_prof_1',
    nim: '221011400215',
    nama: 'Dimas Indra Jaya',
    angkatan: '2022',
    programStudi: 'S1 Farmasi',
    tahapanAktif: 'Bimbingan Pra Proposal',
    linkBerkasDrive: 'https://drive.google.com/drive/folders/mock_dimas_drive',
    statusPengajuan: 'Disetujui',
  },
  {
    studentId: 's_prof_2',
    nim: '221011400216',
    nama: 'Aulia Rahma',
    angkatan: '2022',
    programStudi: 'S1 Farmasi',
    tahapanAktif: 'Bimbingan Pra Proposal',
    linkBerkasDrive: 'https://drive.google.com/drive/folders/mock_aulia_drive',
    statusPengajuan: 'Menunggu Validasi',
  },
  {
    studentId: 's_prof_3',
    nim: '221011400217',
    nama: 'Bagas Aditya Pratama',
    angkatan: '2022',
    programStudi: 'S1 Farmasi',
    tahapanAktif: 'Persyaratan Awal',
    linkBerkasDrive: 'https://drive.google.com/drive/folders/mock_bagas_drive',
    statusPengajuan: 'Menunggu Validasi',
  },
  {
    studentId: 's_prof_4',
    nim: '221011400218',
    nama: 'Dewi Lestari Sari',
    angkatan: '2022',
    programStudi: 'S1 Farmasi',
    tahapanAktif: 'Persyaratan Awal',
    linkBerkasDrive: undefined, // Belum submit link
    statusPengajuan: 'Belum Mengajukan',
  },
  {
    studentId: 's_prof_5',
    nim: '221011400219',
    nama: 'Rizky Firmansyah',
    angkatan: '2022',
    programStudi: 'S1 Farmasi',
    tahapanAktif: 'Bimbingan Pra Sidang',
    linkBerkasDrive: 'https://drive.google.com/drive/folders/mock_rizky_drive',
    statusPengajuan: 'Disetujui',
  },
];

/**
 * Extended student requirements mencakup semua 5 mahasiswa
 * s_prof_1 (Dimas) → sudah di Bimbingan, persyaratan awal semua valid
 * s_prof_2 (Aulia) → ada yg pending verifikasi di persyaratan seminar
 * s_prof_3 (Bagas) → sedang mengumpulkan persyaratan awal, ada yg perlu revisi
 * s_prof_4 (Dewi)  → belum upload sama sekali
 * s_prof_5 (Rizky) → paling jauh, ada sidang akhir, banyak yang valid
 */
export const mockExtendedStudentRequirements: StudentRequirement[] = [

  // ========================================
  // s_prof_1: Dimas Indra Jaya (Sudah Bimbingan - semua persyaratan awal valid)
  // ========================================
  { id: 'sreq_d_a1', studentId: 's_prof_1', masterRequirementId: 'req_a1', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/dimas_transkrip', tanggalUpload: '2026-02-10T08:00:00Z', isChecked: true, tanggalVerifikasi: '2026-02-12T10:00:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_d_a2', studentId: 's_prof_1', masterRequirementId: 'req_a2', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/dimas_metodologi', tanggalUpload: '2026-02-10T08:05:00Z', isChecked: true, tanggalVerifikasi: '2026-02-12T10:05:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_d_a3', studentId: 's_prof_1', masterRequirementId: 'req_a3', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/dimas_nilaibersih', tanggalUpload: '2026-02-10T08:10:00Z', isChecked: true, tanggalVerifikasi: '2026-02-12T10:10:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_d_a4', studentId: 's_prof_1', masterRequirementId: 'req_a4', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/dimas_aktif', tanggalUpload: '2026-02-10T08:15:00Z', isChecked: true, tanggalVerifikasi: '2026-02-12T10:15:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_d_a5', studentId: 's_prof_1', masterRequirementId: 'req_a5', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/dimas_krs', tanggalUpload: '2026-02-10T08:20:00Z', isChecked: true, tanggalVerifikasi: '2026-02-12T10:20:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_d_a6', studentId: 's_prof_1', masterRequirementId: 'req_a6', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/dimas_bayar', tanggalUpload: '2026-02-10T08:25:00Z', isChecked: true, tanggalVerifikasi: '2026-02-12T10:25:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_d_a7', studentId: 's_prof_1', masterRequirementId: 'req_a7', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/dimas_khs', tanggalUpload: '2026-02-10T08:30:00Z', isChecked: true, tanggalVerifikasi: '2026-02-12T10:30:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_d_a8', studentId: 's_prof_1', masterRequirementId: 'req_a8', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/dimas_mkmetpen', tanggalUpload: '2026-02-10T08:35:00Z', isChecked: true, tanggalVerifikasi: '2026-02-12T10:35:00Z', diverifikasiOlehId: 'c_prof_1' },

  // ========================================
  // s_prof_2: Aulia Rahma (Seminar Proposal - sebagian persyaratan awal valid, ada yg pending)
  // ========================================
  { id: 'sreq_a_a1', studentId: 's_prof_2', masterRequirementId: 'req_a1', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/aulia_transkrip', tanggalUpload: '2026-03-01T09:00:00Z', isChecked: true, tanggalVerifikasi: '2026-03-03T11:00:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_a_a2', studentId: 's_prof_2', masterRequirementId: 'req_a2', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/aulia_metodologi', tanggalUpload: '2026-03-01T09:05:00Z', isChecked: true, tanggalVerifikasi: '2026-03-03T11:05:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_a_a3', studentId: 's_prof_2', masterRequirementId: 'req_a3', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/aulia_nilaibersih', tanggalUpload: '2026-03-01T09:10:00Z', isChecked: true, tanggalVerifikasi: '2026-03-03T11:10:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_a_a4', studentId: 's_prof_2', masterRequirementId: 'req_a4', status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/aulia_aktif', tanggalUpload: '2026-04-14T20:00:00Z', isChecked: false },
  { id: 'sreq_a_a5', studentId: 's_prof_2', masterRequirementId: 'req_a5', status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/aulia_krs', tanggalUpload: '2026-04-14T20:05:00Z', isChecked: false },
  { id: 'sreq_a_a6', studentId: 's_prof_2', masterRequirementId: 'req_a6', status: 'Perlu Revisi', linkBerkas: 'https://drive.google.com/file/d/aulia_bayar', tanggalUpload: '2026-04-14T20:10:00Z', isChecked: false, catatanKoordinator: 'Bukti bayar tidak terbaca, tolong upload ulang foto yang lebih jelas.', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_a_a7', studentId: 's_prof_2', masterRequirementId: 'req_a7', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/aulia_khs', tanggalUpload: '2026-03-01T09:30:00Z', isChecked: true, tanggalVerifikasi: '2026-03-03T11:30:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_a_a8', studentId: 's_prof_2', masterRequirementId: 'req_a8', status: 'Belum Upload', isChecked: false },

  // ========================================
  // s_prof_3: Bagas Aditya (Persyaratan Awal - baru mulai, masih banyak yang belum)
  // ========================================
  { id: 'sreq_b_a1', studentId: 's_prof_3', masterRequirementId: 'req_a1', status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/bagas_transkrip', tanggalUpload: '2026-04-20T14:00:00Z', isChecked: false },
  { id: 'sreq_b_a2', studentId: 's_prof_3', masterRequirementId: 'req_a2', status: 'Perlu Revisi', linkBerkas: 'https://drive.google.com/file/d/bagas_metodologi', tanggalUpload: '2026-04-20T14:05:00Z', isChecked: false, catatanKoordinator: 'File tidak dapat dibuka, pastikan link tidak terkunci (restricted).', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_b_a3', studentId: 's_prof_3', masterRequirementId: 'req_a3', status: 'Belum Upload', isChecked: false },
  { id: 'sreq_b_a4', studentId: 's_prof_3', masterRequirementId: 'req_a4', status: 'Belum Upload', isChecked: false },
  { id: 'sreq_b_a5', studentId: 's_prof_3', masterRequirementId: 'req_a5', status: 'Belum Upload', isChecked: false },
  { id: 'sreq_b_a6', studentId: 's_prof_3', masterRequirementId: 'req_a6', status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/bagas_bayar', tanggalUpload: '2026-04-20T14:30:00Z', isChecked: false },
  { id: 'sreq_b_a7', studentId: 's_prof_3', masterRequirementId: 'req_a7', status: 'Belum Upload', isChecked: false },
  { id: 'sreq_b_a8', studentId: 's_prof_3', masterRequirementId: 'req_a8', status: 'Belum Upload', isChecked: false },

  // s_prof_4: Dewi - Belum upload sama sekali → tidak ada data sama sekali → default ke 'Belum Upload'

  // ========================================
  // s_prof_5: Rizky Firmansyah (Sidang Akhir - hampir semua persyaratan sudah valid termasuk Seminar)
  // ========================================
  // Persyaratan Awal - semua valid
  { id: 'sreq_r_a1', studentId: 's_prof_5', masterRequirementId: 'req_a1', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_a1', tanggalUpload: '2025-10-01T08:00:00Z', isChecked: true, tanggalVerifikasi: '2025-10-03T10:00:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_a2', studentId: 's_prof_5', masterRequirementId: 'req_a2', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_a2', tanggalUpload: '2025-10-01T08:05:00Z', isChecked: true, tanggalVerifikasi: '2025-10-03T10:05:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_a3', studentId: 's_prof_5', masterRequirementId: 'req_a3', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_a3', tanggalUpload: '2025-10-01T08:10:00Z', isChecked: true, tanggalVerifikasi: '2025-10-03T10:10:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_a4', studentId: 's_prof_5', masterRequirementId: 'req_a4', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_a4', tanggalUpload: '2025-10-01T08:15:00Z', isChecked: true, tanggalVerifikasi: '2025-10-03T10:15:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_a5', studentId: 's_prof_5', masterRequirementId: 'req_a5', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_a5', tanggalUpload: '2025-10-01T08:20:00Z', isChecked: true, tanggalVerifikasi: '2025-10-03T10:20:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_a6', studentId: 's_prof_5', masterRequirementId: 'req_a6', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_a6', tanggalUpload: '2025-10-01T08:25:00Z', isChecked: true, tanggalVerifikasi: '2025-10-03T10:25:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_a7', studentId: 's_prof_5', masterRequirementId: 'req_a7', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_a7', tanggalUpload: '2025-10-01T08:30:00Z', isChecked: true, tanggalVerifikasi: '2025-10-03T10:30:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_a8', studentId: 's_prof_5', masterRequirementId: 'req_a8', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_a8', tanggalUpload: '2025-10-01T08:35:00Z', isChecked: true, tanggalVerifikasi: '2025-10-03T10:35:00Z', diverifikasiOlehId: 'c_prof_1' },
  // Seminar Proposal - semua valid
  { id: 'sreq_r_b1', studentId: 's_prof_5', masterRequirementId: 'req_b1', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_b1', tanggalUpload: '2026-01-10T09:00:00Z', isChecked: true, tanggalVerifikasi: '2026-01-12T11:00:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_b2', studentId: 's_prof_5', masterRequirementId: 'req_b2', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_b2', tanggalUpload: '2026-01-10T09:05:00Z', isChecked: true, tanggalVerifikasi: '2026-01-12T11:05:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_b3', studentId: 's_prof_5', masterRequirementId: 'req_b3', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_b3', tanggalUpload: '2026-01-10T09:10:00Z', isChecked: true, tanggalVerifikasi: '2026-01-12T11:10:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_b4', studentId: 's_prof_5', masterRequirementId: 'req_b4', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_b4', tanggalUpload: '2026-01-10T09:15:00Z', isChecked: true, tanggalVerifikasi: '2026-01-12T11:15:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_b5', studentId: 's_prof_5', masterRequirementId: 'req_b5', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_b5', tanggalUpload: '2026-01-10T09:20:00Z', isChecked: true, tanggalVerifikasi: '2026-01-12T11:20:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_b6', studentId: 's_prof_5', masterRequirementId: 'req_b6', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_b6', tanggalUpload: '2026-01-10T09:25:00Z', isChecked: true, tanggalVerifikasi: '2026-01-12T11:25:00Z', diverifikasiOlehId: 'c_prof_1' },
  // Sidang Akhir - masih ada yg pending
  { id: 'sreq_r_c1', studentId: 's_prof_5', masterRequirementId: 'req_c1', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c1', tanggalUpload: '2026-04-01T07:00:00Z', isChecked: true, tanggalVerifikasi: '2026-04-03T09:00:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_c2', studentId: 's_prof_5', masterRequirementId: 'req_c2', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c2', tanggalUpload: '2026-04-01T07:05:00Z', isChecked: true, tanggalVerifikasi: '2026-04-03T09:05:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_c3', studentId: 's_prof_5', masterRequirementId: 'req_c3', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c3', tanggalUpload: '2026-04-01T07:10:00Z', isChecked: true, tanggalVerifikasi: '2026-04-03T09:10:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_c4', studentId: 's_prof_5', masterRequirementId: 'req_c4', status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/rizky_c4', tanggalUpload: '2026-04-25T20:00:00Z', isChecked: false },
  { id: 'sreq_r_c5', studentId: 's_prof_5', masterRequirementId: 'req_c5', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c5', tanggalUpload: '2026-04-01T07:20:00Z', isChecked: true, tanggalVerifikasi: '2026-04-03T09:20:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_c6', studentId: 's_prof_5', masterRequirementId: 'req_c6', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c6', tanggalUpload: '2026-04-01T07:25:00Z', isChecked: true, tanggalVerifikasi: '2026-04-03T09:25:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_c7', studentId: 's_prof_5', masterRequirementId: 'req_c7', status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/rizky_c7', tanggalUpload: '2026-04-25T20:15:00Z', isChecked: false },
  { id: 'sreq_r_c8', studentId: 's_prof_5', masterRequirementId: 'req_c8', status: 'Belum Upload', isChecked: false },
  { id: 'sreq_r_c9', studentId: 's_prof_5', masterRequirementId: 'req_c9', status: 'Belum Upload', isChecked: false },
  { id: 'sreq_r_c10', studentId: 's_prof_5', masterRequirementId: 'req_c10', status: 'Belum Upload', isChecked: false },
  { id: 'sreq_r_c11', studentId: 's_prof_5', masterRequirementId: 'req_c11', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c11', tanggalUpload: '2026-04-02T10:00:00Z', isChecked: true, tanggalVerifikasi: '2026-04-04T10:00:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_c12', studentId: 's_prof_5', masterRequirementId: 'req_c12', status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/rizky_c12', tanggalUpload: '2026-04-26T07:00:00Z', isChecked: false },
  { id: 'sreq_r_c13', studentId: 's_prof_5', masterRequirementId: 'req_c13', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c13', tanggalUpload: '2026-04-01T08:00:00Z', isChecked: true, tanggalVerifikasi: '2026-04-03T10:00:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_c14', studentId: 's_prof_5', masterRequirementId: 'req_c14', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c14', tanggalUpload: '2026-04-01T08:05:00Z', isChecked: true, tanggalVerifikasi: '2026-04-03T10:05:00Z', diverifikasiOlehId: 'c_prof_1' },
  { id: 'sreq_r_c15', studentId: 's_prof_5', masterRequirementId: 'req_c15', status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/rizky_c15', tanggalUpload: '2026-04-01T08:10:00Z', isChecked: true, tanggalVerifikasi: '2026-04-03T10:10:00Z', diverifikasiOlehId: 'c_prof_1' },
];

/**
 * Helper: Ambil semua requirement records untuk mahasiswa tertentu dari extended mock
 * Digunakan di halaman detail validasi koordinator
 */
export const getValidationRequirementsForStudent = (studentId: string): StudentRequirement[] => {
  return mockExtendedStudentRequirements.filter(r => r.studentId === studentId);
};

/**
 * Helper: Hitung status badge koordinator untuk satu mahasiswa
 * Menentukan apakah mahasiswa "Layak Lanjut", "Perlu Tindakan", atau "Belum Memenuhi"
 */
export const getStudentValidationStatus = (studentId: string) => {
  const reqs = mockExtendedStudentRequirements.filter(r => r.studentId === studentId);
  const total = reqs.length;
  if (total === 0) return 'Belum Valid' as const;

  const valid = reqs.filter(r => r.status === 'Valid').length;
  if (valid === total) return 'Valid' as const;
  return 'Belum Valid' as const;
};
