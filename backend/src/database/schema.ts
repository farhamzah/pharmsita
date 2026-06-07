import type {
  AcademicPeriod,
  AuditExportAttempt,
  AuditLog,
  ExamStage,
  ExamWorkflow,
  GuidanceStage,
  GuidanceWorkflow,
  FinalProjectRegistration,
  GuidanceMaterial,
  GuidanceRequest,
  RequirementDefinition,
  RequirementBundle,
  RevisionStage,
  RevisionWorkflow,
  StudentStep,
  SupportingDocument,
  ThesisType,
  ThesisSubmission,
  UserAccount,
  RefreshTokenRecord,
  UserRecord,
  UserRole,
  UserRoleAssignment,
} from "../domain/types";

export interface MasterDataState {
  academicPeriods: AcademicPeriod[];
  thesisTypes: ThesisType[];
  supportingDocuments: SupportingDocument[];
  requirements: RequirementDefinition[];
}

export interface StudentWorkflowState {
  progressSteps: Omit<StudentStep, "isLocked">[];
  requirements: {
    initial: RequirementBundle;
    stages: Record<string, RequirementBundle>;
  };
  thesisSubmissions: ThesisSubmission[];
  guidance: Record<GuidanceStage, GuidanceWorkflow>;
  exams: Record<ExamStage, ExamWorkflow>;
  revisions: Record<RevisionStage, RevisionWorkflow>;
}

export interface LecturerProfileState {
  userId: string;
  nidn?: string;
  expertise?: string;
  quotaLimit: number;
  updatedAt?: string;
  updatedBy?: string;
}

export type GuidanceRequestState = Omit<
  GuidanceRequest,
  "materialSummary" | "materials"
>;

export interface DatabaseState {
  schemaVersion: 9;
  users: UserRecord[];
  userRoles: UserRoleAssignment[];
  lecturerProfiles: Record<string, LecturerProfileState>;
  refreshTokens: RefreshTokenRecord[];
  auditLogs: AuditLog[];
  auditExportAttempts: AuditExportAttempt[];
  finalProjectRegistrations: FinalProjectRegistration[];
  guidanceRequests: GuidanceRequestState[];
  guidanceMaterials: GuidanceMaterial[];
  permissionsByRole: Record<UserRole, string[]>;
  masterData: MasterDataState;
  studentWorkflows: Record<string, StudentWorkflowState>;
  // Legacy fallback for databases created before workflow data was scoped by student.
  studentWorkflow: StudentWorkflowState;
}

export interface DatabaseAdapter {
  read(): DatabaseState;
  write(nextState: DatabaseState): DatabaseState;
  update(mutator: (state: DatabaseState) => void): DatabaseState;
}
