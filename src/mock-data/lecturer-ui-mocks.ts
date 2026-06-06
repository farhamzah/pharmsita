
// --- Source: database-mock.ts ---
import { mockStudents } from './students';
import { mockTheses, mockLecturerStudentRoles } from './theses';
import { mockLecturers } from './lecturers';
import { mockAgendas } from './agendas';
import { mockNotes, mockAssessments, mockValidations } from './notes';

// Adapter to maintain compatibility with existing components
export const dbStudents = mockStudents.map(student => {
  const thesis = mockTheses.find(t => t.mahasiswaId === student.id);
  return {
    ...student,
    nama: student.nama, // alias
    judulTA: thesis?.judul || '-',
    tahapanAktif: thesis?.tahapanAktif || '-',
    statusUmum: thesis?.statusUmum || '-',
    fileSkripsi: thesis?.fileSkripsi || '-',
    linkSkripsi: thesis?.linkSkripsi || '-',
  };
});

export const dbLecturerStudentRoles = mockLecturerStudentRoles;
export const dbLecturers = mockLecturers;
export const dbAgendas = mockAgendas;
export const dbNotes = mockNotes;
export const dbAssessments = mockAssessments;
export const dbValidations = mockValidations;


// --- Source: lecturer-data.ts ---
export * from './ui-mocks';

export interface StudentData {
  id: string;
  name: string;
  nim: string;
  title: string;
  status: string;
  tahapan?: string;
  scheduleDate?: string;
  scheduleTime?: string;
  scheduleRoom?: string;
  scheduleLocation?: string;
  scheduleStatus?: 'Terjadwal' | 'Selesai' | 'Dibatalkan';
  bimbinganMin?: number;
  hasGrade?: boolean;
  bimbinganCount?: number;
  revisiCount?: number;
  approveCount?: number;
  grade?: string;
  layakLanjut?: boolean;
}

// Preserving DocumentRecord, GuidanceActivity interfaces and their mocks if they are specific here
export interface DocumentRecord {
  id: string;
  studentName: string;
  nim: string;
  title: string;
  fileName: string;
  link: string;
  status: 'Selesai';
  tanggalSelesai: string;
}

export const documentFinalData: DocumentRecord[] = [
  {
    id: 'd1',
    studentName: 'Alvin Pratama',
    nim: '998877665',
    title: 'Implementasi Algoritma Dijkstra pada Pencarian Rute Terpendek',
    fileName: 'Skripsi_Final_Alvin.pdf',
    link: 'https://docs.google.com/document/d/...',
    status: 'Selesai',
    tanggalSelesai: '30 September 2026'
  }
];

export interface AttentionItem {
  studentName: string;
  topik: string;
  waktu: string;
}

export const attentionItemsData: AttentionItem[] = [
  { studentName: 'Budi Santoso', topik: 'Revisi Bab 3', waktu: '2 jam yang lalu' },
  { studentName: 'Andi Wijaya', topik: 'Draft Metodologi', waktu: '1 hari yang lalu' }
];

export type GuidanceStatus = 'send' | 'revisi' | 'approve';

export interface GuidanceActivity {
  id: string;
  date: string;
  author: string;
  role: 'Mahasiswa' | 'Dosen';
  message: string;
  status: GuidanceStatus;
  attachment?: string;
  topik?: string;
}

export const mockGuidanceData: GuidanceActivity[] = [
  { id: 'g1', date: '10 Okt 2026, 10:00', author: 'Budi Santoso', role: 'Mahasiswa', message: 'Selamat pagi pak, saya mengirimkan draft Bab 1 dan 2.', status: 'send', attachment: 'Draft_Bab_1_2_Budi.pdf', topik: 'Bab 1' },
];

export interface AssessmentRecord {
  id: string;
  studentName: string;
  nim: string;
  tahap: 'Seminar Proposal' | 'Sidang Akhir';
  roleSaatMenilai: 'Penguji 1' | 'Penguji 2' | 'Ketua Sidang';
  tanggal: string;
  catatan: string;
  checkedItems: string[];
}

export const assessmentHistoryData: AssessmentRecord[] = [
  { id: 'a1', studentName: 'Dodi Permana', nim: '445566778', tahap: 'Seminar Proposal', roleSaatMenilai: 'Penguji 1', tanggal: '15 Oktober 2026', catatan: 'Perbaiki bab 2', checkedItems: ['Kedisiplinan_Rutin bimbingan'] }
];

