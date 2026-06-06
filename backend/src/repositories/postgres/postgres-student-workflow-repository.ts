import type {
  PostgresConnectionPool,
  PostgresQueryExecutor,
  PostgresTransactionClient,
} from "../../database/postgres/connection";
import { createDefaultStudentWorkflowState } from "../../database/default-student-workflow-state";
import type {
  RequirementBundle,
  RequirementItem,
  StepId,
  StepStatus,
  StudentStep,
  ThesisSubmission,
} from "../../domain/types";
import type { StudentWorkflowRepository } from "../contracts";

interface ProgressStepRow {
  step_id: StepId;
  step_order: number;
  label: string;
  description: string;
  status: StepStatus;
}

interface RequirementBundleRow {
  id: string;
  drive_link: string;
}

interface RequirementRecordRow {
  id: string;
  requirement_definition_id: string | null;
  requirement_key: string | null;
  label_snapshot: string;
  status: RequirementItem["status"];
  wajib: boolean;
  catatan_koordinator: string | null;
}

interface ThesisSubmissionRow {
  id: string;
  submitted_at: Date | string;
  skema: ThesisSubmission["skema"];
  jenis_ta: string;
  judul_ta: string;
  deskripsi_ta: string;
  pembimbing1_name_snapshot: string | null;
  pembimbing2_name_snapshot: string | null;
  status: ThesisSubmission["status"];
  catatan_koordinator: string | null;
  bukti_file_ref: string | null;
}

const initialStageKey = "initial";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const indonesianMonthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const indonesianMonthIndex = new Map(
  indonesianMonthNames.map((name, index) => [name.toLowerCase(), index])
);

const toStudentStepBase = (row: ProgressStepRow): Omit<StudentStep, "isLocked"> => ({
  id: row.step_id,
  order: row.step_order,
  label: row.label,
  description: row.description,
  status: row.status,
});

const withLockState = (steps: Omit<StudentStep, "isLocked">[]): StudentStep[] =>
  steps.map((step, index) => ({
    ...step,
    isLocked: steps.slice(0, index).some((previous) => previous.status !== "completed"),
  }));

const toUuidOrNull = (value: string | null | undefined) =>
  value && uuidPattern.test(value) ? value : null;

const toRequirementItem = (row: RequirementRecordRow): RequirementItem => ({
  id: row.requirement_definition_id || row.requirement_key || row.id,
  label: row.label_snapshot,
  status: row.status,
  wajib: row.wajib,
  catatanKoordinator: row.catatan_koordinator || undefined,
});

const parseSubmissionDate = (value: string) => {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  const indonesianDate = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (indonesianDate) {
    const [, day, monthName, year] = indonesianDate;
    const month = indonesianMonthIndex.get(monthName.toLowerCase());

    if (month !== undefined) {
      return new Date(Date.UTC(Number(year), month, Number(day))).toISOString();
    }
  }

  return new Date().toISOString();
};

const toDisplayDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }

  return `${date.getUTCDate()} ${indonesianMonthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const toThesisSubmission = (row: ThesisSubmissionRow): ThesisSubmission => ({
  id: row.id,
  date: toDisplayDate(row.submitted_at),
  skema: row.skema,
  jenisTA: row.jenis_ta,
  judulTA: row.judul_ta,
  deskripsiTA: row.deskripsi_ta,
  pembimbing1: row.pembimbing1_name_snapshot || "",
  pembimbing2: row.pembimbing2_name_snapshot || "",
  status: row.status,
  catatanKoordinator: row.catatan_koordinator || undefined,
  buktiFile: row.bukti_file_ref || undefined,
});

const notImplemented = (area: string): never => {
  throw new Error(`${area} PostgreSQL repository is not implemented yet.`);
};

export class PostgresStudentWorkflowRepository implements StudentWorkflowRepository {
  constructor(private readonly db: PostgresConnectionPool) {
  }

  async getProgressSteps(studentId: string) {
    return withLockState(await this.ensureProgressSteps(studentId, this.db));
  }

  async updateProgressStep(studentId: string, stepId: StepId, status: StepStatus) {
    return this.withTransaction(async (client) => {
      let steps = await this.ensureProgressSteps(studentId, client);
      const targetIndex = steps.findIndex((step) => step.id === stepId);

      if (targetIndex === -1) {
        return withLockState(steps);
      }

      steps[targetIndex] = { ...steps[targetIndex], status };

      if (status === "completed" && targetIndex + 1 < steps.length) {
        if (steps[targetIndex + 1].status === "pending") {
          steps[targetIndex + 1] = { ...steps[targetIndex + 1], status: "active" };
        }
      }

      if (status === "active") {
        steps = steps.map((step, index) =>
          index < targetIndex ? { ...step, status: "completed" } : step
        );
      }

      await this.replaceProgressSteps(studentId, steps, client);
      return withLockState(steps);
    });
  }

  async resetProgressSteps(studentId: string) {
    return this.withTransaction(async (client) => {
      const steps = createDefaultStudentWorkflowState().progressSteps;
      await this.replaceProgressSteps(studentId, steps, client);
      return withLockState(steps);
    });
  }

  async getInitialRequirements(studentId: string) {
    return this.ensureInitialRequirements(studentId);
  }

  async saveInitialRequirements(studentId: string, bundle: RequirementBundle) {
    return this.replaceRequirementBundle(studentId, initialStageKey, bundle);
  }

  async getStageRequirements(studentId: string, stageId: string) {
    return (
      (await this.readRequirementBundle(studentId, stageId, this.db)) || {
        driveLink: "",
        requirements: [],
      }
    );
  }

  async saveStageRequirements(studentId: string, stageId: string, bundle: RequirementBundle) {
    return this.replaceRequirementBundle(studentId, stageId, bundle);
  }

  async listThesisSubmissions(studentId: string) {
    return this.listThesisSubmissionsWith(studentId, this.db);
  }

  async replaceThesisSubmissions(studentId: string, submissions: ThesisSubmission[]) {
    return this.withTransaction(async (client) => {
      await client.query(
        `
          DELETE FROM thesis_submissions
          WHERE student_id = $1
        `,
        [studentId]
      );

      for (const submission of submissions) {
        await client.query(
          `
            INSERT INTO thesis_submissions (
              id,
              student_id,
              submitted_at,
              skema,
              jenis_ta,
              judul_ta,
              deskripsi_ta,
              pembimbing1_name_snapshot,
              pembimbing2_name_snapshot,
              status,
              catatan_koordinator,
              bukti_file_ref,
              updated_at
            )
            VALUES (
              COALESCE($1::uuid, gen_random_uuid()),
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              NOW()
            )
          `,
          [
            toUuidOrNull(submission.id),
            studentId,
            parseSubmissionDate(submission.date),
            submission.skema,
            submission.jenisTA,
            submission.judulTA,
            submission.deskripsiTA,
            submission.pembimbing1,
            submission.pembimbing2,
            submission.status,
            submission.catatanKoordinator || null,
            submission.buktiFile || null,
          ]
        );
      }

      return this.listThesisSubmissionsWith(studentId, client);
    });
  }

  getGuidance() {
    return notImplemented("Student guidance");
  }

  updateGuidance() {
    return notImplemented("Student guidance");
  }

  resetGuidance() {
    return notImplemented("Student guidance");
  }

  getExam() {
    return notImplemented("Student exam");
  }

  updateExam() {
    return notImplemented("Student exam");
  }

  resetExam() {
    return notImplemented("Student exam");
  }

  getRevision() {
    return notImplemented("Student revision");
  }

  updateRevision() {
    return notImplemented("Student revision");
  }

  resetRevision() {
    return notImplemented("Student revision");
  }

  private async ensureProgressSteps(
    studentId: string,
    db: PostgresQueryExecutor
  ): Promise<Omit<StudentStep, "isLocked">[]> {
    const existing = await this.readProgressSteps(studentId, db);
    if (existing.length > 0) {
      return existing;
    }

    const defaults = createDefaultStudentWorkflowState().progressSteps;
    await this.insertDefaultProgressSteps(studentId, defaults, db);
    return this.readProgressSteps(studentId, db);
  }

  private async readProgressSteps(studentId: string, db: PostgresQueryExecutor) {
    const result = await db.query<ProgressStepRow>(
      `
        SELECT
          step_id,
          step_order,
          label,
          description,
          status
        FROM student_progress_steps
        WHERE student_id = $1
        ORDER BY step_order ASC
      `,
      [studentId]
    );

    return result.rows.map(toStudentStepBase);
  }

  private async insertDefaultProgressSteps(
    studentId: string,
    steps: Omit<StudentStep, "isLocked">[],
    db: PostgresQueryExecutor
  ) {
    for (const step of steps) {
      await db.query(
        `
          INSERT INTO student_progress_steps (
            student_id,
            step_id,
            step_order,
            label,
            description,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (student_id, step_id) DO NOTHING
        `,
        [studentId, step.id, step.order, step.label, step.description, step.status]
      );
    }
  }

  private async replaceProgressSteps(
    studentId: string,
    steps: Omit<StudentStep, "isLocked">[],
    client: PostgresTransactionClient
  ) {
    await client.query(
      `
        DELETE FROM student_progress_steps
        WHERE student_id = $1
      `,
      [studentId]
    );
    await this.insertDefaultProgressSteps(studentId, steps, client);
  }

  private async ensureInitialRequirements(studentId: string) {
    const existing = await this.readRequirementBundle(studentId, initialStageKey, this.db);
    if (existing) {
      return existing;
    }

    return this.replaceRequirementBundle(
      studentId,
      initialStageKey,
      createDefaultStudentWorkflowState().requirements.initial
    );
  }

  private async readRequirementBundle(
    studentId: string,
    stageKey: string,
    db: PostgresQueryExecutor
  ): Promise<RequirementBundle | null> {
    const result = await db.query<RequirementBundleRow>(
      `
        SELECT id, drive_link
        FROM student_requirement_bundles
        WHERE student_id = $1
          AND stage_key = $2
        LIMIT 1
      `,
      [studentId, stageKey]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.readRequirementBundleById(row.id, row.drive_link, db);
  }

  private async readRequirementBundleById(
    bundleId: string,
    driveLink: string,
    db: PostgresQueryExecutor
  ): Promise<RequirementBundle> {
    const result = await db.query<RequirementRecordRow>(
      `
        SELECT
          id,
          requirement_definition_id,
          requirement_key,
          label_snapshot,
          status,
          wajib,
          catatan_koordinator
        FROM student_requirement_records
        WHERE bundle_id = $1
        ORDER BY created_at ASC, label_snapshot ASC
      `,
      [bundleId]
    );

    return {
      driveLink,
      requirements: result.rows.map(toRequirementItem),
    };
  }

  private async replaceRequirementBundle(
    studentId: string,
    stageKey: string,
    bundle: RequirementBundle
  ) {
    return this.withTransaction(async (client) => {
      const bundleId = await this.upsertRequirementBundle(studentId, stageKey, bundle, client);
      const definitionIds = await this.findRequirementDefinitionIds(bundle.requirements, client);
      await client.query(
        `
          DELETE FROM student_requirement_records
          WHERE bundle_id = $1
        `,
        [bundleId]
      );
      await this.insertRequirementRecords(bundleId, bundle.requirements, definitionIds, client);
      return this.readRequirementBundleById(bundleId, bundle.driveLink, client);
    });
  }

  private async upsertRequirementBundle(
    studentId: string,
    stageKey: string,
    bundle: RequirementBundle,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<RequirementBundleRow>(
      `
        INSERT INTO student_requirement_bundles (
          student_id,
          stage_key,
          drive_link,
          updated_at
        )
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (student_id, stage_key) DO UPDATE
        SET
          drive_link = EXCLUDED.drive_link,
          updated_at = NOW()
        RETURNING id, drive_link
      `,
      [studentId, stageKey, bundle.driveLink]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Student requirement bundle was not saved.");
    }

    return row.id;
  }

  private async insertRequirementRecords(
    bundleId: string,
    requirements: RequirementItem[],
    definitionIds: Set<string>,
    client: PostgresTransactionClient
  ) {
    for (const requirement of requirements) {
      const candidateDefinitionId = toUuidOrNull(requirement.id);
      const definitionId =
        candidateDefinitionId && definitionIds.has(candidateDefinitionId)
          ? candidateDefinitionId
          : null;
      const requirementKey = definitionId ? null : requirement.id;

      await client.query(
        `
          INSERT INTO student_requirement_records (
            bundle_id,
            requirement_definition_id,
            requirement_key,
            label_snapshot,
            status,
            wajib,
            catatan_koordinator,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
        [
          bundleId,
          definitionId,
          requirementKey,
          requirement.label,
          requirement.status,
          requirement.wajib ?? true,
          requirement.catatanKoordinator || null,
        ]
      );
    }
  }

  private async findRequirementDefinitionIds(
    requirements: RequirementItem[],
    client: PostgresTransactionClient
  ) {
    const candidateIds = requirements
      .map((requirement) => toUuidOrNull(requirement.id))
      .filter((id): id is string => Boolean(id));

    if (candidateIds.length === 0) {
      return new Set<string>();
    }

    const result = await client.query<{ id: string }>(
      `
        SELECT id
        FROM requirement_definitions
        WHERE id = ANY($1::uuid[])
      `,
      [candidateIds]
    );

    return new Set(result.rows.map((row) => row.id));
  }

  private async listThesisSubmissionsWith(
    studentId: string,
    db: PostgresQueryExecutor
  ) {
    const result = await db.query<ThesisSubmissionRow>(
      `
        SELECT
          id,
          submitted_at,
          skema,
          jenis_ta,
          judul_ta,
          deskripsi_ta,
          pembimbing1_name_snapshot,
          pembimbing2_name_snapshot,
          status,
          catatan_koordinator,
          bukti_file_ref
        FROM thesis_submissions
        WHERE student_id = $1
        ORDER BY submitted_at DESC, created_at DESC
      `,
      [studentId]
    );

    return result.rows.map(toThesisSubmission);
  }

  private async withTransaction<T>(
    callback: (client: PostgresTransactionClient) => Promise<T>
  ) {
    const client = await this.db.connect();

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
