
// --- Source: coordinator-academic-data.ts ---
export const academicStageMock = [
  { id: '1', nim: '10123001', name: 'Alif Fikri', stage: 'Seminar Proposal', submitDate: '2026-04-05', status: 'menunggu', note: '-' },
  { id: '2', nim: '10123002', name: 'Ratna Sari', stage: 'Sidang Akhir', submitDate: '2026-04-06', status: 'disetujui', note: 'Bebas persyaratan valid' },
  { id: '3', nim: '10123003', name: 'Bagas Aditya', stage: 'Seminar Proposal', submitDate: '2026-04-01', status: 'perbaikan', note: 'Kwitansi buram' },
];


// --- Source: coordinator-notification-data.ts ---
export const notificationMock = [
  { id: '1', title: 'Batas Pengajuan Sempro', message: 'Diberitahukan bahwa batas akhir pendaftaran dan validasi dokumen Seminar Proposal Periode April adalah tanggal 15 April 2026. Mohon segera melengkapi berkas.', date: '2026-04-01T08:00:00Z', target: 'Semua Mahasiswa' },
  { id: '2', title: 'Jadwal Rapat Evaluasi', message: 'Mohon kehadiran Bapak/Ibu dosen pembimbing pada rapat evaluasi bulanan yang akan diadakan hari Jumat pukul 14:00.', date: '2026-04-02T10:30:00Z', target: 'Semua Dosen' },
];


// --- Source: coordinator-scheduling-data.ts ---
export const schedulingMock = [
  { id: '1', nim: '10123001', name: 'Alif Fikri', title: 'Sistem Deteksi Anomali IoT', stage: 'Seminar Proposal', date: null, time: null, room: null, examiners: [], status: 'pending' },
  { id: '2', nim: '10123002', name: 'Ratna Sari', title: 'Aplikasi Monitoring Pasien Hipertensi', stage: 'Sidang Akhir', date: '2026-04-10', time: '09:00 - 11:00', room: 'R. Sidang 1', examiners: ['Dr. Eka', 'Dr. Faisal'], status: 'dijadwalkan' },
];


// --- Source: coordinator-student-data.ts ---
export * from './ui-mocks';

export interface CoordinatorStudent {
  id: string;
  name: string;
  nim: string;
  title: string;
  status: string;
  supervisor1?: string;
  supervisor2?: string;
}


// --- Source: coordinator-submission-data.ts ---
import type { SubmissionData } from '../features/coordinator/types/coordinator';

