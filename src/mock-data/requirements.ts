// requirements.ts
import { storageService } from '../core/services/storage-service';

/**
 * ENUMS: Status dari persyaratan yang divalidasi
 */
export type RequirementValidationStatus = 'Belum Upload' | 'Menunggu Verifikasi' | 'Valid' | 'Perlu Revisi' | 'Ditolak';

export type RequirementStage = 'Persyaratan Awal' | 'Seminar Proposal' | 'Sidang Akhir' | 'Yudisium';

/**
 * Master Persyaratan: Konfigurasi / Definisi persyaratan yang ada per tahapan
 */
export interface MasterRequirement {
  id: string;
  tahap: RequirementStage;
  namaPersyaratan: string;
  deskripsiAturan?: string;
  wajib: boolean;
}

/**
 * Student Requirement: Hubungan N-to-N antara mahasiswa dengan master requirement
 * Di sinilah transaksi verifikasi dan upload link terjadi.
 */
export interface StudentRequirement {
  id: string;
  studentId: string;
  masterRequirementId: string;
  status: RequirementValidationStatus;

  // Mahasiswa side
  linkBerkas?: string;
  tanggalUpload?: string;
  catatanMahasiswa?: string;

  // Koordinator / Validator side
  isChecked: boolean;
  tanggalVerifikasi?: string;
  catatanKoordinator?: string;
  diverifikasiOlehId?: string; // relasi ke user id (Koordinator/Admin)
}

/**
 * Aggregated Type untuk kemudahan integrasi dengan Frontend (UI)
 */
export interface RequirementDetail extends MasterRequirement, Omit<StudentRequirement, 'id' | 'masterRequirementId'> {
  recordId: string; // id dari StudentRequirement
}

// ==========================================
// MOCK DATA 
// ==========================================

