import type { ApprovalItem } from "../features/student/types/approval";
import { AcademicStage, Roles } from "./enums";

export const upcomingAgendaMock = {
  agenda: "-",
  tanggal: "-",
  waktu: "-",
  ruang: "-",
  lokasi: "-",
};

export const supportingDocumentsMock: Array<{ title: string; description: string }> = [];

export const approvalProcessMocks: Array<{
  tahap: string;
  items: Array<{ label: string; status: "fulfilled" | "pending" }>;
}> = [];

export const profileDataMock: {
  id: string;
  name: string;
  nama: string;
  email: string;
  phone: string;
  role: typeof Roles[keyof typeof Roles];
  status: "Aktif" | "Nonaktif" | "Cuti" | "Lulus";
  statusTA: "Aktif" | "Tidak Aktif";
  tanggalLahir: string;
  nim: string;
  programStudi: string;
  angkatan: string;
  skemaTA: "Skripsi" | "Non Skripsi";
  tahapanAktif: typeof AcademicStage[keyof typeof AcademicStage];
  noHpWhatsapp: string;
} = {
  id: "",
  name: "",
  nama: "",
  email: "",
  phone: "",
  noHpWhatsapp: "",
  role: Roles.STUDENT,
  status: "Aktif",
  statusTA: "Aktif",
  tanggalLahir: "",
  nim: "",
  programStudi: "",
  angkatan: "",
  skemaTA: "Skripsi",
  tahapanAktif: AcademicStage.PENGAJUAN,
};

export const requirementProgressMock: Array<{
  label: string;
  value: number;
  total: number;
  persen: number;
}> = [];

export const examiner1 = { name: "-", nidn: "-", email: "-" };
export const examiner2 = { name: "-", nidn: "-", email: "-" };
export const ketuaSidang = { name: "-", nidn: "-", email: "-" };

export const agendaSidang = {
  agenda: "-",
  tanggal: "-",
  waktu: "-",
  ruang: "-",
  lokasi: "-",
};

export const agendaSidangKosong = agendaSidang;

export const approvalSeminarProposal: ApprovalItem[] = [];
export const approvalSidangAkhir: ApprovalItem[] = [];
export const approvalFinalisasi: ApprovalItem[] = [];

export type ProposalNote = {
  id: number;
  date: string;
  author: string;
  topic: string;
  note: string;
  status: "send" | "revision" | "approved";
};

export const proposalNotesMock: ProposalNote[] = [];
export const proposalNotesKosong: ProposalNote[] = [];
