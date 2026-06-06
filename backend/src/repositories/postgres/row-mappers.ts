import type {
  AcademicPeriod,
  AuditLog,
  FinalProjectRegistration,
  FinalProjectRegistrationRequirement,
  FinalProjectRegistrationStatus,
  RequirementDefinition,
  RefreshTokenRecord,
  SupportingDocument,
  SupervisorAssignment,
  ThesisType,
  UserAccount,
  UserRecord,
  UserRole,
} from "../../domain/types";

export const toIso = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

export interface UserRow {
  id: string;
  role: UserRole;
  identifier: string;
  name: string;
  email: string | null;
  status: "Aktif" | "Nonaktif";
  password_hash: string;
  password_status: UserAccount["passwordStatus"];
  force_change_on_login: boolean;
  last_login_at: Date | string | null;
  first_login_completed_at: Date | string | null;
  password_changed_at: Date | string | null;
}

export const toUserRecord = (row: UserRow): UserRecord => ({
  id: row.id,
  role: row.role,
  identifier: row.identifier,
  name: row.name,
  email: row.email || undefined,
  status: row.status,
  passwordHash: row.password_hash,
  passwordStatus: row.password_status,
  forceChangeOnLogin: row.force_change_on_login,
  lastLoginAt: toIso(row.last_login_at),
  firstLoginCompletedAt: toIso(row.first_login_completed_at),
  passwordChangedAt: toIso(row.password_changed_at),
});

export const toUserAccount = (row: UserRow): UserAccount => {
  const { passwordHash: _passwordHash, ...account } = toUserRecord(row);
  return account;
};

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  created_at: Date | string;
  role: UserRole | null;
}

export const toRefreshTokenRecord = (row: RefreshTokenRow): RefreshTokenRecord => ({
  id: row.id,
  userId: row.user_id,
  tokenHash: row.token_hash,
  role: row.role || undefined,
  expiresAt: toIso(row.expires_at) || "",
  revokedAt: toIso(row.revoked_at),
  createdAt: toIso(row.created_at) || "",
});

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_role: AuditLog["actorRole"];
  action: string;
  resource_type: string;
  resource_id: string;
  before_payload: unknown;
  after_payload: unknown;
  reason: string | null;
  created_at: Date | string;
}

export const toAuditLog = (row: AuditLogRow): AuditLog => ({
  id: row.id,
  actorId: row.actor_id,
  actorRole: row.actor_role,
  action: row.action,
  resourceType: row.resource_type,
  resourceId: row.resource_id,
  before: row.before_payload ?? undefined,
  after: row.after_payload ?? undefined,
  reason: row.reason || undefined,
  createdAt: toIso(row.created_at) || "",
});

export interface AcademicPeriodRow {
  id: string;
  name: string;
  semester: AcademicPeriod["semester"];
  start_date: Date | string;
  end_date: Date | string;
  status: AcademicPeriod["status"];
}

export const toAcademicPeriod = (row: AcademicPeriodRow): AcademicPeriod => ({
  id: row.id,
  name: row.name,
  semester: row.semester,
  startDate: toDateOnly(row.start_date),
  endDate: toDateOnly(row.end_date),
  status: row.status,
});

export interface ThesisTypeRow {
  id: string;
  name: string;
  skema: ThesisType["skema"];
  description: string | null;
  status: ThesisType["status"];
}

export const toThesisType = (row: ThesisTypeRow): ThesisType => ({
  id: row.id,
  name: row.name,
  skema: row.skema,
  desc: row.description || undefined,
  status: row.status,
});

export interface SupportingDocumentRow {
  id: string;
  name: string;
  description: string | null;
  allowed_types: unknown;
  is_required: SupportingDocument["isRequired"];
  status: SupportingDocument["status"];
}

export const toSupportingDocument = (
  row: SupportingDocumentRow
): SupportingDocument => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  allowedTypes: toStringArray(row.allowed_types),
  isRequired: row.is_required,
  status: row.status,
});

export interface RequirementDefinitionRow {
  id: string;
  tahap: RequirementDefinition["tahap"];
  nama_persyaratan: string;
  deskripsi_aturan: string | null;
  wajib: boolean;
  status: RequirementDefinition["status"];
}

export const toRequirementDefinition = (
  row: RequirementDefinitionRow
): RequirementDefinition => ({
  id: row.id,
  tahap: row.tahap,
  namaPersyaratan: row.nama_persyaratan,
  deskripsiAturan: row.deskripsi_aturan || undefined,
  wajib: row.wajib,
  status: row.status,
});