const initialMasterRequirements: MasterRequirement[] = [
  // 1. Persyaratan Awal
  { id: 'req_a1', tahap: 'Persyaratan Awal', namaPersyaratan: 'IPK min 3,00 & min 120 SKS (Transkrip nilai dari semester 1 s.d semester 6)', wajib: true },
  { id: 'req_a2', tahap: 'Persyaratan Awal', namaPersyaratan: 'Sudah mengambil Mata Kuliah Metodologi Penelitian', wajib: true },
  { id: 'req_a3', tahap: 'Persyaratan Awal', namaPersyaratan: 'Tidak ada nilai E dan nilai D.', wajib: true },
  { id: 'req_a4', tahap: 'Persyaratan Awal', namaPersyaratan: 'Mahasiswa aktif semester 7', wajib: true },
  { id: 'req_a5', tahap: 'Persyaratan Awal', namaPersyaratan: 'Mengisi KRS Proposal Tugas Akhir di SIPT', wajib: true },
  { id: 'req_a6', tahap: 'Persyaratan Awal', namaPersyaratan: 'Bukti Pelunasan Registrasi/Pendaftaran Tugas Akhir', wajib: true },
  { id: 'req_a7', tahap: 'Persyaratan Awal', namaPersyaratan: 'Transkrip nilai dari semester 1 s.d semester 6 atau KHS', wajib: true },
  { id: 'req_a8', tahap: 'Persyaratan Awal', namaPersyaratan: 'Sedang atau sudah memprogramkan MK Metodologi Penelitian (KST/KRS semester saat ini)', wajib: true },

  // 2. Seminar Proposal
  { id: 'req_b1', tahap: 'Seminar Proposal', namaPersyaratan: 'Lembar Bimbingan Tugas Akhir (Proposal) - Dosen Pembimbing Utama', wajib: true },
  { id: 'req_b2', tahap: 'Seminar Proposal', namaPersyaratan: 'Lembar Bimbingan Tugas Akhir (Proposal) - Dosen Pembimbing Pendamping', wajib: true },
  { id: 'req_b3', tahap: 'Seminar Proposal', namaPersyaratan: 'Surat Rekomendasi dari Dosen Pembimbing Utama dan Dosen Pembimbing Pendamping', wajib: true },
  { id: 'req_b4', tahap: 'Seminar Proposal', namaPersyaratan: 'Laporan Proposal Tugas Akhir yang Sudah Ditandatangani', wajib: true },
  { id: 'req_b5', tahap: 'Seminar Proposal', namaPersyaratan: 'Kartu Studi Tetap (Terdapat Mata Kuliah Proposal TA yang Sudah Ditandatangani Dosen Wali)', wajib: true },
  { id: 'req_b6', tahap: 'Seminar Proposal', namaPersyaratan: 'Link Laporan Proposal yang sudah diupload di Portal TA', wajib: true },

  // 3. Sidang Akhir
  { id: 'req_c1', tahap: 'Sidang Akhir', namaPersyaratan: 'Surat Ijin Penelitian', wajib: true },
  { id: 'req_c2', tahap: 'Sidang Akhir', namaPersyaratan: 'Berkas soft file Tugas Akhir', wajib: true },
  { id: 'req_c3', tahap: 'Sidang Akhir', namaPersyaratan: 'KST pengambilan matakuliah Tugas Akhir dari SIPT ditanda tangani Dosen Pembimbing Akademik', wajib: true },
  { id: 'req_c4', tahap: 'Sidang Akhir', namaPersyaratan: 'Transkrip Nilai dari SIPT seluruh semester dengan jumlah minimal 146 SKS', wajib: true },
  { id: 'req_c5', tahap: 'Sidang Akhir', namaPersyaratan: 'Lembar pengesahan lulus proposal Tugas Akhir yang telah ditanda tangani', wajib: true },
  { id: 'req_c6', tahap: 'Sidang Akhir', namaPersyaratan: 'Lembar bimbingan Tugas Akhir dan rekomendasi telah ditanda tangan', wajib: true },
  { id: 'req_c7', tahap: 'Sidang Akhir', namaPersyaratan: 'Logbook', wajib: true },
  { id: 'req_c8', tahap: 'Sidang Akhir', namaPersyaratan: 'Surat Pernyataan Publikasi', wajib: true },
  { id: 'req_c9', tahap: 'Sidang Akhir', namaPersyaratan: 'Berstastus eligible Penomoran Ijazah Nasional (PIN) dari Koordinator Program Studi', wajib: true },
  { id: 'req_c10', tahap: 'Sidang Akhir', namaPersyaratan: 'Report SKPI (Surat Keterangan Pendamping Ijazah) memenuhi 20 point dari Dosen Pembimbing Akademik dan disahkan oleh Koordinator Program Studi', wajib: true },
  { id: 'req_c11', tahap: 'Sidang Akhir', namaPersyaratan: 'Form Permohonan Pengecekan Turnitin / Surat Keterangan Lulus Pengecekan Turnitin maksimal 25% yang dikeluarkan oleh Kepala Perpustakaan', wajib: true },
  { id: 'req_c12', tahap: 'Sidang Akhir', namaPersyaratan: 'Bukti Pelunasan UKT Tahap/Bulan Berjalan Tahun Akademik 2025/2026', wajib: true },
  { id: 'req_c13', tahap: 'Sidang Akhir', namaPersyaratan: 'Photocopy KTP', wajib: true },
  { id: 'req_c14', tahap: 'Sidang Akhir', namaPersyaratan: 'Photocopy Ijazah SMA', wajib: true },
  { id: 'req_c15', tahap: 'Sidang Akhir', namaPersyaratan: 'Foto ukuran 4x6 background merah tanpa pinggiran putih menggunakan jas almamater', wajib: true },

  // 4. Yudisium (Keep existing since requirement-items had none for this but it is required)
  { id: 'req_d1', tahap: 'Yudisium', namaPersyaratan: 'Lembar Pengesahan TA Hardcover', wajib: true },
  { id: 'req_d2', tahap: 'Yudisium', namaPersyaratan: 'Surat Bebas Pustaka (Perpustakaan)', wajib: true },
  { id: 'req_d3', tahap: 'Yudisium', namaPersyaratan: 'Surat Bebas Laboratorium', wajib: true },
  { id: 'req_d4', tahap: 'Yudisium', namaPersyaratan: 'Tanda Terima Penyerahan Alat/Program', wajib: false },
];

