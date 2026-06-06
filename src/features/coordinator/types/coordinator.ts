// Skema TA
export type ThesisScheme = 'skripsi' | 'non-skripsi';

// Jenis TA - Skripsi
export type ThesisType = 'Penelitian' | 'Studi Pustaka' | 'Pharmapreneurship';

// Jenis TA - Non Skripsi
export type NonThesisType = 'Publikasi Ilmiah' | 'MBKM';

// Status pengajuan
export type SubmissionStatus = 'menunggu' | 'perbaikan' | 'disetujui' | 'ditolak';

// Riwayat validasi
export interface ValidationHistoryItem {
  date: string;
  action: 'disetujui' | 'ditolak' | 'perbaikan' | 'menunggu';
  note: string;
  by: string;
}

// Data pengajuan (Revisi - sesuai form yang ada)
export interface SubmissionData {
  id: string;
  studentId?: string;

  // Data Mahasiswa (dari PersonalDataForm)
  studentName: string;
  nim: string;
  email: string;
  phone: string;
  birthDate: string;
  batch: string;                       // angkatan

  // Data Pengajuan
  scheme: ThesisScheme;                // skema TA
  receiptFile: string;                 // nama file bukti kuitansi
  paymentProofLink?: string;
  requirementDriveLink?: string;
  thesisType: ThesisType | NonThesisType; // jenis TA
  title: string;                       // judul TA / judul MBKM
  description: string;                 // deskripsi TA / deskripsi MBKM
  suggestedSupervisor1: string;        // usulan pembimbing dari mahasiswa
  suggestedSupervisor1Id?: string | null;
  suggestedSupervisor2?: string;       // opsional

  // Data Validasi (diisi oleh koordinator)
  status: SubmissionStatus;
  submittedAt: string;                 // tanggal pengajuan
  validationNote?: string;             // catatan validasi
  assignedSupervisor1?: string;        // pembimbing 1 (ditetapkan koordinator)
  assignedSupervisor1Id?: string | null;
  assignedSupervisor2?: string;        // pembimbing 2 (ditetapkan koordinator)
  assignedSupervisor2Id?: string | null;
  validatedAt?: string;                // tanggal validasi
  validatedBy?: string;                // nama koordinator

  // Riwayat validasi
  validationHistory?: ValidationHistoryItem[];
  isHistory?: boolean;
}

export type AcademicStage = 'seminar-proposal' | 'sidang-akhir' | 'revisi-finalisasi' | 'selesai';

export interface SupervisorQuota {
  id: string;
  name: string;
  nip: string;
  maxQuota: number;
  activeStudents: number;
  remainingQuota: number;
}
