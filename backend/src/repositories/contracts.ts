import type {
  AcademicPeriod,
  ExamStage,
  ExamWorkflow,
  GuidanceStage,
  GuidanceWorkflow,
  FinalProjectRegistration,
  FinalProjectRegistrationStatus,
  GuidanceMaterial,
  GuidanceMaterialStatus,
  GuidanceRequest,
  GuidanceRequestStatus,
  LecturerDirectoryItem,
  CoordinatorLifecycleSummaryItem,
  SupervisorAssignment,
  GuidanceType,
  AuditExportAttempt,
  AuditExportAttemptFilter,
  AuditExportScope,
  AuditLog,
  AuditLogFilter,
  RequirementDefinition,
  RequirementBundle,
  RefreshTokenRecord,
  RevisionStage,
  RevisionWorkflow,
  CoordinatorLifecycleStageCode,
  SortDirection,
  StudentDirectoryItem,
  StudentDirectorySortBy,
  StepId,
  StepStatus,
  StudentStep,
  SupportingDocument,
  ThesisType,
  ThesisSubmission,
  UserAccount,
  UserRecord,
  UserRole,
} from "../domain/types";

export type Awaitable<T> = T | Promise<T>;

export interface AuditExportAttemptInput {
  id: string;
  actorId: string | null;
  actorRole: UserRole | null;
  scope: AuditExportScope;
  attemptedAt: string;
  windowStartedAt: string;
  maxAttempts: number;
  windowSeconds: number;
}

export interface AuditExportAttemptResult {
  attempt: AuditExportAttempt;
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface AuditExportAttemptCleanupInput {
  allowedBefore: string;
  blockedBefore: string;
  limit: number;
  dryRun?: boolean;
}

export interface AuditExportAttemptCleanupResult {
  deletedAllowed: number;
  deletedBlocked: number;
}

export interface UserRepository {
  list(): Awaitable<UserAccount[]>;
  listLecturerDirectory(): Awaitable<LecturerDirectoryItem[]>;
  updateLecturerQuota(
    lecturerId: string,
    input: { quotaLimit: number; actorId: string; timestamp: string }
  ): Awaitable<LecturerDirectoryItem | null>;
  listCoordinatorLifecycleSummary(): Awaitable<CoordinatorLifecycleSummaryItem[]>;
    listStudentDirectory(options?: {
      lecturerId?: string | null;
      stage?: CoordinatorLifecycleStageCode | null;
      q?: string | null;
      page?: number;
      limit?: number;
      sortBy?: StudentDirectorySortBy;
      sortDir?: SortDirection;
    }): Awaitable<{
      data: StudentDirectoryItem[];
      meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        sortBy: StudentDirectorySortBy;
        sortDir: SortDirection;
      };
    }>;
    replaceAll(users: UserAccount[]): Awaitable<UserAccount[]>;
    createUser(
      input: Omit<UserAccount, "id"> & {
        id?: string;
        password?: string;
        actorId: string;
        timestamp: string;
      }
    ): Awaitable<UserAccount>;
    updateUser(
      userId: string,
      input: Partial<Omit<UserAccount, "id">> & {
        password?: string;
        actorId: string;
        timestamp: string;
      }
    ): Awaitable<UserAccount | null>;
    updateStatus(
      userId: string,
      input: {
        status: UserAccount["status"];
        actorId: string;
        timestamp: string;
      }
    ): Awaitable<UserAccount | null>;
    resetPassword(
      userId: string,
      input: {
        password: string;
        actorId: string;
        timestamp: string;
      }
    ): Awaitable<UserAccount | null>;
    findById(id: string): Awaitable<UserAccount | null>;
  findByIdentifier(identifier: string): Awaitable<UserAccount | null>;
  findAuthRecordById(id: string): Awaitable<UserRecord | null>;
  findAuthRecordByIdentifier(identifier: string): Awaitable<UserRecord | null>;
  touchLastLogin(userId: string, timestamp: string): Awaitable<UserAccount | null>;
  updateProfile(
    userId: string,
    input: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      gender?: UserAccount["gender"];
      birthDate?: string;
      nim?: string;
      programStudi?: string;
      angkatan?: string;
      kelas?: string;
      skemaTA?: UserAccount["skemaTA"];
      jenisTA?: string;
      nidn?: string;
      bidangKeahlian?: string[];
      jabatanAkademik?: string;
      peranSistem?: string[];
      jabatan?: string;
      hakAksesUtama?: string[];
      divisi?: string;
      tingkatAkses?: UserAccount["tingkatAkses"];
      cakupanAkses?: string[];
      actorId: string;
      timestamp: string;
    }
  ): Awaitable<UserAccount | null>;
  getRoles(userId: string): Awaitable<UserRole[]>;
  completeFirstLogin(
    userId: string,
    passwordHash: string,
    completedAt: string
  ): Awaitable<UserAccount | null>;
  getPermissions(role: UserRole): Awaitable<string[]>;
}