export const mockMasterRequirements: MasterRequirement[] = [];

export const loadMasterRequirements = (): MasterRequirement[] => {
  const saved = storageService.get<MasterRequirement[]>('pharmsita_master_requirements');
  let currentList: MasterRequirement[] = [];
  if (saved) {
    currentList = saved;
  } else {
    currentList = initialMasterRequirements;
    storageService.set('pharmsita_master_requirements', currentList);
  }
  
  mockMasterRequirements.length = 0;
  mockMasterRequirements.push(...currentList);
  return mockMasterRequirements;
};

// Initial load
loadMasterRequirements();

export const mockStudentRequirements: StudentRequirement[] = [
  // Mahasiswa ID: s_prof_1 (Alif Fikri) -> Fokus di Seminar Proposal
  {
    id: 'sreq_1', studentId: 's_prof_1', masterRequirementId: 'req_a1',
    status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/krs_alif',
    tanggalUpload: '2026-02-15T08:00:00Z', isChecked: true,
    tanggalVerifikasi: '2026-02-16T10:00:00Z', diverifikasiOlehId: 'c_prof_1'
  },
  {
    id: 'sreq_2', studentId: 's_prof_1', masterRequirementId: 'req_a2',
    status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/transkrip_alif',
    tanggalUpload: '2026-02-15T08:05:00Z', isChecked: true,
    tanggalVerifikasi: '2026-02-16T10:05:00Z', diverifikasiOlehId: 'c_prof_1'
  },
  {
    id: 'sreq_3', studentId: 's_prof_1', masterRequirementId: 'req_a3',
    status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/bayar_alif',
    tanggalUpload: '2026-02-15T08:10:00Z', isChecked: true,
    tanggalVerifikasi: '2026-02-16T10:10:00Z', diverifikasiOlehId: 'c_prof_1'
  },
  {
    id: 'sreq_4', studentId: 's_prof_1', masterRequirementId: 'req_a4',
    status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/surat_alif',
    tanggalUpload: '2026-02-15T08:15:00Z', isChecked: true,
    tanggalVerifikasi: '2026-02-16T10:15:00Z', diverifikasiOlehId: 'c_prof_1'
  },

  {
    id: 'sreq_5', studentId: 's_prof_1', masterRequirementId: 'req_b1',
    status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/acc_sempro_alif',
    tanggalUpload: '2026-04-10T09:00:00Z', isChecked: true,
    tanggalVerifikasi: '2026-04-11T13:00:00Z', diverifikasiOlehId: 'c_prof_1'
  },
  {
    id: 'sreq_6', studentId: 's_prof_1', masterRequirementId: 'req_b2',
    status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/draft_alif',
    tanggalUpload: '2026-04-15T22:30:00Z', catatanMahasiswa: 'Sudah acc pembimbing 1 dan 2',
    isChecked: false
  },
  {
    id: 'sreq_7', studentId: 's_prof_1', masterRequirementId: 'req_b3',
    status: 'Perlu Revisi', linkBerkas: 'https://drive.google.com/file/d/kartuseminar_alif',
    tanggalUpload: '2026-04-15T22:35:00Z', isChecked: false,
    catatanKoordinator: 'Kurang 1 tanda tangan kehadiran seminar.', diverifikasiOlehId: 'c_prof_1'
  },

  // Mahasiswa ID: s_prof_2 (Dimas Indra Jaya) -> Fokus di Persyaratan Awal (Masih ada yg belum upload)
  {
    id: 'sreq_8', studentId: 's_prof_2', masterRequirementId: 'req_a1',
    status: 'Valid', linkBerkas: 'https://drive.google.com/file/d/krs_dimas',
    tanggalUpload: '2026-04-01T10:00:00Z', isChecked: true,
    tanggalVerifikasi: '2026-04-02T11:00:00Z', diverifikasiOlehId: 'c_prof_1'
  },
  {
    id: 'sreq_9', studentId: 's_prof_2', masterRequirementId: 'req_a2',
    status: 'Menunggu Verifikasi', linkBerkas: 'https://drive.google.com/file/d/transkrip_dimas',
    tanggalUpload: '2026-04-15T09:00:00Z', isChecked: false
  },
  {
    id: 'sreq_10', studentId: 's_prof_2', masterRequirementId: 'req_a3',
    status: 'Perlu Revisi', linkBerkas: 'https://drive.google.com/file/d/bayar_dimas',
    tanggalUpload: '2026-04-15T09:10:00Z', isChecked: false,
    catatanKoordinator: 'Bukti transfer buram, mohon re-upload yang lebih tajam', diverifikasiOlehId: 'c_prof_1'
  },
  {
    id: 'sreq_11', studentId: 's_prof_2', masterRequirementId: 'req_a4',
    status: 'Belum Upload', isChecked: false
  },
];

