// --- Source: dashboardMocks.ts ---
export const upcomingAgendaMock = {
  agenda: 'Bimbingan Proposal Tugas Akhir',
  tanggal: 'Senin, 4 Maret 2026',
  waktu: '09.00 - 10.00 WIB',
  ruang: 'Ruang Dosen 203',
  lokasi: 'Gedung Teknik Informatika',
};

export const supportingDocumentsMock = [
  {
    title: 'Panduan Penggunaan Aplikasi',
    description:
      'Berisi petunjuk umum penggunaan fitur aplikasi agar proses bimbingan dan pengajuan berjalan lancar.',
  },
  {
    title: 'Ketentuan & Hal yang Perlu Diperhatikan',
    description:
      'Informasi penting terkait aturan, batas waktu, dan ketentuan yang wajib dipahami selama menggunakan aplikasi.',
  },
];

export const approvalProcessMocks = [
  {
    tahap: 'Seminar Proposal',
    items: [
      { label: 'Minimal Bimbingan (8x)', status: 'fulfilled' as const },
      { label: 'Pembimbing 1', status: 'fulfilled' as const },
      { label: 'Pembimbing 2', status: 'fulfilled' as const },
      { label: 'File Final Proposal', status: 'fulfilled' as const },
      { label: 'Syarat & Ketentuan Seminar Proposal', status: 'fulfilled' as const },
    ],
  },
  {
    tahap: 'Sidang Akhir',
    items: [
      { label: 'Minimal Bimbingan (8x)', status: 'pending' as const },
      { label: 'Pembimbing 1', status: 'pending' as const },
      { label: 'Pembimbing 2', status: 'pending' as const },
      { label: 'Penguji 1', status: 'fulfilled' as const },
      { label: 'Penguji 2', status: 'fulfilled' as const },
      { label: 'Ketua Sidang', status: 'pending' as const },
      { label: 'Syarat & Ketentuan Sidang Akhir', status: 'pending' as const },
      { label: 'File Final Proposal', status: 'pending' as const },
    ],
  },
  {
    tahap: 'Revisi & Finalisasi',
    items: [
      { label: 'Pembimbing 1', status: 'pending' as const },
      { label: 'Pembimbing 2', status: 'pending' as const },
      { label: 'Penguji 1', status: 'pending' as const },
      { label: 'Penguji 2', status: 'pending' as const },
      { label: 'Ketua Sidang', status: 'pending' as const },
      { label: 'File Final Proposal', status: 'pending' as const },
    ],
  },
];

// --- Source: profileMocks.ts ---
import { mockStudentProfiles } from './profiles';

// Use the exact mock data from centralized mock-data profiles
export const profileDataMock = {
  ...mockStudentProfiles[1],
  nama: mockStudentProfiles[1].name,
  statusTA: mockStudentProfiles[1].status as 'Aktif' | 'Tidak Aktif',
  tanggalLahir: mockStudentProfiles[1].tanggalLahir || '-', 
  programStudi: mockStudentProfiles[1].programStudi,
  jenisTA: mockStudentProfiles[1].jenisTA,
  skemaTA: mockStudentProfiles[1].skemaTA,
  angkatan: mockStudentProfiles[1].angkatan,
  // overriding specific fields needed exclusively by the previous component
  noHpWhatsapp: mockStudentProfiles[1].phone
};

import { getRequirementSummary } from './requirements';

// ... existing code ...

const sumAwal = getRequirementSummary("s_prof_2", "Persyaratan Awal");
const sumSempro = getRequirementSummary("s_prof_2", "Seminar Proposal");
const sumTA = getRequirementSummary("s_prof_2", "Sidang Akhir");
const sumYudisium = getRequirementSummary("s_prof_2", "Yudisium");