export interface RefreshTokenRepository {
  create(record: RefreshTokenRecord): Awaitable<RefreshTokenRecord>;
  findActiveByHash(tokenHash: string, nowIso: string): Awaitable<RefreshTokenRecord | null>;
  revokeByHash(tokenHash: string, revokedAt: string): Awaitable<RefreshTokenRecord | null>;
  revokeAllForUser(userId: string, revokedAt: string): Awaitable<RefreshTokenRecord[]>;
}

export interface AuditLogRepository {
  list(filter?: AuditLogFilter | number): Awaitable<AuditLog[]>;
  count(filter?: AuditLogFilter | number): Awaitable<number>;
  create(record: AuditLog): Awaitable<AuditLog>;
  recordExportAttempt(
    input: AuditExportAttemptInput
  ): Awaitable<AuditExportAttemptResult>;
  listExportAttempts(filter?: AuditExportAttemptFilter): Awaitable<AuditExportAttempt[]>;
  countExportAttempts(filter?: AuditExportAttemptFilter): Awaitable<number>;
  cleanupExportAttempts(
    input: AuditExportAttemptCleanupInput
  ): Awaitable<AuditExportAttemptCleanupResult>;
}

export interface MasterDataRepository {
  listAcademicPeriods(): Awaitable<AcademicPeriod[]>;
  replaceAcademicPeriods(records: AcademicPeriod[]): Awaitable<AcademicPeriod[]>;
  listThesisTypes(): Awaitable<ThesisType[]>;
  replaceThesisTypes(records: ThesisType[]): Awaitable<ThesisType[]>;
  listSupportingDocuments(): Awaitable<SupportingDocument[]>;
  replaceSupportingDocuments(records: SupportingDocument[]): Awaitable<SupportingDocument[]>;
  listRequirementDefinitions(filter?: { tahap?: string | null }): Awaitable<RequirementDefinition[]>;
  replaceRequirementDefinitions(records: RequirementDefinition[]): Awaitable<RequirementDefinition[]>;
}

export interface StudentWorkflowRepository {
  getProgressSteps(studentId: string): Awaitable<StudentStep[]>;
  updateProgressStep(studentId: string, stepId: StepId, status: StepStatus): Awaitable<StudentStep[]>;
  resetProgressSteps(studentId: string): Awaitable<StudentStep[]>;
  getInitialRequirements(studentId: string): Awaitable<RequirementBundle>;
  saveInitialRequirements(studentId: string, bundle: RequirementBundle): Awaitable<RequirementBundle>;
  getStageRequirements(studentId: string, stageId: string): Awaitable<RequirementBundle>;
  saveStageRequirements(studentId: string, stageId: string, bundle: RequirementBundle): Awaitable<RequirementBundle>;
  listThesisSubmissions(studentId: string): Awaitable<ThesisSubmission[]>;
  replaceThesisSubmissions(studentId: string, submissions: ThesisSubmission[]): Awaitable<ThesisSubmission[]>;
  getGuidance(studentId: string, stageId: GuidanceStage): Awaitable<GuidanceWorkflow>;
  updateGuidance(studentId: string, stageId: GuidanceStage, mutator: (workflow: GuidanceWorkflow) => void): Awaitable<GuidanceWorkflow>;
  resetGuidance(studentId: string, stageId: GuidanceStage): Awaitable<GuidanceWorkflow>;
  getExam(studentId: string, stageId: ExamStage): Awaitable<ExamWorkflow>;
  updateExam(studentId: string, stageId: ExamStage, mutator: (workflow: ExamWorkflow) => void): Awaitable<ExamWorkflow>;
  resetExam(studentId: string, stageId: ExamStage): Awaitable<ExamWorkflow>;
  getRevision(studentId: string, stageId: RevisionStage): Awaitable<RevisionWorkflow>;
  updateRevision(studentId: string, stageId: RevisionStage, mutator: (workflow: RevisionWorkflow) => void): Awaitable<RevisionWorkflow>;
  resetRevision(studentId: string, stageId: RevisionStage): Awaitable<RevisionWorkflow>;
}