export const submissionMockData: SubmissionData[] = [
  {
    id: 'sub-1',
    studentName: 'Budi Santoso',
    nim: '123456789',
    email: 'budi@student.ac.id',
    phone: '081234567890',
    birthDate: '2001-05-15',
    batch: '2022',
    scheme: 'skripsi',
    receiptFile: 'Bukti_Kuitansi_Budi.pdf',
    thesisType: 'Penelitian',
    title: 'Sistem Informasi Manajemen Perpustakaan Berbasis AI',
    description: 'Penelitian ini bertujuan untuk mengembangkan sistem informasi manajemen perpustakaan yang menggunakan teknologi kecerdasan buatan untuk meningkatkan efisiensi pengelolaan koleksi dan pelayanan sirkulasi.',
    suggestedSupervisor1: 'Dr. Ahmad',
    status: 'menunggu',
    submittedAt: '2026-04-01',
  },
  {
    id: 'sub-2',
    studentName: 'Siti Aminah',
    nim: '987654321',
    email: 'siti@student.ac.id',
    phone: '081234567891',
    birthDate: '2002-03-20',
    batch: '2022',
    scheme: 'non-skripsi',
    receiptFile: 'Bukti_Kuitansi_Siti.jpg',
    thesisType: 'MBKM',
    title: 'Program Magang Bersertifikat di PT Farmasi Nusantara',
    description: 'Program MBKM ini bertujuan untuk memberikan pengalaman kerja langsung di bidang farmasi industri dan distribusi produk kesehatan di salah satu perusahaan farmasi terkemuka.',
    suggestedSupervisor1: 'Dr. Citra',
    status: 'menunggu',
    submittedAt: '2026-04-02',
  },
  {
    id: 'sub-3',
    studentName: 'Andi Wijaya',
    nim: '112233445',
    email: 'andi@student.ac.id',
    phone: '081234567892',
    birthDate: '2001-11-08',
    batch: '2021',
    scheme: 'skripsi',
    receiptFile: 'Bukti_Kuitansi_Andi.png',
    thesisType: 'Studi Pustaka',
    title: 'Tinjauan Literatur Penggunaan Machine Learning dalam Diagnosis Penyakit',
    description: 'Studi pustaka ini melakukan tinjauan sistematis terhadap penggunaan algoritma machine learning dalam diagnosis penyakit menular dan dampaknya terhadap keakuratan diagnosis.',
    suggestedSupervisor1: 'Dr. Budi',
    status: 'perbaikan',
    submittedAt: '2026-03-28',
    validationNote: 'Deskripsi belum cukup jelas. Tolong tambahkan rumusan masalah dan batasan penelitian.',
    validationHistory: [
      {
        date: '2026-03-30',
        action: 'perbaikan',
        note: 'Deskripsi belum cukup jelas. Tolong tambahkan rumusan masalah dan batasan penelitian.',
        by: 'Dr. Koordinator'
      }
    ]
  },
  {
    id: 'sub-4',
    studentName: 'Rina Marlina',
    nim: '554433221',
    email: 'rina@student.ac.id',
    phone: '081234567893',
    birthDate: '2002-07-12',
    batch: '2022',
    scheme: 'skripsi',
    receiptFile: 'Bukti_Kuitansi_Rina.pdf',
    thesisType: 'Pharmapreneurship',
    title: 'Desain Bisnis Apotek Digital Berbasis Aplikasi Mobile',
    description: 'Proyek ini mengembangkan desain bisnis (business plan) untuk apotek digital yang melayani konsultasi farmasi dan pembelian obat secara online dengan model berlangganan.',
    suggestedSupervisor1: 'Dr. Ahmad',
    status: 'disetujui',
    submittedAt: '2026-03-15',
    assignedSupervisor1: 'Dr. Ahmad',
    assignedSupervisor2: 'Dr. Citra',
    validationNote: 'Topik menarik dan relevan dengan tren industri farmasi digital. Disetujui.',
    validatedAt: '2026-03-18',
    validatedBy: 'Dr. Koordinator',
    validationHistory: [
      {
        date: '2026-03-18',
        action: 'disetujui',
        note: 'Topik menarik dan relevan dengan tren industri farmasi digital. Disetujui.',
        by: 'Dr. Koordinator'
      }
    ]
  },
  {
    id: 'sub-1-old',
    studentName: 'Budi Santoso',
    nim: '123456789',
    email: 'budi@student.ac.id',
    phone: '081234567890',
    birthDate: '2001-05-15',
    batch: '2022',
    scheme: 'skripsi',
    receiptFile: 'Bukti_Kuitansi_Budi_Lama.pdf',
    thesisType: 'Penelitian',
    title: 'Pengembangan IoT untuk Smart Agriculture dengan Sensor Tanah Tradisional',
    description: 'Desain awal sistem monitoring kelembapan tanah berbasis mikrokontroler murah untuk petani pedesaan.',
    suggestedSupervisor1: 'Dr. Ahmad',
    status: 'ditolak',
    submittedAt: '2026-03-10',
    validationNote: 'Metode kurang inovatif dan sensor yang diusulkan tidak memiliki sensitivitas yang cukup untuk analisis kuantitatif.',
    validatedAt: '2026-03-15',
    validatedBy: 'Dr. Koordinator',
    isHistory: true,
    validationHistory: [
      {
        date: '2026-03-15',
        action: 'ditolak',
        note: 'Metode kurang inovatif dan sensor yang diusulkan tidak memiliki sensitivitas yang cukup untuk analisis kuantitatif.',
        by: 'Dr. Koordinator'
      }
    ]
  },
  {
    id: 'sub-3-old',
    studentName: 'Andi Wijaya',
    nim: '112233445',
    email: 'andi@student.ac.id',
    phone: '081234567892',
    birthDate: '2001-11-08',
    batch: '2021',
    scheme: 'skripsi',
    receiptFile: 'Bukti_Kuitansi_Andi_Lama.png',
    thesisType: 'Studi Pustaka',
    title: 'Analisis Perbandingan Algoritma Machine Learning Standard untuk Klasifikasi Penyakit',
    description: 'Studi pustaka ini membandingkan kinerja algoritma SVM dan Random Forest pada dataset medis publik.',
    suggestedSupervisor1: 'Dr. Budi',
    status: 'ditolak',
    submittedAt: '2026-02-15',
    validationNote: 'Deskripsi terlalu umum dan tidak berfokus pada bidang kefarmasian atau klinis (kurang relevan dengan PharmSita).',
    validatedAt: '2026-02-20',
    validatedBy: 'Dr. Koordinator',
    isHistory: true,
    validationHistory: [
      {
        date: '2026-02-20',
        action: 'ditolak',
        note: 'Deskripsi terlalu umum dan tidak berfokus pada bidang kefarmasian atau klinis (kurang relevan dengan PharmSita).',
        by: 'Dr. Koordinator'
      }
    ]
  },
];


// --- Source: coordinator-supervisor-data.ts ---
import type { SupervisorQuota } from '../features/coordinator/types/coordinator';

export const supervisorQuotaMock: SupervisorQuota[] = [
  { id: '1', name: 'Dr. Ahmad', nip: '198001012005011001', maxQuota: 10, activeStudents: 7, remainingQuota: 3 },
  { id: '2', name: 'Dr. Budi', nip: '198102022006021002', maxQuota: 8, activeStudents: 8, remainingQuota: 0 },
  { id: '3', name: 'Dr. Citra', nip: '198203032007032003', maxQuota: 10, activeStudents: 4, remainingQuota: 6 },
  { id: '4', name: 'Dr. Dedi', nip: '198304042008041004', maxQuota: 5, activeStudents: 5, remainingQuota: 0 },
  { id: '5', name: 'Dr. Eka', nip: '198405052009052005', maxQuota: 6, activeStudents: 2, remainingQuota: 4 },
];

