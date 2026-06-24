import type {
  PostgresConnectionPool,
  PostgresQueryExecutor,
  PostgresTransactionClient,
} from "../../database/postgres/connection";
import type {
  FinalProjectRegistration,
  FinalProjectRegistrationStatus,
  SupervisorAssignment,
} from "../../domain/types";
import type {
  FinalProjectRegistrationListResult,
  FinalProjectRegistrationRepository,
  FinalProjectRegistrationSaveInput,
  FinalProjectRegistrationValidationInput,
} from "../contracts";
import {
  toFinalProjectRegistrationBase,
  toFinalProjectRegistrationRequirement,
  toSupervisorAssignment,
  type FinalProjectRegistrationRequirementRow,
  type FinalProjectRegistrationRow,
  type SupervisorAssignmentRow,
} from "./row-mappers";

const activeStatuses: FinalProjectRegistrationStatus[] = [
  "Draft",
  "Menunggu Validasi Koordinator",
  "Disetujui",
];

const registrationColumns = `
  id,
  student_id,
  academic_period_id,
  requirement_drive_link,
  payment_proof_file_ref,
  payment_proof_link,
  skema,
  thesis_type_id,
  thesis_type_name_snapshot,
  judul_ta,
  deskripsi_ta,
  requested_supervisor1_id,
  requested_supervisor1_name_snapshot,
  status,
  coordinator_note,
  submitted_at,
  validated_at,
  validated_by,
  created_at,
  created_by,
  updated_at,
  updated_by
`;

const requirementColumns = `
  id,
  registration_id,
  requirement_definition_id,
  requirement_key,
  label_snapshot,
  wajib,
  status,
  file_ref,
  link_berkas,
  catatan_mahasiswa,
  catatan_koordinator,
  uploaded_at,
  verified_at,
  verified_by
`;

const supervisorAssignmentColumns = `
  id,
  registration_id,
  lecturer_id,
  supervisor_order,
  lecturer_name_snapshot,
  lecturer_identifier_snapshot,
  status,
  assigned_at,
  assigned_by,
  coordinator_note
`;

const orderByNewest = `
  COALESCE(updated_at, submitted_at, validated_at, created_at) DESC,
  id DESC
`;

const aliasedRegistrationColumns = (alias: string) =>
  registrationColumns
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
    .map((column) => `${alias}.${column}`)
    .join(",\n          ");

const aliasedOrderByNewest = (alias: string) => `
  COALESCE(${alias}.updated_at, ${alias}.submitted_at, ${alias}.validated_at, ${alias}.created_at) DESC,
  ${alias}.id DESC
`;

const toCanonicalRegistrationStatus = (status: FinalProjectRegistrationStatus) => {
  switch (status) {
    case "Draft":
      return "DRAFT";
    case "Menunggu Validasi Koordinator":
      return "PENDING";
    case "Disetujui":
      return "APPROVED";
    case "Ditolak":
      return "REJECTED";
    default:
      return "PENDING";
  }
};

const toCanonicalCommitteeRole = (supervisorOrder: SupervisorAssignment["supervisorOrder"]) =>
  supervisorOrder === 1 ? "SUPERVISOR_1" : "SUPERVISOR_2";