export const requirementProgressMock = [
  { label: 'Tahap Persyaratan Awal', value: sumAwal.valid, total: sumAwal.total, persen: sumAwal.progressPercent },
  { label: 'Persiapan Seminar Proposal', value: sumSempro.valid, total: sumSempro.total, persen: sumSempro.progressPercent },
  { label: 'Persiapan Tugas Akhir', value: sumTA.valid, total: sumTA.total, persen: sumTA.progressPercent },
  { label: 'Persiapan Yudisium', value: sumYudisium.valid, total: sumYudisium.total, persen: sumYudisium.progressPercent },
];

// --- Source: data-examiner.ts ---
export const examiner1 = {
  name: "Dr. Budi Harto",
  nidn: '221011401065',
  email: 'budi.harto@univ.ac.id',
};

export const examiner2 = {
  name: "Dr. Andi Wijaya",
  nidn: '221011401077',
  email: 'andi.wijaya@univ.ac.id',
};

export const ketuaSidang = {
  name: "Dr. Budi Harto",
  nidn: '221011401065',
  email: 'budi.harto@univ.ac.id',
};

export const agendaSidang = {
  agenda: "Sidang Proposal Tugas Akhir",
  tanggal: 'Senin, 4 Maret 2026',
  waktu: '09.00 - 10.00 WIB',
  ruang: 'Ruang Dosen 203',
  lokasi: 'Gedung Teknik Informatika',
};

export const agendaSidangKosong = {
  agenda: "-",
  tanggal: '-',
  waktu: '-',
  ruang: '-',
  lokasi: '-',
};

// --- Source: data-upload-status.ts ---
import type { ApprovalItem } from '../features/student/types/approval';

export const approvalSeminarProposal: ApprovalItem[] = [
  { label: "Pembimbing 1", status: 'fulfilled' },
  { label: 'Pembimbing 2', status: 'fulfilled' },
  { label: 'Final file Proposal Skripsi', status: 'fulfilled' },
  { label: 'Syarat & Ketentuan Seminar Proposal', status: 'fulfilled' },
  { label: 'Minimal Bimbingan (8x)', status: 'fulfilled', highlight: true },
];

export const approvalSidangAkhir: ApprovalItem[] = [
  { label: "Pembimbing 1", status: 'pending' },
  { label: 'Pembimbing 2', status: 'pending' },
  { label: 'Penguji 1', status: 'fulfilled' },
  { label: 'Penguji 2', status: 'fulfilled' },
  { label: 'Ketua Sidang', status: 'pending' },
  { label: 'Final file Proposal Skripsi', status: 'pending' },
  { label: 'Syarat & Ketentuan Sidang Akhir', status: 'pending' },
  { label: 'Minimal Bimbingan (8x)', status: 'pending', highlight: true },
];

export const approvalFinalisasi: ApprovalItem[] = [
  { label: "Pembimbing 1", status: 'pending' },
  { label: 'Pembimbing 2', status: 'pending' },
  { label: 'Penguji 1', status: 'pending' },
  { label: 'Penguji 2', status: 'pending' },
  { label: 'Ketua Sidang', status: 'pending' },
  { label: 'Final file Proposal Skripsi', status: 'pending' },
];

// --- Source: proposal-notes.ts ---
export type ProposalNote = {
  id: number;
  date: string;
  author: string;
  topic: string;
  note: string;
  status: "send" | 'revision' | 'approved';
};

export const proposalNotesMock: ProposalNote[] = [
  {
    id: 1,
    date: "12/12/2025",
    author: 'Mahasiswa Farmasi',
    topic: 'Bab 2 - Tinjauan Pustaka',
    note: 'Assalamu\'alaikum Bu, saya sudah revisi bagian latar belakang...',
    status: 'send',
  },
  {
    id: 2,
    date: '12/12/2025',
    author: 'Pembimbing 1',
    topic: 'Bab 2 - Latar Belakang',
    note: 'Latar belakangnya terlalu panjang...',
    status: 'revision',
  },
];

export const proposalNotesKosong: ProposalNote[] = [];
