import type {
  AcademicPeriod,
  AuditLog,
  ExamStage,
  ExamWorkflow,
  GuidanceStage,
  GuidanceWorkflow,
  FinalProjectRegistration,
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

export interface DatabaseState {
  schemaVersion: 7;
  users: UserRecord[];
  userRoles: UserRoleAssignment[];
  refreshTokens: RefreshTokenRecord[];
  auditLogs: AuditLog[];
  finalProjectRegistrations: FinalProjectRegistration[];
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