export class PostgresFinalProjectRegistrationRepository
  implements FinalProjectRegistrationRepository
{
  constructor(private readonly pool: PostgresConnectionPool) {}

  async getActiveByStudentId(studentId: string) {
    const result = await this.pool.query<FinalProjectRegistrationRow>(
      `
        SELECT ${registrationColumns}
        FROM final_project_registrations
        WHERE student_id = $1
          AND status = ANY($2::text[])
        ORDER BY ${orderByNewest}
        LIMIT 1
      `,
      [studentId, activeStatuses]
    );

    const registrations = await this.hydrate(result.rows, this.pool);
    return registrations[0] || null;
  }

  async findById(id: string) {
    const result = await this.pool.query<FinalProjectRegistrationRow>(
      `
        SELECT ${registrationColumns}
        FROM final_project_registrations
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    const registrations = await this.hydrate(result.rows, this.pool);
    return registrations[0] || null;
  }

  async list(filter: {
    status?: FinalProjectRegistrationStatus | null;
    q?: string | null;
    page?: number;
    limit?: number;
  } = {}): Promise<FinalProjectRegistrationListResult> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const offset = (page - 1) * limit;
    const values: unknown[] = [];
    const where: string[] = [];

    if (filter.status) {
      values.push(filter.status);
      where.push(`fpr.status = $${values.length}`);
    }

    const q = filter.q?.trim().toLowerCase();
    if (q) {
      values.push(`%${q}%`);
      where.push(`
        (
          LOWER(COALESCE(student.name, '')) LIKE $${values.length}
          OR LOWER(COALESCE(student.identifier, '')) LIKE $${values.length}
          OR LOWER(COALESCE(fpr.judul_ta, '')) LIKE $${values.length}
          OR LOWER(COALESCE(fpr.thesis_type_name_snapshot, '')) LIKE $${values.length}
          OR LOWER(fpr.status) LIKE $${values.length}
        )
      `);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await this.pool.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM final_project_registrations fpr
        LEFT JOIN users student ON student.id = fpr.student_id
        ${whereSql}
      `,
      values
    );
    const total = Number(countResult.rows[0]?.total || 0);

    const dataResult = await this.pool.query<FinalProjectRegistrationRow>(
      `
        SELECT
          ${aliasedRegistrationColumns("fpr")}
        FROM final_project_registrations fpr
        LEFT JOIN users student ON student.id = fpr.student_id
        ${whereSql}
        ORDER BY ${aliasedOrderByNewest("fpr")}
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      [...values, limit, offset]
    );

    return {
      data: await this.hydrate(dataResult.rows, this.pool),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async saveStudentRegistration(
    studentId: string,
    input: FinalProjectRegistrationSaveInput
  ) {
    return this.withTransaction(async (client) => {
      const existing = await this.findActiveByStudentIdForUpdate(studentId, client);
      const status: FinalProjectRegistrationStatus = input.submit
        ? "Menunggu Validasi Koordinator"
        : "Draft";
      const row = existing
        ? await this.updateStudentRegistration(existing.id, input, status, client)
        : await this.insertStudentRegistration(studentId, input, status, client);
      await this.syncCanonicalRegistration(row, client);
      const registrations = await this.hydrate([row], client);

      if (!registrations[0]) {
        throw new Error("Final project registration was not saved.");
      }

      return registrations[0];
    });
  }

  async validateRegistration(
    registrationId: string,
    input: FinalProjectRegistrationValidationInput
  ) {
    return this.withTransaction(async (client) => {
      const result = await client.query<FinalProjectRegistrationRow>(
        `
          UPDATE final_project_registrations
          SET
            status = $2,
            coordinator_note = $3,
            validated_at = $4,
            validated_by = $5,
            updated_at = $4,
            updated_by = $5
          WHERE id = $1
          RETURNING ${registrationColumns}
        `,
        [
          registrationId,
          input.status,
          input.coordinatorNote || null,
          input.timestamp,
          input.actorId,
        ]
      );

      const updated = result.rows[0];
      if (!updated) {
        return null;
      }

      await this.syncCanonicalRegistration(updated, client);

      await client.query(
        `
          DELETE FROM supervisor_assignments
          WHERE registration_id = $1
        `,
        [registrationId]
      );

      if (input.status === "Disetujui") {
        await this.insertSupervisorAssignments(
          registrationId,
          input.supervisorAssignments || [],
          input.actorId,
          input.timestamp,
          client
        );
        await this.ensureCanonicalThesisWithCommitteeSync(
          updated,
          input.supervisorAssignments || [],
          client
        );
      }

      const registrations = await this.hydrate([updated], client);
      return registrations[0] || null;
    });
  }

  async replaceSupervisorAssignmentsByStudentId(
    studentId: string,
    assignments: SupervisorAssignment[],
    input: {
      actorId: string;
      timestamp: string;
      coordinatorNote?: string;
    }
  ) {
    return this.withTransaction(async (client) => {
      const registration = await this.findApprovedByStudentIdForUpdate(studentId, client);
      if (!registration) {
        return null;
      }

      const normalizedAssignments = assignments.map((assignment) => ({
        ...assignment,
        assignedBy: assignment.assignedBy ?? input.actorId,
        assignedAt: assignment.assignedAt || input.timestamp,
        coordinatorNote: assignment.coordinatorNote || input.coordinatorNote,
      }));

      await client.query(
        `
          DELETE FROM supervisor_assignments
          WHERE registration_id = $1
        `,
        [registration.id]
      );

      await this.insertSupervisorAssignments(
        registration.id,
        normalizedAssignments,
        input.actorId,
        input.timestamp,
        client
      );

      const updatedResult = await client.query<FinalProjectRegistrationRow>(
        `
          UPDATE final_project_registrations
          SET updated_at = $2, updated_by = $3
          WHERE id = $1
          RETURNING ${registrationColumns}
        `,
        [registration.id, input.timestamp, input.actorId]
      );
      const updated = updatedResult.rows[0];
      if (updated) {
        await this.syncCanonicalRegistration(updated, client);
        await this.ensureCanonicalThesisWithCommitteeSync(
          updated,
          normalizedAssignments,
          client
        );
      }
      const registrations = await this.hydrate(updatedResult.rows, client);
      return registrations[0] || null;
    });
  }

  private async findActiveByStudentIdForUpdate(
    studentId: string,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<FinalProjectRegistrationRow>(
      `
        SELECT ${registrationColumns}
        FROM final_project_registrations
        WHERE student_id = $1
          AND status = ANY($2::text[])
        ORDER BY ${orderByNewest}
        LIMIT 1
        FOR UPDATE
      `,
      [studentId, activeStatuses]
    );

    return result.rows[0] || null;
  }

  private async findApprovedByStudentIdForUpdate(
    studentId: string,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<FinalProjectRegistrationRow>(
      `
        SELECT ${registrationColumns}
        FROM final_project_registrations
        WHERE student_id = $1
          AND status = 'Disetujui'
        ORDER BY ${orderByNewest}
        LIMIT 1
        FOR UPDATE
      `,
      [studentId]
    );

    return result.rows[0] || null;
  }

  private async insertStudentRegistration(
    studentId: string,
    input: FinalProjectRegistrationSaveInput,
    status: FinalProjectRegistrationStatus,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<FinalProjectRegistrationRow>(
      `
        INSERT INTO final_project_registrations (
          student_id,
          academic_period_id,
          requirement_drive_link,
          payment_proof_file_ref,
          payment_proof_link,
          skema,
          thesis_type_id,
          thesis_type_name_snapshot,
          judul_ta,
          deskripsi_ta,
          requested_supervisor1_id,
          requested_supervisor1_name_snapshot,
          status,
          submitted_at,
          created_at,
          created_by,
          updated_at,
          updated_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $15, $16
        )
        RETURNING ${registrationColumns}
      `,
      [
        studentId,
        input.academicPeriodId ?? null,
        input.requirementDriveLink,
        input.paymentProofFileRef || null,
        input.paymentProofLink || null,
        input.skema || null,
        input.thesisTypeId ?? null,
        input.thesisTypeName || null,
        input.judulTA || null,
        input.deskripsiTA || null,
        input.requestedSupervisor1Id ?? null,
        input.requestedSupervisor1Name || null,
        status,
        input.submit ? input.timestamp : null,
        input.timestamp,
        input.actorId,
      ]
    );

    return result.rows[0];
  }

  private async updateStudentRegistration(
    registrationId: string,
    input: FinalProjectRegistrationSaveInput,
    status: FinalProjectRegistrationStatus,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<FinalProjectRegistrationRow>(
      `
        UPDATE final_project_registrations
        SET
          academic_period_id = $2,
          requirement_drive_link = $3,
          payment_proof_file_ref = $4,
          payment_proof_link = $5,
          skema = $6,
          thesis_type_id = $7,
          thesis_type_name_snapshot = $8,
          judul_ta = $9,
          deskripsi_ta = $10,
          requested_supervisor1_id = $11,
          requested_supervisor1_name_snapshot = $12,
          status = $13,
          submitted_at = CASE WHEN $14::boolean THEN $15 ELSE submitted_at END,
          updated_at = $15,
          updated_by = $16
        WHERE id = $1
        RETURNING ${registrationColumns}
      `,
      [
        registrationId,
        input.academicPeriodId ?? null,
        input.requirementDriveLink,
        input.paymentProofFileRef || null,
        input.paymentProofLink || null,
        input.skema || null,
        input.thesisTypeId ?? null,
        input.thesisTypeName || null,
        input.judulTA || null,
        input.deskripsiTA || null,
        input.requestedSupervisor1Id ?? null,
        input.requestedSupervisor1Name || null,
        status,
        input.submit,
        input.timestamp,
        input.actorId,
      ]
    );

    return result.rows[0];
  }

  private async insertSupervisorAssignments(
    registrationId: string,
    assignments: SupervisorAssignment[],
    actorId: string,
    timestamp: string,
    client: PostgresTransactionClient
  ) {
    for (const assignment of assignments) {
      await client.query(
        `
          INSERT INTO supervisor_assignments (
            id,
            registration_id,
            lecturer_id,
            supervisor_order,
            lecturer_name_snapshot,
            lecturer_identifier_snapshot,
            status,
            assigned_at,
            assigned_by,
            coordinator_note,
            created_at,
            updated_at,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)
        `,
        [
          assignment.id,
          registrationId,
          assignment.lecturerId ?? null,
          assignment.supervisorOrder,
          assignment.lecturerName,
          assignment.lecturerIdentifier || null,
          assignment.status,
          assignment.assignedAt,
          assignment.assignedBy ?? actorId,
          assignment.coordinatorNote || null,
          timestamp,
          actorId,
        ]
      );
    }
  }

  private async syncCanonicalRegistration(
    registration: FinalProjectRegistrationRow,
    client: PostgresTransactionClient
  ) {
    await client.query(
      `
        INSERT INTO thesis_registrations (
          id,
          legacy_final_project_registration_id,
          student_id,
          academic_period_id,
          thesis_type_id,
          title,
          title_description,
          requirement_drive_link,
          payment_proof_file_url,
          recommended_supervisor_1_id,
          status,
          validation_note,
          submitted_at,
          validated_at,
          validated_by,
          created_at,
          updated_at,
          updated_by
        )
        VALUES (
          $1, $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (id) DO UPDATE
        SET
          legacy_final_project_registration_id = EXCLUDED.legacy_final_project_registration_id,
          student_id = EXCLUDED.student_id,
          academic_period_id = EXCLUDED.academic_period_id,
          thesis_type_id = EXCLUDED.thesis_type_id,
          title = EXCLUDED.title,
          title_description = EXCLUDED.title_description,
          requirement_drive_link = EXCLUDED.requirement_drive_link,
          payment_proof_file_url = EXCLUDED.payment_proof_file_url,
          recommended_supervisor_1_id = EXCLUDED.recommended_supervisor_1_id,
          status = EXCLUDED.status,
          validation_note = EXCLUDED.validation_note,
          submitted_at = EXCLUDED.submitted_at,
          validated_at = EXCLUDED.validated_at,
          validated_by = EXCLUDED.validated_by,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `,
      [
        registration.id,
        registration.student_id,
        registration.academic_period_id,
        registration.thesis_type_id,
        registration.judul_ta || "",
        registration.deskripsi_ta,
        registration.requirement_drive_link,
        registration.payment_proof_link || registration.payment_proof_file_ref,
        registration.requested_supervisor1_id,
        toCanonicalRegistrationStatus(registration.status),
        registration.coordinator_note,
        registration.submitted_at,
        registration.validated_at,
        registration.validated_by,
        registration.created_at,
        registration.updated_at,
        registration.updated_by,
      ]
    );
  }

  private async ensureCanonicalThesisWithCommitteeSync(
    registration: FinalProjectRegistrationRow,
    assignments: SupervisorAssignment[],
    client: PostgresTransactionClient
  ) {
    if (registration.status !== "Disetujui") {
      return;
    }

    const thesisId = await this.ensureCanonicalThesis(registration, client);
    if (!thesisId) {
      throw new Error("Canonical thesis stage PROPOSAL_GUIDANCE is missing.");
    }

    await this.ensureCanonicalInitialStageHistory(thesisId, client);
    await this.syncCanonicalCommittees(thesisId, assignments, client);
  }

  private async ensureCanonicalThesis(
    registration: FinalProjectRegistrationRow,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<{ id: string }>(
      `
        WITH proposal_stage AS (
          SELECT id
          FROM thesis_stages
          WHERE code = 'PROPOSAL_GUIDANCE'
          LIMIT 1
        )
        INSERT INTO theses (
          registration_id,
          student_id,
          title,
          status,
          current_stage_id,
          started_at,
          created_at,
          updated_at,
          updated_by
        )
        SELECT
          $1,
          $2,
          $3,
          'ACTIVE',
          proposal_stage.id,
          COALESCE($4::timestamptz, $5::timestamptz, $6::timestamptz, NOW()),
          COALESCE($6::timestamptz, NOW()),
          COALESCE($7::timestamptz, $4::timestamptz, NOW()),
          $8
        FROM proposal_stage
        ON CONFLICT (registration_id) DO UPDATE
        SET
          student_id = EXCLUDED.student_id,
          title = EXCLUDED.title,
          status = CASE
            WHEN theses.status = 'CANCELLED' THEN 'ACTIVE'
            ELSE theses.status
          END,
          current_stage_id = COALESCE(theses.current_stage_id, EXCLUDED.current_stage_id),
          started_at = COALESCE(theses.started_at, EXCLUDED.started_at),
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
        RETURNING id
      `,
      [
        registration.id,
        registration.student_id,
        registration.judul_ta || "",
        registration.validated_at,
        registration.submitted_at,
        registration.created_at,
        registration.updated_at,
        registration.updated_by,
      ]
    );

    return result.rows[0]?.id || null;
  }

  private async ensureCanonicalInitialStageHistory(
    thesisId: string,
    client: PostgresTransactionClient
  ) {
    await client.query(
      `
        INSERT INTO thesis_stage_histories (
          thesis_id,
          stage_id,
          status,
          started_at,
          created_at
        )
        SELECT
          thesis.id,
          thesis.current_stage_id,
          'ACTIVE',
          COALESCE(thesis.started_at, thesis.created_at, NOW()),
          COALESCE(thesis.created_at, NOW())
        FROM theses thesis
        WHERE thesis.id = $1
          AND thesis.current_stage_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM thesis_stage_histories history
            WHERE history.thesis_id = thesis.id
              AND history.stage_id = thesis.current_stage_id
              AND history.finished_at IS NULL
          )
      `,
      [thesisId]
    );
  }

  private async syncCanonicalCommittees(
    thesisId: string,
    assignments: SupervisorAssignment[],
    client: PostgresTransactionClient
  ) {
    for (const assignment of assignments) {
      if (!assignment.lecturerId || assignment.status !== "Aktif") {
        continue;
      }

      await client.query(
        `
          INSERT INTO thesis_committees (
            thesis_id,
            lecturer_id,
            role,
            assigned_at,
            assigned_by,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $4)
          ON CONFLICT (thesis_id, role) DO UPDATE
          SET
            lecturer_id = EXCLUDED.lecturer_id,
            assigned_at = EXCLUDED.assigned_at,
            assigned_by = EXCLUDED.assigned_by
        `,
        [
          thesisId,
          assignment.lecturerId,
          toCanonicalCommitteeRole(assignment.supervisorOrder),
          assignment.assignedAt,
          assignment.assignedBy || null,
        ]
      );
    }
  }

  private async hydrate(
    rows: FinalProjectRegistrationRow[],
    db: PostgresQueryExecutor
  ): Promise<FinalProjectRegistration[]> {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const requirementsResult =
      await db.query<FinalProjectRegistrationRequirementRow>(
        `
          SELECT ${requirementColumns}
          FROM final_project_registration_requirements
          WHERE registration_id = ANY($1::uuid[])
          ORDER BY created_at ASC, label_snapshot ASC
        `,
        [ids]
      );
    const assignmentsResult = await db.query<SupervisorAssignmentRow>(
      `
        SELECT ${supervisorAssignmentColumns}
        FROM supervisor_assignments
        WHERE registration_id = ANY($1::uuid[])
        ORDER BY supervisor_order ASC, assigned_at ASC
      `,
      [ids]
    );
    const requirementsByRegistration = new Map<
      string,
      ReturnType<typeof toFinalProjectRegistrationRequirement>[]
    >();
    const assignmentsByRegistration = new Map<
      string,
      ReturnType<typeof toSupervisorAssignment>[]
    >();

    for (const row of requirementsResult.rows) {
      const current = requirementsByRegistration.get(row.registration_id) || [];
      current.push(toFinalProjectRegistrationRequirement(row));
      requirementsByRegistration.set(row.registration_id, current);
    }

    for (const row of assignmentsResult.rows) {
      const current = assignmentsByRegistration.get(row.registration_id) || [];
      current.push(toSupervisorAssignment(row));
      assignmentsByRegistration.set(row.registration_id, current);
    }

    return rows.map((row) => ({
      ...toFinalProjectRegistrationBase(row),
      requirements: requirementsByRegistration.get(row.id) || [],
      supervisorAssignments: assignmentsByRegistration.get(row.id) || [],
    }));
  }

  private async withTransaction<T>(
    callback: (client: PostgresTransactionClient) => Promise<T>
  ) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