// ==========================================
// UTILITY FUNCTIONS UNTUK UI
// ==========================================

/**
 * Mengambil detail seluruh persyaratan beserta status mahasiswa.
 * Berguna untuk UI tabel list atau tampilan Koordinator & Mahasiswa.
 */
export const getStudentRequirementDetails = (studentId: string, tahap?: RequirementStage): RequirementDetail[] => {
  loadMasterRequirements();
  let masters = mockMasterRequirements;
  if (tahap) {
    masters = masters.filter(m => m.tahap === tahap);
  }

  return masters.map(master => {
    const studentReq = mockStudentRequirements.find(
      sr => sr.masterRequirementId === master.id && sr.studentId === studentId
    );

    // Default value jika belum ada record
    const statusDefault: RequirementValidationStatus = 'Belum Upload';

    return {
      id: master.id,
      tahap: master.tahap,
      namaPersyaratan: master.namaPersyaratan,
      wajib: master.wajib,
      deskripsiAturan: master.deskripsiAturan,

      recordId: studentReq?.id || `new_${master.id}`,
      studentId: studentId,
      status: studentReq?.status || statusDefault,
      linkBerkas: studentReq?.linkBerkas,
      tanggalUpload: studentReq?.tanggalUpload,
      tanggalVerifikasi: studentReq?.tanggalVerifikasi,
      catatanMahasiswa: studentReq?.catatanMahasiswa,
      catatanKoordinator: studentReq?.catatanKoordinator,
      isChecked: studentReq?.isChecked || false,
      diverifikasiOlehId: studentReq?.diverifikasiOlehId,
    };
  });
};

/**
 * Summary kalkulasi untuk progress bar atau ringkasan card
 */
export const getRequirementSummary = (studentId: string, tahap?: RequirementStage) => {
  loadMasterRequirements();
  const details = getStudentRequirementDetails(studentId, tahap);

  const total = details.length;
  const wajib = details.filter(d => d.wajib).length;

  const valid = details.filter(d => d.status === 'Valid').length;
  const pending = details.filter(d => d.status === 'Menunggu Verifikasi').length;
  const revising = details.filter(d => d.status === 'Perlu Revisi').length;
  const notUploaded = details.filter(d => d.status === 'Belum Upload').length;

  const progressPercent = total === 0 ? 0 : Math.round((valid / total) * 100);

  return {
    total,
    wajib,
    valid,
    pending,
    perluRevisi: revising,
    belumUpload: notUploaded,
    progressPercent,
    isComplete: wajib > 0 && details.filter(d => d.wajib).every(d => d.status === 'Valid')
  };
};
