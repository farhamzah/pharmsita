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
  password?: string;
  phone?: string;
  address?: string;
  gender?: "Laki-laki" | "Perempuan";
  birthDate?: string;
  nim?: string;
  programStudi?: string;
  angkatan?: string;
  kelas?: string;
  skemaTA?: "Skripsi" | "Non Skripsi";
  jenisTA?: string;
  nidn?: string;
  bidangKeahlian?: string[];
  jabatanAkademik?: string;
  peranSistem?: string[];
  jabatan?: string;
  hakAksesUtama?: string[];
  divisi?: string;
  tingkatAkses?: "Superadmin" | "Admin Prodi";
  cakupanAkses?: string[];
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

export interface AuditLogFilter {
  limit?: number;
  offset?: number;
  action?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  actorRole?: UserRole | null;
  createdFrom?: string | null;
  createdTo?: string | null;
}

export type AuditExportScope = "admin" | "koordinator";

export interface AuditExportAttempt {
  id: string;
  actorId: string | null;
  actorRole: UserRole | null;
  scope: AuditExportScope;
  attemptedAt: string;
  allowed: boolean;
  windowStartedAt: string;
  attemptsInWindow: number;
  maxAttempts: number;
  windowSeconds: number;
}

export interface AuditExportAttemptFilter {
  limit?: number;
  offset?: number;
  scope?: AuditExportScope | null;
  actorRole?: UserRole | null;
  allowed?: boolean | null;
  createdFrom?: string | null;
  createdTo?: string | null;
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

export interface StudentDirectoryItem {
  id: string;
  name: string;
  identifier: string;
  email?: string;
  status: UserStatus;
  nim?: string;
  programStudi?: string;
  angkatan?: string;
  kelas?: string;
  thesisTitle?: string;
  activeStepId?: StepId | null;
  activeStepLabel: string;
  activeStepStatus?: StepStatus | null;
  isCompleted: boolean;
  supervisor1Id?: string | null;
  supervisor1Name?: string;
  supervisor2Id?: string | null;
  supervisor2Name?: string;
  supervisorRole?: "pembimbing-1" | "pembimbing-2" | null;
}

export interface LecturerDirectoryItem {
  id: string;
  name: string;
  identifier: string;
  email?: string;
  status: UserStatus;
  nidn?: string;
  expertise?: string;
  programStudi?: string;
  jabatan?: string;
  quotaLimit: number;
  p1Active: number;
  p2Active: number;
  completedCount: number;
}

export type GuidanceStage = "bimbingan-pra-proposal" | "bimbingan-pra-sidang";
export type GuidanceType =
  | "seminar-proposal"
  | "sidang-akhir"
  | "revisi-seminar-proposal"
  | "revisi-sidang-akhir";
export type GuidanceRequestStatus =
  | "Draft"
  | "Menunggu Validasi Dosen"
  | "Disetujui"
  | "Ditolak";
export type GuidanceMaterialStatus = "Draft" | "Diajukan" | "Valid" | "Ditolak";
export type GuidanceSessionStatus = "pending" | "in progress" | "approved";
export type GuidanceScheduleStatus = "idle" | "requested" | "approved";

export interface GuidanceMaterial {
  id: string;
  guidanceRequestId: string;
  materialType: "normal" | "revision";
  sourceRevisionItemId?: string | null;
  topic: string;
  content?: string;
  status: GuidanceMaterialStatus;
  attemptNumber: number;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  lecturerNote?: string;
  attemptSummary?: {
    totalAttempts: number;
    latestAttemptNumber: number;
    latestMaterialId: string;
    latestStatus: GuidanceMaterialStatus;
    isLatestAttempt: boolean;
    hasRejectedAttempt: boolean;
    latestRejectedNote?: string;
    latestRejectedAt?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface GuidanceRequest {
  id: string;
  studentId: string;
  guidanceType: GuidanceType;
  googleDocsLink: string;
  status: GuidanceRequestStatus;
  studentNote?: string;
  lecturerNote?: string;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  activeLecturerId?: string | null;
  activeLecturerName?: string;
  materialSummary: {
    validCount: number;
    requiredValidCount: number;
    pendingCount: number;
    rejectedCount: number;
    canSubmitNextGate: boolean;
  };
  materials: GuidanceMaterial[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

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
  sourceRevisionItemId?: string;
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

export type RevisionCompletionGateAction = "final-upload" | "progress-completion";

export interface RevisionCompletionGateCheck {
  code:
    | "REVISION_ITEMS_AVAILABLE"
    | "REVISION_ITEMS_DONE"
    | "PENGUJI_1_APPROVED"
    | "PENGUJI_2_APPROVED"
    | "CHAIR_APPROVED"
    | "FINAL_FILE_UPLOADED";
  label: string;
  passed: boolean;
  detail: string;
  requiredFor: RevisionCompletionGateAction[];
}

export interface RevisionCompletionGateStatus {
  stageId: RevisionStage;
  readyForFinalUpload: boolean;
  readyForProgressCompletion: boolean;
  finalFile: string | null;
  finalUploadBlockingReasons: string[];
  progressCompletionBlockingReasons: string[];
  blockingReasons: string[];
  checks: RevisionCompletionGateCheck[];
  evaluatedAt: string;
}
