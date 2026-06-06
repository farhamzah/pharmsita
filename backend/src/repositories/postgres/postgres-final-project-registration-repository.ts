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
      }

      const registrations = await this.hydrate([updated], client);
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