export interface FinalProjectRegistrationRow {
  id: string;
  student_id: string;
  academic_period_id: string | null;
  requirement_drive_link: string;
  payment_proof_file_ref: string | null;
  payment_proof_link: string | null;
  skema: "Skripsi" | "Non Skripsi" | null;
  thesis_type_id: string | null;
  thesis_type_name_snapshot: string | null;
  judul_ta: string | null;
  deskripsi_ta: string | null;
  requested_supervisor1_id: string | null;
  requested_supervisor1_name_snapshot: string | null;
  status: FinalProjectRegistrationStatus;
  coordinator_note: string | null;
  submitted_at: Date | string | null;
  validated_at: Date | string | null;
  validated_by: string | null;
  created_at: Date | string;
  created_by: string | null;
  updated_at: Date | string | null;
  updated_by: string | null;
}

export interface FinalProjectRegistrationRequirementRow {
  id: string;
  registration_id: string;
  requirement_definition_id: string | null;
  requirement_key: string | null;
  label_snapshot: string;
  wajib: boolean;
  status: FinalProjectRegistrationRequirement["status"];
  file_ref: string | null;
  link_berkas: string | null;
  catatan_mahasiswa: string | null;
  catatan_koordinator: string | null;
  uploaded_at: Date | string | null;
  verified_at: Date | string | null;
  verified_by: string | null;
}

export interface SupervisorAssignmentRow {
  id: string;
  registration_id: string;
  lecturer_id: string | null;
  supervisor_order: 1 | 2;
  lecturer_name_snapshot: string;
  lecturer_identifier_snapshot: string | null;
  status: SupervisorAssignment["status"];
  assigned_at: Date | string;
  assigned_by: string | null;
  coordinator_note: string | null;
}

export const toFinalProjectRegistrationBase = (
  row: FinalProjectRegistrationRow
): FinalProjectRegistration => ({
  id: row.id,
  studentId: row.student_id,
  academicPeriodId: row.academic_period_id,
  requirementDriveLink: row.requirement_drive_link,
  paymentProofFileRef: row.payment_proof_file_ref || undefined,
  paymentProofLink: row.payment_proof_link || undefined,
  skema: row.skema || undefined,
  thesisTypeId: row.thesis_type_id,
  thesisTypeName: row.thesis_type_name_snapshot || undefined,
  judulTA: row.judul_ta || undefined,
  deskripsiTA: row.deskripsi_ta || undefined,
  requestedSupervisor1Id: row.requested_supervisor1_id,
  requestedSupervisor1Name: row.requested_supervisor1_name_snapshot || undefined,
  status: row.status,
  coordinatorNote: row.coordinator_note || undefined,
  submittedAt: toIso(row.submitted_at),
  validatedAt: toIso(row.validated_at),
  validatedBy: row.validated_by,
  createdAt: toIso(row.created_at) || undefined,
  createdBy: row.created_by,
  updatedAt: toIso(row.updated_at) || undefined,
  updatedBy: row.updated_by,
  requirements: [],
  supervisorAssignments: [],
});

export const toFinalProjectRegistrationRequirement = (
  row: FinalProjectRegistrationRequirementRow
): FinalProjectRegistrationRequirement => ({
  id: row.id,
  requirementDefinitionId: row.requirement_definition_id,
  requirementKey: row.requirement_key || undefined,
  label: row.label_snapshot,
  wajib: row.wajib,
  status: row.status,
  fileRef: row.file_ref || undefined,
  linkBerkas: row.link_berkas || undefined,
  catatanMahasiswa: row.catatan_mahasiswa || undefined,
  catatanKoordinator: row.catatan_koordinator || undefined,
  uploadedAt: toIso(row.uploaded_at),
  verifiedAt: toIso(row.verified_at),
  verifiedBy: row.verified_by,
});

export const toSupervisorAssignment = (
  row: SupervisorAssignmentRow
): SupervisorAssignment => ({
  id: row.id,
  lecturerId: row.lecturer_id,
  supervisorOrder: row.supervisor_order,
  lecturerName: row.lecturer_name_snapshot,
  lecturerIdentifier: row.lecturer_identifier_snapshot || undefined,
  status: row.status,
  assignedAt: toIso(row.assigned_at) || "",
  assignedBy: row.assigned_by,
  coordinatorNote: row.coordinator_note || undefined,
});

const toDateOnly = (value: Date | string) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
};

const toStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};
