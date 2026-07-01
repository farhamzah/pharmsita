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
  scheduleStatus?: "Terjadwal" | "Selesai" | "Dibatalkan";
  bimbinganMin?: number;
  hasGrade?: boolean;
  bimbinganCount?: number;
  revisiCount?: number;
  approveCount?: number;
  grade?: string;
  layakLanjut?: boolean;
}

export interface DocumentRecord {
  id: string;
  studentName: string;
  nim: string;
  title: string;
  fileName: string;
  link: string;
  status: "Selesai";
  tanggalSelesai: string;
}

export interface AttentionItem {
  studentName: string;
  topik: string;
  waktu: string;
}

export type GuidanceStatus = "send" | "revisi" | "approve";

export interface GuidanceActivity {
  id: string;
  date: string;
  author: string;
  role: "Mahasiswa" | "Dosen";
  message: string;
  status: GuidanceStatus;
  attachment?: string;
  topik?: string;
}

export interface AssessmentRecord {
  id: string;
  studentName: string;
  nim: string;
  tahap: "Seminar Proposal" | "Sidang Akhir";
  roleSaatMenilai: "Penguji 1" | "Penguji 2" | "Ketua Sidang";
  tanggal: string;
  catatan: string;
  checkedItems: string[];
}

export const supervisorOneData: StudentData[] = [];
export const supervisorTwoData: StudentData[] = [];
export const examinerOneData: StudentData[] = [];
export const examinerTwoData: StudentData[] = [];
export const chairmanData: StudentData[] = [];
export const alumniData: StudentData[] = [];
export const coordinatorStudentMock: StudentData[] = [];

export const dbStudents: any[] = [];
export const dbLecturerStudentRoles: any[] = [];
export const dbLecturers: any[] = [];
export const dbAgendas: any[] = [];
export const dbNotes: any[] = [];
export const dbAssessments: any[] = [];
export const dbValidations: any[] = [];

export const documentFinalData: DocumentRecord[] = [];
export const attentionItemsData: AttentionItem[] = [];
export const mockGuidanceData: GuidanceActivity[] = [];
export const assessmentHistoryData: AssessmentRecord[] = [];
