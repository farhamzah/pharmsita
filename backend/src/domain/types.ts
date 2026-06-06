export type UserRole = "mahasiswa" | "dosen" | "admin" | "koordinator";
export type UserStatus = "Aktif" | "Nonaktif";

export interface UserSummary {
  id: string;
  role: UserRole;
  name: string;
  identifier: string;
  email?: string;
  status: UserStatus;
}

export interface UserAccount extends UserSummary {
  passwordStatus?: "active" | "needs_activation" | "reset_requested";
  forceChangeOnLogin?: boolean;
  lastLoginAt?: string | null;
  firstLoginCompletedAt?: string | null;
  passwordChangedAt?: string | null;
}

export interface UserRecord extends UserAccount {
  passwordHash: string;
}

export interface UserRoleAssignment {
  userId: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  createdBy?: string | null;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  role?: UserRole;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: UserRole | null;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  createdAt: string;
}

export interface AcademicPeriod {
  id: string;
  name: string;
  semester: "Ganjil" | "Genap";
  startDate: string;
  endDate: string;
  status: "Aktif" | "Selesai" | "Nonaktif";
}

export interface ThesisType {
  id: string;
  name: string;
  skema: "Skripsi" | "Non Skripsi";
  desc?: string;
  status: "Aktif" | "Nonaktif";
}

export interface SupportingDocument {
  id: string;
  name: string;
  description?: string;
  allowedTypes: string[];
  isRequired: "Wajib" | "Opsional";
  status: "Aktif" | "Nonaktif";
}

export interface RequirementDefinition {
  id: string;
  tahap: "Persyaratan Awal" | "Seminar Proposal" | "Sidang Akhir" | "Yudisium";
  namaPersyaratan: string;
  deskripsiAturan?: string;
  wajib: boolean;
  status: "Aktif" | "Nonaktif";
}

export type RequirementStatus =
  | "Valid"
  | "Menunggu Verifikasi"
  | "Perlu Revisi"
  | "Belum Upload"
  | "Ditolak";

export interface RequirementItem {
  id: string;
  label: string;
  status: RequirementStatus;
  wajib?: boolean;
  catatanKoordinator?: string;
}

export interface RequirementBundle {
  requirements: RequirementItem[];
  driveLink: string;
}

export interface ThesisSubmission {
  id: string;
  date: string;
  skema: "Skripsi" | "Non Skripsi";
  jenisTA: string;
  judulTA: string;
  deskripsiTA: string;
  pembimbing1: string;
  pembimbing2: string;
  status: "Sedang Proses Validasi" | "Diterima" | "Ditolak";
  catatanKoordinator?: string;
  buktiFile?: string;
}

export type FinalProjectRegistrationStatus =
  | "Draft"
  | "Menunggu Validasi Koordinator"
  | "Disetujui"
  | "Ditolak";

export interface FinalProjectRegistrationRequirement {
  id: string;
  requirementDefinitionId?: string | null;
  requirementKey?: string;
  label: string;
  wajib: boolean;
  status: RequirementStatus;
  fileRef?: string;
  linkBerkas?: string;
  catatanMahasiswa?: string;
  catatanKoordinator?: string;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

export interface SupervisorAssignment {
  id: string;
  lecturerId?: string | null;
  supervisorOrder: 1 | 2;
  lecturerName: string;
  lecturerIdentifier?: string;
  status: "Aktif" | "Nonaktif";
  assignedAt: string;
  assignedBy?: string | null;
  coordinatorNote?: string;
}

export interface FinalProjectRegistration {
  id: string;
  studentId: string;
  academicPeriodId?: string | null;
  requirementDriveLink: string;
  paymentProofFileRef?: string;
  paymentProofLink?: string;
  skema?: "Skripsi" | "Non Skripsi";
  thesisTypeId?: string | null;
  thesisTypeName?: string;
  judulTA?: string;
  deskripsiTA?: string;
  requestedSupervisor1Id?: string | null;
  requestedSupervisor1Name?: string;
  status: FinalProjectRegistrationStatus;
  coordinatorNote?: string;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  createdAt?: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
  requirements: FinalProjectRegistrationRequirement[];
  supervisorAssignments: SupervisorAssignment[];
}

export type StepId =
  | "pendaftaran-ta"
  | "bimbingan-pra-proposal"
  | "sidang-proposal"
  | "revisi-proposal"
  | "bimbingan-pra-sidang"
  | "sidang"
  | "revisi-sidang";

export type StepStatus = "pending" | "active" | "completed";

export interface StudentStep {
  id: StepId;
  order: number;
  label: string;
  description: string;
  status: StepStatus;
  isLocked: boolean;
}

export type GuidanceStage = "bimbingan-pra-proposal" | "bimbingan-pra-sidang";
export type GuidanceSessionStatus = "pending" | "in progress" | "approved";
export type GuidanceScheduleStatus = "idle" | "requested" | "approved";

export interface GuidanceSession {
  id: number;
  title: string;
  status: GuidanceSessionStatus;
  chats: { id: string; senderName: string; senderRole: "mahasiswa" | "dosen"; message: string; timestamp: string }[];
  sessionStatus: GuidanceScheduleStatus;
  sessionStartDate: string | null;
  sessionStartTime: string | null;
  catatanMahasiswa?: string;
  catatanKoordinator?: string;
}

export interface GuidanceWorkflow {
  stageId: GuidanceStage;
  googleDocsLink: string;
  finalFile: string | null;
  pembimbing1Approved: boolean;
  pembimbing2Approved: boolean;
  guidanceStatus: GuidanceScheduleStatus;
  guidanceRequestedAt: string | null;
  guidanceApprovedAt: string | null;
  guidanceStartDate: string | null;
  guidanceTime: string | null;
  guidanceNote: string | null;
  guidanceApprovalNote: string | null;
  sessions: GuidanceSession[];
}

export type ExamStage = "sidang-proposal" | "sidang";
export type ExamStatus = "belum-daftar" | "menunggu-jadwal" | "terjadwal" | "selesai";
export type ExamResultStatus =
  | "belum-dinilai"
  | "lulus"
  | "lulus-dengan-revisi"
  | "tidak-lulus";

export interface ExamWorkflow {
  stageId: ExamStage;
  status: ExamStatus;
  googleDocsLink: string;
  submittedAt: string | null;
  grade: string | null;
  resultStatus: ExamResultStatus;
  revisionNotes: string[];
  requirements: { id: string; label: string; fulfilled: boolean; note?: string }[];
  panelists: { id: string; role: string; roleLabel: string; name: string; nidn: string; approved: boolean }[];
  schedule: { tanggal: string; waktu: string; ruang: string; lokasi: string } | null;
}

export type RevisionStage = "revisi-proposal" | "revisi-sidang";
export type RevisionItemStatus = "pending" | "in progress" | "done";
export type ChairApprovalStatus = "pending" | "approved" | "rejected";

export interface RevisionItem {
  id: number;
  title: string;
  topik: string;
  materi: string;
  assignedTo: string;
  status: RevisionItemStatus;
  chats: { id: string; senderName: string; senderRole: "mahasiswa" | "dosen"; message: string; timestamp: string }[];
  submittedAt?: string;
  penyelesaian?: string;
  penyelesaianLink?: string;
}

export interface RevisionWorkflow {
  stageId: RevisionStage;
  finalFile: string | null;
  penguji1Approved: boolean;
  penguji2Approved: boolean;
  ketuaSidangStatus: ChairApprovalStatus;
  submittedAt: string | null;
  items: RevisionItem[];
}