export interface FinalProjectRegistrationListResult {
  data: FinalProjectRegistration[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FinalProjectRegistrationSaveInput {
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
  submit: boolean;
  actorId: string;
  timestamp: string;
}

export interface FinalProjectRegistrationValidationInput {
  status: Extract<FinalProjectRegistrationStatus, "Disetujui" | "Ditolak">;
  coordinatorNote?: string;
  supervisorAssignments?: SupervisorAssignment[];
  actorId: string;
  timestamp: string;
}

export interface FinalProjectRegistrationRepository {
  getActiveByStudentId(studentId: string): Awaitable<FinalProjectRegistration | null>;
  findById(id: string): Awaitable<FinalProjectRegistration | null>;
  list(filter?: {
    status?: FinalProjectRegistrationStatus | null;
    q?: string | null;
    page?: number;
    limit?: number;
  }): Awaitable<FinalProjectRegistrationListResult>;
  saveStudentRegistration(
    studentId: string,
    input: FinalProjectRegistrationSaveInput
  ): Awaitable<FinalProjectRegistration>;
  validateRegistration(
    registrationId: string,
    input: FinalProjectRegistrationValidationInput
  ): Awaitable<FinalProjectRegistration | null>;
  replaceSupervisorAssignmentsByStudentId(
    studentId: string,
    assignments: SupervisorAssignment[],
    input: {
      actorId: string;
      timestamp: string;
      coordinatorNote?: string;
    }
  ): Awaitable<FinalProjectRegistration | null>;
}

export interface GuidanceRequestSaveInput {
  guidanceType: GuidanceType;
  googleDocsLink: string;
  studentNote?: string;
  actorId: string;
  timestamp: string;
}

export interface GuidanceRequestValidationInput {
  status: Extract<GuidanceRequestStatus, "Disetujui" | "Ditolak">;
  lecturerNote?: string;
  actorId: string;
  timestamp: string;
}

export interface GuidanceMaterialSubmissionInput {
  materialType: GuidanceMaterial["materialType"];
  sourceRevisionItemId?: string | null;
  topic: string;
  content?: string;
  actorId: string;
  timestamp: string;
}

export interface GuidanceMaterialValidationInput {
  status: Extract<GuidanceMaterialStatus, "Valid" | "Ditolak">;
  lecturerNote?: string;
  actorId: string;
  timestamp: string;
}

export interface GuidanceRequestRepository {
  listForStudent(studentId: string): Awaitable<GuidanceRequest[]>;
  findById(id: string): Awaitable<GuidanceRequest | null>;
  getForStudent(studentId: string, id: string): Awaitable<GuidanceRequest | null>;
  createForStudent(
    studentId: string,
    input: GuidanceRequestSaveInput
  ): Awaitable<GuidanceRequest>;
  listForLecturer(lecturerId: string): Awaitable<GuidanceRequest[]>;
  validateRequest(
    id: string,
    input: GuidanceRequestValidationInput
  ): Awaitable<GuidanceRequest | null>;
  listMaterials(id: string): Awaitable<GuidanceMaterial[]>;
  submitMaterial(
    id: string,
    input: GuidanceMaterialSubmissionInput
  ): Awaitable<GuidanceMaterial | null>;
  validateMaterial(
    materialId: string,
    input: GuidanceMaterialValidationInput
  ): Awaitable<GuidanceMaterial | null>;
}

export interface RepositoryRegistry {
  userRepository: UserRepository;
  masterDataRepository: MasterDataRepository;
  refreshTokenRepository: RefreshTokenRepository;
  auditLogRepository: AuditLogRepository;
  studentWorkflowRepository: StudentWorkflowRepository;
  finalProjectRegistrationRepository: FinalProjectRegistrationRepository;
  guidanceRequestRepository: GuidanceRequestRepository;
}
