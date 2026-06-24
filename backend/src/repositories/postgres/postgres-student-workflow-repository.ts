import type {
  PostgresConnectionPool,
  PostgresQueryExecutor,
  PostgresTransactionClient,
} from "../../database/postgres/connection";
import { createDefaultStudentWorkflowState } from "../../database/default-student-workflow-state";
import type {
  ExamStage,
  ExamWorkflow,
  GuidanceStage,
  GuidanceSession,
  GuidanceWorkflow,
  RequirementBundle,
  RequirementItem,
  RevisionItem,
  RevisionStage,
  RevisionWorkflow,
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

interface GuidanceWorkflowRow {
  id: string;
  stage_id: GuidanceStage;
  google_docs_link: string;
  final_file_ref: string | null;
  pembimbing1_approved: boolean;
  pembimbing2_approved: boolean;
  guidance_status: GuidanceWorkflow["guidanceStatus"];
  guidance_requested_at: Date | string | null;
  guidance_approved_at: Date | string | null;
  guidance_start_date: Date | string | null;
  guidance_start_time: Date | string | null;
  guidance_note: string | null;
  guidance_approval_note: string | null;
}

interface GuidanceSessionRow {
  id: string;
  session_number: number;
  title: string;
  status: GuidanceSession["status"];
  session_status: GuidanceSession["sessionStatus"];
  session_start_date: Date | string | null;
  session_start_time: Date | string | null;
  catatan_mahasiswa: string | null;
  catatan_koordinator: string | null;
}

interface GuidanceChatRow {
  id: string;
  session_number: number;
  sender_name_snapshot: string;
  sender_role: GuidanceSession["chats"][number]["senderRole"];
  message: string;
  created_at: Date | string;
}

interface ExamRow {
  id: string;
  stage_id: ExamStage;
  status: ExamWorkflow["status"];
  google_docs_link: string;
  submitted_at: Date | string | null;
  grade: string | null;
  result_status: ExamWorkflow["resultStatus"];
  revision_notes: unknown;
  schedule_date: Date | string | null;
  schedule_start_time: Date | string | null;
  schedule_end_time: Date | string | null;
  schedule_room: string | null;
  schedule_location: string | null;
}

interface ExamRequirementRow {
  id: string;
  requirement_key: string;
  label: string;
  fulfilled: boolean;
  note: string | null;
}

interface ExamPanelistRow {
  id: string;
  lecturer_id: string | null;
  panelist_key: string | null;
  role: string;
  role_label: string;
  name_snapshot: string;
  nidn_snapshot: string | null;
  approved: boolean;
}

interface RevisionWorkflowRow {
  id: string;
  stage_id: RevisionStage;
  final_file_ref: string | null;
  penguji1_approved: boolean;
  penguji2_approved: boolean;
  ketua_sidang_status: RevisionWorkflow["ketuaSidangStatus"];
  submitted_at: Date | string | null;
}

interface RevisionItemRow {
  id: string;
  item_number: number;
  title: string;
  topik: string;
  materi: string;
  assigned_to_name_snapshot: string | null;
  status: RevisionItem["status"];
  submitted_at: Date | string | null;
  penyelesaian: string | null;
  penyelesaian_link: string | null;
}

interface RevisionChatRow {
  id: string;
  item_number: number;
  sender_name_snapshot: string;
  sender_role: RevisionItem["chats"][number]["senderRole"];
  message: string;
  created_at: Date | string;
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

const toIsoOrNull = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toDateOnlyOrNull = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return value.slice(0, 10);
};

const toTimeOnlyOrNull = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }

  return value.slice(0, 5);
};

const toTimestampOrNow = (value: string | null | undefined) => {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
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

const normalizeTimeInput = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const matched = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!matched) {
    return null;
  }

  return `${matched[1].padStart(2, "0")}:${matched[2]}`;
};

const parseScheduleTimeRange = (value: string | null | undefined) => {
  const [startRaw, endRaw] = (value || "").split(/\s*-\s*/);

  return {
    startTime: normalizeTimeInput(startRaw),
    endTime: normalizeTimeInput(endRaw),
  };
};

const toScheduleTimeRange = (
  startTime: Date | string | null | undefined,
  endTime: Date | string | null | undefined
) => {
  const start = toTimeOnlyOrNull(startTime);
  const end = toTimeOnlyOrNull(endTime);

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start || end || "";
};

const canonicalStageCodeByExamStage: Record<ExamStage, string> = {
  "sidang-proposal": "PROPOSAL_SEMINAR",
  sidang: "FINAL_DEFENSE",
};

const canonicalStageCodeByRevisionStage: Record<RevisionStage, string> = {
  "revisi-proposal": "PROPOSAL_REVISION",
  "revisi-sidang": "FINAL_REVISION",
};

const canonicalStageCodeByProgressStep: Partial<Record<StepId, string>> = {
  "bimbingan-pra-proposal": "PROPOSAL_GUIDANCE",
  "sidang-proposal": "PROPOSAL_SEMINAR",
  "revisi-proposal": "PROPOSAL_REVISION",
  "bimbingan-pra-sidang": "FINAL_GUIDANCE",
  sidang: "FINAL_DEFENSE",
  "revisi-sidang": "FINAL_REVISION",
};

const canonicalStageSubmissionStatusByExamStatus: Record<ExamWorkflow["status"], string> = {
  "belum-daftar": "DRAFT",
  "menunggu-jadwal": "PENDING",
  terjadwal: "SCHEDULED",
  selesai: "COMPLETED",
};

const canonicalStageSubmissionStatusByRevisionWorkflow = (
  workflow: RevisionWorkflow
) => {
  if (workflow.ketuaSidangStatus === "approved") {
    return "APPROVED";
  }

  if (workflow.ketuaSidangStatus === "rejected") {
    return "REJECTED";
  }

  return workflow.submittedAt ? "PENDING" : "DRAFT";
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
      await this.syncCanonicalProgressAdvancement(studentId, steps, client);
      return withLockState(steps);
    });
  }

  async resetProgressSteps(studentId: string) {
    return this.withTransaction(async (client) => {
      const steps = createDefaultStudentWorkflowState().progressSteps;
      await this.replaceProgressSteps(studentId, steps, client);
      await this.syncCanonicalProgressAdvancement(studentId, steps, client);
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

  async getGuidance(studentId: string, stageId: GuidanceStage) {
    return this.ensureGuidanceWorkflow(studentId, stageId);
  }

  async updateGuidance(
    studentId: string,
    stageId: GuidanceStage,
    mutator: (workflow: GuidanceWorkflow) => void
  ) {
    return this.withTransaction(async (client) => {
      const workflow = await this.ensureGuidanceWorkflowWith(studentId, stageId, client);
      mutator(workflow);
      await this.replaceGuidanceWorkflowRecords(studentId, stageId, workflow, client);
      const saved = await this.readGuidanceWorkflow(studentId, stageId, client);

      if (!saved) {
        throw new Error("Student guidance workflow was not saved.");
      }

      return saved;
    });
  }

  async resetGuidance(studentId: string, stageId: GuidanceStage) {
    return this.withTransaction(async (client) => {
      const workflow = createDefaultStudentWorkflowState().guidance[stageId];
      await this.replaceGuidanceWorkflowRecords(studentId, stageId, workflow, client);
      const saved = await this.readGuidanceWorkflow(studentId, stageId, client);

      if (!saved) {
        throw new Error("Student guidance workflow was not saved.");
      }

      return saved;
    });
  }

  async getExam(studentId: string, stageId: ExamStage) {
    return this.ensureExamWorkflow(studentId, stageId);
  }

  async updateExam(
    studentId: string,
    stageId: ExamStage,
    mutator: (workflow: ExamWorkflow) => void
  ) {
    return this.withTransaction(async (client) => {
      const workflow = await this.ensureExamWorkflowWith(studentId, stageId, client);
      mutator(workflow);
      await this.replaceExamWorkflowRecords(studentId, stageId, workflow, client);
      const saved = await this.readExamWorkflow(studentId, stageId, client);

      if (!saved) {
        throw new Error("Student exam workflow was not saved.");
      }

      return saved;
    });
  }

  async resetExam(studentId: string, stageId: ExamStage) {
    return this.withTransaction(async (client) => {
      const workflow = createDefaultStudentWorkflowState().exams[stageId];
      await this.replaceExamWorkflowRecords(studentId, stageId, workflow, client);
      const saved = await this.readExamWorkflow(studentId, stageId, client);

      if (!saved) {
        throw new Error("Student exam workflow was not saved.");
      }

      return saved;
    });
  }

  async getRevision(studentId: string, stageId: RevisionStage) {
    return this.ensureRevisionWorkflow(studentId, stageId);
  }

  async updateRevision(
    studentId: string,
    stageId: RevisionStage,
    mutator: (workflow: RevisionWorkflow) => void
  ) {
    return this.withTransaction(async (client) => {
      const workflow = await this.ensureRevisionWorkflowWith(studentId, stageId, client);
      mutator(workflow);
      await this.replaceRevisionWorkflowRecords(studentId, stageId, workflow, client);
      const saved = await this.readRevisionWorkflow(studentId, stageId, client);

      if (!saved) {
        throw new Error("Student revision workflow was not saved.");
      }

      return saved;
    });
  }

  async resetRevision(studentId: string, stageId: RevisionStage) {
    return this.withTransaction(async (client) => {
      const workflow = createDefaultStudentWorkflowState().revisions[stageId];
      await this.replaceRevisionWorkflowRecords(studentId, stageId, workflow, client);
      const saved = await this.readRevisionWorkflow(studentId, stageId, client);

      if (!saved) {
        throw new Error("Student revision workflow was not saved.");
      }

      return saved;
    });
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

  private async syncCanonicalProgressAdvancement(
    studentId: string,
    steps: Omit<StudentStep, "isLocked">[],
    client: PostgresTransactionClient
  ) {
    const thesisResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM theses
        WHERE student_id = $1
          AND status IN ('ACTIVE', 'IN_PROGRESS', 'COMPLETED')
        ORDER BY
          CASE status
            WHEN 'ACTIVE' THEN 1
            WHEN 'IN_PROGRESS' THEN 2
            ELSE 3
          END,
          COALESCE(updated_at, started_at, created_at) DESC,
          id DESC
        LIMIT 1
      `,
      [studentId]
    );
    const thesisId = thesisResult.rows[0]?.id;
    if (!thesisId) {
      return;
    }

    const completedStageCodes = steps
      .filter((step) => step.status === "completed")
      .map((step) => canonicalStageCodeByProgressStep[step.id])
      .filter((stageCode): stageCode is string => Boolean(stageCode));
    const nextCanonicalStep = steps.find(
      (step) => step.status !== "completed" && canonicalStageCodeByProgressStep[step.id]
    );
    const currentStageCode = nextCanonicalStep
      ? canonicalStageCodeByProgressStep[nextCanonicalStep.id]
      : "COMPLETED";

    if (!currentStageCode) {
      return;
    }

    const currentStageResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM thesis_stages
        WHERE code = $1
        LIMIT 1
      `,
      [currentStageCode]
    );
    const currentStageId = currentStageResult.rows[0]?.id;
    if (!currentStageId) {
      return;
    }

    const thesisStatus =
      currentStageCode === "COMPLETED"
        ? "COMPLETED"
        : completedStageCodes.length > 0
          ? "IN_PROGRESS"
          : "ACTIVE";

    await client.query(
      `
        UPDATE theses
        SET current_stage_id = $2,
            status = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [thesisId, currentStageId, thesisStatus]
    );

    await client.query(
      `
        UPDATE thesis_stage_histories
        SET status = CASE WHEN status = 'ACTIVE' THEN 'COMPLETED' ELSE status END,
            finished_at = COALESCE(finished_at, NOW())
        WHERE thesis_id = $1
          AND finished_at IS NULL
          AND ($2::uuid IS NULL OR stage_id <> $2::uuid)
      `,
      [thesisId, currentStageCode === "COMPLETED" ? null : currentStageId]
    );

    for (const stageCode of completedStageCodes) {
      await client.query(
        `
          WITH stage AS (
            SELECT id
            FROM thesis_stages
            WHERE code = $2
            LIMIT 1
          ),
          updated AS (
            UPDATE thesis_stage_histories history
            SET status = 'COMPLETED',
                finished_at = COALESCE(history.finished_at, NOW())
            FROM stage
            WHERE history.thesis_id = $1
              AND history.stage_id = stage.id
            RETURNING history.id
          )
          INSERT INTO thesis_stage_histories (
            thesis_id,
            stage_id,
            status,
            started_at,
            finished_at,
            created_at
          )
          SELECT
            $1,
            stage.id,
            'COMPLETED',
            NOW(),
            NOW(),
            NOW()
          FROM stage
          WHERE NOT EXISTS (SELECT 1 FROM updated)
            AND NOT EXISTS (
              SELECT 1
              FROM thesis_stage_histories history
              WHERE history.thesis_id = $1
                AND history.stage_id = stage.id
                AND history.status = 'COMPLETED'
            )
        `,
        [thesisId, stageCode]
      );
    }

    if (currentStageCode !== "COMPLETED") {
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
            $1,
            $2,
            'ACTIVE',
            NOW(),
            NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM thesis_stage_histories
            WHERE thesis_id = $1
              AND stage_id = $2
              AND finished_at IS NULL
          )
        `,
        [thesisId, currentStageId]
      );
    }
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

  private async ensureGuidanceWorkflow(studentId: string, stageId: GuidanceStage) {
    const existing = await this.readGuidanceWorkflow(studentId, stageId, this.db);
    if (existing) {
      return existing;
    }

    return this.withTransaction(async (client) =>
      this.replaceGuidanceWorkflowAndRead(
        studentId,
        stageId,
        createDefaultStudentWorkflowState().guidance[stageId],
        client
      )
    );
  }

  private async ensureGuidanceWorkflowWith(
    studentId: string,
    stageId: GuidanceStage,
    client: PostgresTransactionClient
  ) {
    const existing = await this.readGuidanceWorkflow(studentId, stageId, client);
    if (existing) {
      return existing;
    }

    return this.replaceGuidanceWorkflowAndRead(
      studentId,
      stageId,
      createDefaultStudentWorkflowState().guidance[stageId],
      client
    );
  }

  private async replaceGuidanceWorkflowAndRead(
    studentId: string,
    stageId: GuidanceStage,
    workflow: GuidanceWorkflow,
    client: PostgresTransactionClient
  ) {
    await this.replaceGuidanceWorkflowRecords(studentId, stageId, workflow, client);
    const saved = await this.readGuidanceWorkflow(studentId, stageId, client);

    if (!saved) {
      throw new Error("Student guidance workflow was not saved.");
    }

    return saved;
  }

  private async readGuidanceWorkflow(
    studentId: string,
    stageId: GuidanceStage,
    db: PostgresQueryExecutor
  ): Promise<GuidanceWorkflow | null> {
    const workflowResult = await db.query<GuidanceWorkflowRow>(
      `
        SELECT
          id,
          stage_id,
          google_docs_link,
          final_file_ref,
          pembimbing1_approved,
          pembimbing2_approved,
          guidance_status,
          guidance_requested_at,
          guidance_approved_at,
          guidance_start_date,
          guidance_start_time,
          guidance_note,
          guidance_approval_note
        FROM guidance_workflows
        WHERE student_id = $1
          AND stage_id = $2
        LIMIT 1
      `,
      [studentId, stageId]
    );

    const workflowRow = workflowResult.rows[0];
    if (!workflowRow) {
      return null;
    }

    const sessionsResult = await db.query<GuidanceSessionRow>(
      `
        SELECT
          id,
          session_number,
          title,
          status,
          session_status,
          session_start_date,
          session_start_time,
          catatan_mahasiswa,
          catatan_koordinator
        FROM guidance_sessions
        WHERE guidance_workflow_id = $1
        ORDER BY session_number ASC
      `,
      [workflowRow.id]
    );
    const chatsResult = await db.query<GuidanceChatRow>(
      `
        SELECT
          guidance_chats.id,
          guidance_sessions.session_number,
          guidance_chats.sender_name_snapshot,
          guidance_chats.sender_role,
          guidance_chats.message,
          guidance_chats.created_at
        FROM guidance_chats
        INNER JOIN guidance_sessions
          ON guidance_sessions.id = guidance_chats.guidance_session_id
        WHERE guidance_sessions.guidance_workflow_id = $1
        ORDER BY guidance_sessions.session_number ASC, guidance_chats.created_at ASC
      `,
      [workflowRow.id]
    );
    const chatsBySession = new Map<number, GuidanceSession["chats"]>();

    for (const chat of chatsResult.rows) {
      const current = chatsBySession.get(chat.session_number) || [];
      current.push({
        id: chat.id,
        senderName: chat.sender_name_snapshot,
        senderRole: chat.sender_role,
        message: chat.message,
        timestamp: toIsoOrNull(chat.created_at) || "",
      });
      chatsBySession.set(chat.session_number, current);
    }

    return {
      stageId: workflowRow.stage_id,
      googleDocsLink: workflowRow.google_docs_link,
      finalFile: workflowRow.final_file_ref,
      pembimbing1Approved: workflowRow.pembimbing1_approved,
      pembimbing2Approved: workflowRow.pembimbing2_approved,
      guidanceStatus: workflowRow.guidance_status,
      guidanceRequestedAt: toIsoOrNull(workflowRow.guidance_requested_at),
      guidanceApprovedAt: toIsoOrNull(workflowRow.guidance_approved_at),
      guidanceStartDate: toDateOnlyOrNull(workflowRow.guidance_start_date),
      guidanceTime: toTimeOnlyOrNull(workflowRow.guidance_start_time),
      guidanceNote: workflowRow.guidance_note,
      guidanceApprovalNote: workflowRow.guidance_approval_note,
      sessions: sessionsResult.rows.map((session) => ({
        id: session.session_number,
        title: session.title,
        status: session.status,
        chats: chatsBySession.get(session.session_number) || [],
        sessionStatus: session.session_status,
        sessionStartDate: toDateOnlyOrNull(session.session_start_date),
        sessionStartTime: toTimeOnlyOrNull(session.session_start_time),
        catatanMahasiswa: session.catatan_mahasiswa || undefined,
        catatanKoordinator: session.catatan_koordinator || undefined,
      })),
    };
  }

  private async replaceGuidanceWorkflowRecords(
    studentId: string,
    stageId: GuidanceStage,
    workflow: GuidanceWorkflow,
    client: PostgresTransactionClient
  ) {
    const workflowId = await this.upsertGuidanceWorkflow(studentId, stageId, workflow, client);
    await client.query(
      `
        DELETE FROM guidance_sessions
        WHERE guidance_workflow_id = $1
      `,
      [workflowId]
    );

    for (const session of workflow.sessions) {
      const insertedSession = await client.query<{ id: string }>(
        `
          INSERT INTO guidance_sessions (
            guidance_workflow_id,
            session_number,
            title,
            status,
            session_status,
            session_start_date,
            session_start_time,
            catatan_mahasiswa,
            catatan_koordinator,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING id
        `,
        [
          workflowId,
          session.id,
          session.title,
          session.status,
          session.sessionStatus,
          session.sessionStartDate,
          session.sessionStartTime,
          session.catatanMahasiswa || null,
          session.catatanKoordinator || null,
        ]
      );
      const sessionId = insertedSession.rows[0]?.id;

      if (!sessionId) {
        throw new Error("Student guidance session was not saved.");
      }

      await this.insertGuidanceChats(sessionId, session.chats, client);
    }
  }

  private async upsertGuidanceWorkflow(
    studentId: string,
    stageId: GuidanceStage,
    workflow: GuidanceWorkflow,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<GuidanceWorkflowRow>(
      `
        INSERT INTO guidance_workflows (
          student_id,
          stage_id,
          google_docs_link,
          final_file_ref,
          pembimbing1_approved,
          pembimbing2_approved,
          guidance_status,
          guidance_requested_at,
          guidance_approved_at,
          guidance_start_date,
          guidance_start_time,
          guidance_note,
          guidance_approval_note,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (student_id, stage_id) DO UPDATE
        SET
          google_docs_link = EXCLUDED.google_docs_link,
          final_file_ref = EXCLUDED.final_file_ref,
          pembimbing1_approved = EXCLUDED.pembimbing1_approved,
          pembimbing2_approved = EXCLUDED.pembimbing2_approved,
          guidance_status = EXCLUDED.guidance_status,
          guidance_requested_at = EXCLUDED.guidance_requested_at,
          guidance_approved_at = EXCLUDED.guidance_approved_at,
          guidance_start_date = EXCLUDED.guidance_start_date,
          guidance_start_time = EXCLUDED.guidance_start_time,
          guidance_note = EXCLUDED.guidance_note,
          guidance_approval_note = EXCLUDED.guidance_approval_note,
          updated_at = NOW()
        RETURNING id,
          stage_id,
          google_docs_link,
          final_file_ref,
          pembimbing1_approved,
          pembimbing2_approved,
          guidance_status,
          guidance_requested_at,
          guidance_approved_at,
          guidance_start_date,
          guidance_start_time,
          guidance_note,
          guidance_approval_note
      `,
      [
        studentId,
        stageId,
        workflow.googleDocsLink,
        workflow.finalFile,
        workflow.pembimbing1Approved,
        workflow.pembimbing2Approved,
        workflow.guidanceStatus,
        workflow.guidanceRequestedAt,
        workflow.guidanceApprovedAt,
        workflow.guidanceStartDate,
        workflow.guidanceTime,
        workflow.guidanceNote,
        workflow.guidanceApprovalNote,
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Student guidance workflow was not saved.");
    }

    return row.id;
  }

  private async insertGuidanceChats(
    sessionId: string,
    chats: GuidanceSession["chats"],
    client: PostgresTransactionClient
  ) {
    for (const chat of chats) {
      await client.query(
        `
          INSERT INTO guidance_chats (
            id,
            guidance_session_id,
            sender_name_snapshot,
            sender_role,
            message,
            created_at
          )
          VALUES (
            COALESCE($1::uuid, gen_random_uuid()),
            $2,
            $3,
            $4,
            $5,
            $6
          )
        `,
        [
          toUuidOrNull(chat.id),
          sessionId,
          chat.senderName,
          chat.senderRole,
          chat.message,
          toTimestampOrNow(chat.timestamp),
        ]
      );
    }
  }

  private async ensureExamWorkflow(studentId: string, stageId: ExamStage) {
    const existing = await this.readExamWorkflow(studentId, stageId, this.db);
    if (existing) {
      return existing;
    }

    return this.withTransaction(async (client) =>
      this.replaceExamWorkflowAndRead(
        studentId,
        stageId,
        createDefaultStudentWorkflowState().exams[stageId],
        client
      )
    );
  }

  private async ensureExamWorkflowWith(
    studentId: string,
    stageId: ExamStage,
    client: PostgresTransactionClient
  ) {
    const existing = await this.readExamWorkflow(studentId, stageId, client);
    if (existing) {
      return existing;
    }

    return this.replaceExamWorkflowAndRead(
      studentId,
      stageId,
      createDefaultStudentWorkflowState().exams[stageId],
      client
    );
  }

  private async replaceExamWorkflowAndRead(
    studentId: string,
    stageId: ExamStage,
    workflow: ExamWorkflow,
    client: PostgresTransactionClient
  ) {
    await this.replaceExamWorkflowRecords(studentId, stageId, workflow, client);
    const saved = await this.readExamWorkflow(studentId, stageId, client);

    if (!saved) {
      throw new Error("Student exam workflow was not saved.");
    }

    return saved;
  }

  private async readExamWorkflow(
    studentId: string,
    stageId: ExamStage,
    db: PostgresQueryExecutor
  ): Promise<ExamWorkflow | null> {
    const examResult = await db.query<ExamRow>(
      `
        SELECT
          id,
          stage_id,
          status,
          google_docs_link,
          submitted_at,
          grade,
          result_status,
          revision_notes,
          schedule_date,
          schedule_start_time,
          schedule_end_time,
          schedule_room,
          schedule_location
        FROM exams
        WHERE student_id = $1
          AND stage_id = $2
        LIMIT 1
      `,
      [studentId, stageId]
    );

    const exam = examResult.rows[0];
    if (!exam) {
      return null;
    }

    const requirementsResult = await db.query<ExamRequirementRow>(
      `
        SELECT
          id,
          requirement_key,
          label,
          fulfilled,
          note
        FROM exam_requirements
        WHERE exam_id = $1
        ORDER BY created_at ASC, label ASC
      `,
      [exam.id]
    );
    const panelistsResult = await db.query<ExamPanelistRow>(
      `
        SELECT
          id,
          lecturer_id,
          panelist_key,
          role,
          role_label,
          name_snapshot,
          nidn_snapshot,
          approved
        FROM exam_panelists
        WHERE exam_id = $1
        ORDER BY
          CASE role
            WHEN 'ketua-sidang' THEN 1
            WHEN 'penguji1' THEN 2
            WHEN 'penguji2' THEN 3
            ELSE 4
          END,
          created_at ASC
      `,
      [exam.id]
    );
    const scheduleDate = toDateOnlyOrNull(exam.schedule_date);
    const scheduleTime = toScheduleTimeRange(
      exam.schedule_start_time,
      exam.schedule_end_time
    );
    const hasSchedule = Boolean(
      scheduleDate ||
        scheduleTime ||
        exam.schedule_room ||
        exam.schedule_location
    );

    return {
      stageId: exam.stage_id,
      status: exam.status,
      googleDocsLink: exam.google_docs_link,
      submittedAt: toIsoOrNull(exam.submitted_at),
      grade: exam.grade,
      resultStatus: exam.result_status,
      revisionNotes: toStringArray(exam.revision_notes),
      requirements: requirementsResult.rows.map((requirement) => ({
        id: requirement.requirement_key || requirement.id,
        label: requirement.label,
        fulfilled: requirement.fulfilled,
        note: requirement.note || undefined,
      })),
      panelists: panelistsResult.rows.map((panelist) => ({
        id: panelist.panelist_key || panelist.id,
        role: panelist.role,
        roleLabel: panelist.role_label,
        name: panelist.name_snapshot,
        nidn: panelist.nidn_snapshot || "",
        approved: panelist.approved,
      })),
      schedule: hasSchedule
        ? {
            tanggal: scheduleDate || "",
            waktu: scheduleTime,
            ruang: exam.schedule_room || "",
            lokasi: exam.schedule_location || "",
          }
        : null,
    };
  }

  private async replaceExamWorkflowRecords(
    studentId: string,
    stageId: ExamStage,
    workflow: ExamWorkflow,
    client: PostgresTransactionClient
  ) {
    const examId = await this.upsertExamWorkflow(studentId, stageId, workflow, client);
    await client.query(
      `
        DELETE FROM exam_requirements
        WHERE exam_id = $1
      `,
      [examId]
    );
    await client.query(
      `
        DELETE FROM exam_panelists
        WHERE exam_id = $1
      `,
      [examId]
    );
    await this.insertExamRequirements(examId, workflow.requirements, client);
    await this.insertExamPanelists(examId, workflow.panelists, client);
    await this.syncCanonicalExamWorkflow(studentId, stageId, examId, workflow, client);
  }

  private async upsertExamWorkflow(
    studentId: string,
    stageId: ExamStage,
    workflow: ExamWorkflow,
    client: PostgresTransactionClient
  ) {
    const schedule = workflow.schedule;
    const scheduleTime = parseScheduleTimeRange(schedule?.waktu);
    const result = await client.query<ExamRow>(
      `
        INSERT INTO exams (
          student_id,
          stage_id,
          status,
          google_docs_link,
          submitted_at,
          grade,
          result_status,
          revision_notes,
          schedule_date,
          schedule_start_time,
          schedule_end_time,
          schedule_room,
          schedule_location,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, NOW()
        )
        ON CONFLICT (student_id, stage_id) DO UPDATE
        SET
          status = EXCLUDED.status,
          google_docs_link = EXCLUDED.google_docs_link,
          submitted_at = EXCLUDED.submitted_at,
          grade = EXCLUDED.grade,
          result_status = EXCLUDED.result_status,
          revision_notes = EXCLUDED.revision_notes,
          schedule_date = EXCLUDED.schedule_date,
          schedule_start_time = EXCLUDED.schedule_start_time,
          schedule_end_time = EXCLUDED.schedule_end_time,
          schedule_room = EXCLUDED.schedule_room,
          schedule_location = EXCLUDED.schedule_location,
          updated_at = NOW()
        RETURNING
          id,
          stage_id,
          status,
          google_docs_link,
          submitted_at,
          grade,
          result_status,
          revision_notes,
          schedule_date,
          schedule_start_time,
          schedule_end_time,
          schedule_room,
          schedule_location
      `,
      [
        studentId,
        stageId,
        workflow.status,
        workflow.googleDocsLink,
        workflow.submittedAt,
        workflow.grade,
        workflow.resultStatus,
        JSON.stringify(workflow.revisionNotes),
        schedule?.tanggal || null,
        scheduleTime.startTime,
        scheduleTime.endTime,
        schedule?.ruang || null,
        schedule?.lokasi || null,
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Student exam workflow was not saved.");
    }

    return row.id;
  }

  private async insertExamRequirements(
    examId: string,
    requirements: ExamWorkflow["requirements"],
    client: PostgresTransactionClient
  ) {
    for (const requirement of requirements) {
      await client.query(
        `
          INSERT INTO exam_requirements (
            id,
            exam_id,
            requirement_key,
            label,
            fulfilled,
            note,
            updated_at
          )
          VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, NOW())
        `,
        [
          toUuidOrNull(requirement.id),
          examId,
          requirement.id,
          requirement.label,
          requirement.fulfilled,
          requirement.note || null,
        ]
      );
    }
  }

  private async insertExamPanelists(
    examId: string,
    panelists: ExamWorkflow["panelists"],
    client: PostgresTransactionClient
  ) {
    for (const panelist of panelists) {
      await client.query(
        `
          INSERT INTO exam_panelists (
            id,
            exam_id,
            lecturer_id,
            panelist_key,
            role,
            role_label,
            name_snapshot,
            nidn_snapshot,
            approved,
            updated_at
          )
          VALUES (
            COALESCE($1::uuid, gen_random_uuid()),
            $2,
            (
              SELECT id
              FROM users
              WHERE id = $9::uuid
                 OR LOWER(identifier) = LOWER($10)
                 OR LOWER(name) = LOWER($6)
              ORDER BY
                CASE
                  WHEN id = $9::uuid THEN 1
                  WHEN LOWER(identifier) = LOWER($10) THEN 2
                  ELSE 3
                END
              LIMIT 1
            ),
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            NOW()
          )
        `,
        [
          toUuidOrNull(panelist.id),
          examId,
          panelist.id,
          panelist.role,
          panelist.roleLabel,
          panelist.name,
          panelist.nidn || null,
          panelist.approved,
          toUuidOrNull(panelist.id),
          panelist.nidn || "",
        ]
      );
    }
  }

  private async ensureRevisionWorkflow(studentId: string, stageId: RevisionStage) {
    const existing = await this.readRevisionWorkflow(studentId, stageId, this.db);
    if (existing) {
      return existing;
    }

    return this.withTransaction(async (client) =>
      this.replaceRevisionWorkflowAndRead(
        studentId,
        stageId,
        createDefaultStudentWorkflowState().revisions[stageId],
        client
      )
    );
  }

  private async ensureRevisionWorkflowWith(
    studentId: string,
    stageId: RevisionStage,
    client: PostgresTransactionClient
  ) {
    const existing = await this.readRevisionWorkflow(studentId, stageId, client);
    if (existing) {
      return existing;
    }

    return this.replaceRevisionWorkflowAndRead(
      studentId,
      stageId,
      createDefaultStudentWorkflowState().revisions[stageId],
      client
    );
  }

  private async replaceRevisionWorkflowAndRead(
    studentId: string,
    stageId: RevisionStage,
    workflow: RevisionWorkflow,
    client: PostgresTransactionClient
  ) {
    await this.replaceRevisionWorkflowRecords(studentId, stageId, workflow, client);
    const saved = await this.readRevisionWorkflow(studentId, stageId, client);

    if (!saved) {
      throw new Error("Student revision workflow was not saved.");
    }

    return saved;
  }

  private async readRevisionWorkflow(
    studentId: string,
    stageId: RevisionStage,
    db: PostgresQueryExecutor
  ): Promise<RevisionWorkflow | null> {
    const workflowResult = await db.query<RevisionWorkflowRow>(
      `
        SELECT
          id,
          stage_id,
          final_file_ref,
          penguji1_approved,
          penguji2_approved,
          ketua_sidang_status,
          submitted_at
        FROM revision_workflows
        WHERE student_id = $1
          AND stage_id = $2
        LIMIT 1
      `,
      [studentId, stageId]
    );

    const workflow = workflowResult.rows[0];
    if (!workflow) {
      return null;
    }

    const itemsResult = await db.query<RevisionItemRow>(
      `
        SELECT
          id,
          item_number,
          title,
          topik,
          materi,
          assigned_to_name_snapshot,
          status,
          submitted_at,
          penyelesaian,
          penyelesaian_link
        FROM revision_items
        WHERE revision_workflow_id = $1
        ORDER BY item_number ASC
      `,
      [workflow.id]
    );
    const chatsResult = await db.query<RevisionChatRow>(
      `
        SELECT
          revision_chats.id,
          revision_items.item_number,
          revision_chats.sender_name_snapshot,
          revision_chats.sender_role,
          revision_chats.message,
          revision_chats.created_at
        FROM revision_chats
        INNER JOIN revision_items
          ON revision_items.id = revision_chats.revision_item_id
        WHERE revision_items.revision_workflow_id = $1
        ORDER BY revision_items.item_number ASC, revision_chats.created_at ASC
      `,
      [workflow.id]
    );
    const chatsByItem = new Map<number, RevisionItem["chats"]>();

    for (const chat of chatsResult.rows) {
      const current = chatsByItem.get(chat.item_number) || [];
      current.push({
        id: chat.id,
        senderName: chat.sender_name_snapshot,
        senderRole: chat.sender_role,
        message: chat.message,
        timestamp: toIsoOrNull(chat.created_at) || "",
      });
      chatsByItem.set(chat.item_number, current);
    }

    return {
      stageId: workflow.stage_id,
      finalFile: workflow.final_file_ref,
      penguji1Approved: workflow.penguji1_approved,
      penguji2Approved: workflow.penguji2_approved,
      ketuaSidangStatus: workflow.ketua_sidang_status,
      submittedAt: toIsoOrNull(workflow.submitted_at),
      items: itemsResult.rows.map((item) => ({
        id: item.item_number,
        sourceRevisionItemId: item.id,
        title: item.title,
        topik: item.topik,
        materi: item.materi,
        assignedTo: item.assigned_to_name_snapshot || "",
        status: item.status,
        chats: chatsByItem.get(item.item_number) || [],
        submittedAt: toIsoOrNull(item.submitted_at) || undefined,
        penyelesaian: item.penyelesaian || undefined,
        penyelesaianLink: item.penyelesaian_link || undefined,
      })),
    };
  }

  private async replaceRevisionWorkflowRecords(
    studentId: string,
    stageId: RevisionStage,
    workflow: RevisionWorkflow,
    client: PostgresTransactionClient
  ) {
    const workflowId = await this.upsertRevisionWorkflow(studentId, stageId, workflow, client);
    const itemNumbers = workflow.items.map((item) => item.id);

    for (const item of workflow.items) {
      const insertedItem = await client.query<{ id: string }>(
        `
          INSERT INTO revision_items (
            id,
            revision_workflow_id,
            item_number,
            title,
            topik,
            materi,
            assigned_to_name_snapshot,
            status,
            submitted_at,
            penyelesaian,
            penyelesaian_link,
            updated_at
          )
          VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (revision_workflow_id, item_number) DO UPDATE
          SET
            title = EXCLUDED.title,
            topik = EXCLUDED.topik,
            materi = EXCLUDED.materi,
            assigned_to_name_snapshot = EXCLUDED.assigned_to_name_snapshot,
            status = EXCLUDED.status,
            submitted_at = EXCLUDED.submitted_at,
            penyelesaian = EXCLUDED.penyelesaian,
            penyelesaian_link = EXCLUDED.penyelesaian_link,
            updated_at = NOW()
          RETURNING id
        `,
        [
          toUuidOrNull(item.sourceRevisionItemId),
          workflowId,
          item.id,
          item.title,
          item.topik,
          item.materi,
          item.assignedTo || null,
          item.status,
          item.submittedAt || null,
          item.penyelesaian || null,
          item.penyelesaianLink || null,
        ]
      );
      const itemId = insertedItem.rows[0]?.id;

      if (!itemId) {
        throw new Error("Student revision item was not saved.");
      }

      await client.query(
        `
          DELETE FROM revision_chats
          WHERE revision_item_id = $1
        `,
        [itemId]
      );
      await this.insertRevisionChats(itemId, item.chats, client);
    }

    await client.query(
      `
        DELETE FROM revision_items
        WHERE revision_workflow_id = $1
          AND NOT (item_number = ANY($2::int[]))
      `,
      [workflowId, itemNumbers]
    );
    await this.syncCanonicalRevisionWorkflow(studentId, stageId, workflowId, workflow, client);
  }

  private async upsertRevisionWorkflow(
    studentId: string,
    stageId: RevisionStage,
    workflow: RevisionWorkflow,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<RevisionWorkflowRow>(
      `
        INSERT INTO revision_workflows (
          student_id,
          stage_id,
          final_file_ref,
          penguji1_approved,
          penguji2_approved,
          ketua_sidang_status,
          submitted_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (student_id, stage_id) DO UPDATE
        SET
          final_file_ref = EXCLUDED.final_file_ref,
          penguji1_approved = EXCLUDED.penguji1_approved,
          penguji2_approved = EXCLUDED.penguji2_approved,
          ketua_sidang_status = EXCLUDED.ketua_sidang_status,
          submitted_at = EXCLUDED.submitted_at,
          updated_at = NOW()
        RETURNING
          id,
          stage_id,
          final_file_ref,
          penguji1_approved,
          penguji2_approved,
          ketua_sidang_status,
          submitted_at
      `,
      [
        studentId,
        stageId,
        workflow.finalFile,
        workflow.penguji1Approved,
        workflow.penguji2Approved,
        workflow.ketuaSidangStatus,
        workflow.submittedAt,
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Student revision workflow was not saved.");
    }

    return row.id;
  }

  private async insertRevisionChats(
    itemId: string,
    chats: RevisionItem["chats"],
    client: PostgresTransactionClient
  ) {
    for (const chat of chats) {
      await client.query(
        `
          INSERT INTO revision_chats (
            id,
            revision_item_id,
            sender_name_snapshot,
            sender_role,
            message,
            created_at
          )
          VALUES (
            COALESCE($1::uuid, gen_random_uuid()),
            $2,
            $3,
            $4,
            $5,
            $6
          )
        `,
        [
          toUuidOrNull(chat.id),
          itemId,
          chat.senderName,
          chat.senderRole,
          chat.message,
          toTimestampOrNow(chat.timestamp),
        ]
      );
    }
  }

  private async syncCanonicalExamWorkflow(
    studentId: string,
    stageId: ExamStage,
    examId: string,
    workflow: ExamWorkflow,
    client: PostgresTransactionClient
  ) {
    const stageCode = canonicalStageCodeByExamStage[stageId];
    const revisionStageCode =
      stageId === "sidang-proposal" ? "PROPOSAL_REVISION" : "FINAL_REVISION";

    await client.query(
      `
        INSERT INTO stage_submissions (
          id,
          legacy_exam_id,
          thesis_id,
          student_id,
          thesis_stage_id,
          requirement_drive_link,
          status,
          submitted_at,
          validated_at,
          created_at,
          updated_at,
          updated_by
        )
        SELECT
          exam.id,
          exam.id,
          thesis.id,
          exam.student_id,
          stage.id,
          exam.google_docs_link,
          $3,
          exam.submitted_at,
          CASE WHEN exam.status = 'selesai' THEN COALESCE(exam.updated_at, NOW()) ELSE NULL END,
          COALESCE(exam.created_at, NOW()),
          exam.updated_at,
          exam.updated_by
        FROM exams exam
        JOIN thesis_stages stage
          ON stage.code = $2
        LEFT JOIN theses thesis
          ON thesis.student_id = exam.student_id
          AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
        WHERE exam.id = $1
        ON CONFLICT (id) DO UPDATE
        SET
          legacy_exam_id = EXCLUDED.legacy_exam_id,
          thesis_id = EXCLUDED.thesis_id,
          student_id = EXCLUDED.student_id,
          thesis_stage_id = EXCLUDED.thesis_stage_id,
          requirement_drive_link = EXCLUDED.requirement_drive_link,
          status = EXCLUDED.status,
          submitted_at = EXCLUDED.submitted_at,
          validated_at = EXCLUDED.validated_at,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `,
      [examId, stageCode, canonicalStageSubmissionStatusByExamStatus[workflow.status]]
    );

    await this.syncCanonicalScheduleAndAssessments(examId, client);
    await this.syncCanonicalExamRevisionNotes(examId, revisionStageCode, client);
  }

  private async syncCanonicalScheduleAndAssessments(
    examId: string,
    client: PostgresTransactionClient
  ) {
    const scheduleResult = await client.query<{ id: string }>(
      `
        INSERT INTO thesis_schedules (
          id,
          legacy_exam_id,
          student_id,
          thesis_id,
          thesis_stage_id,
          room,
          location,
          start_time,
          end_time,
          created_by,
          created_at,
          updated_at,
          updated_by
        )
        SELECT
          exam.id,
          exam.id,
          exam.student_id,
          thesis.id,
          stage.id,
          exam.schedule_room,
          exam.schedule_location,
          CASE
            WHEN exam.schedule_date IS NOT NULL AND exam.schedule_start_time IS NOT NULL
              THEN exam.schedule_date + exam.schedule_start_time
            ELSE NULL
          END,
          CASE
            WHEN exam.schedule_date IS NOT NULL AND exam.schedule_end_time IS NOT NULL
              THEN exam.schedule_date + exam.schedule_end_time
            ELSE NULL
          END,
          exam.updated_by,
          COALESCE(exam.created_at, NOW()),
          exam.updated_at,
          exam.updated_by
        FROM exams exam
        JOIN thesis_stages stage
          ON stage.legacy_step_id = exam.stage_id
        LEFT JOIN theses thesis
          ON thesis.student_id = exam.student_id
          AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
        WHERE exam.id = $1
          AND (
            exam.schedule_date IS NOT NULL
            OR NULLIF(TRIM(COALESCE(exam.schedule_room, '')), '') IS NOT NULL
            OR NULLIF(TRIM(COALESCE(exam.schedule_location, '')), '') IS NOT NULL
          )
        ON CONFLICT (id) DO UPDATE
        SET
          legacy_exam_id = EXCLUDED.legacy_exam_id,
          student_id = EXCLUDED.student_id,
          thesis_id = EXCLUDED.thesis_id,
          thesis_stage_id = EXCLUDED.thesis_stage_id,
          room = EXCLUDED.room,
          location = EXCLUDED.location,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          created_by = EXCLUDED.created_by,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
        RETURNING id
      `,
      [examId]
    );

    if (!scheduleResult.rows[0]) {
      await client.query(
        `
          DELETE FROM thesis_schedules
          WHERE legacy_exam_id = $1
        `,
        [examId]
      );
      return;
    }

    await client.query(
      `
        DELETE FROM thesis_assessments
        WHERE schedule_id = $1
      `,
      [scheduleResult.rows[0].id]
    );

    await client.query(
      `
        INSERT INTO thesis_assessments (
          schedule_id,
          examiner_id,
          role,
          created_at,
          updated_at,
          updated_by
        )
        SELECT
          $1,
          panelist.lecturer_id,
          CASE panelist.role
            WHEN 'ketua-sidang' THEN 'CHAIRMAN'
            WHEN 'penguji1' THEN 'EXAMINER_1'
            ELSE 'EXAMINER_2'
          END,
          COALESCE(panelist.created_at, NOW()),
          panelist.updated_at,
          panelist.updated_by
        FROM exam_panelists panelist
        WHERE panelist.exam_id = $2
          AND panelist.lecturer_id IS NOT NULL
      `,
      [scheduleResult.rows[0].id, examId]
    );
  }

  private async syncCanonicalExamRevisionNotes(
    examId: string,
    revisionStageCode: string,
    client: PostgresTransactionClient
  ) {
    await client.query(
      `
        DELETE FROM revision_notes note
        USING exams exam
        JOIN theses thesis
          ON thesis.student_id = exam.student_id
          AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
        JOIN thesis_stages stage
          ON stage.code = $2
        WHERE exam.id = $1
          AND note.thesis_id = thesis.id
          AND note.thesis_stage_id = stage.id
          AND note.assessment_id IS NULL
          AND note.legacy_revision_item_id IS NULL
      `,
      [examId, revisionStageCode]
    );

    await client.query(
      `
        INSERT INTO revision_notes (
          thesis_id,
          thesis_stage_id,
          title,
          note,
          status,
          created_at,
          updated_at,
          updated_by
        )
        SELECT
          thesis.id,
          stage.id,
          LEFT(note_text.value, 255),
          note_text.value,
          'PENDING',
          COALESCE(exam.updated_at, NOW()),
          exam.updated_at,
          exam.updated_by
        FROM exams exam
        JOIN theses thesis
          ON thesis.student_id = exam.student_id
          AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
        JOIN thesis_stages stage
          ON stage.code = $2
        CROSS JOIN LATERAL jsonb_array_elements_text(exam.revision_notes::jsonb) AS note_text(value)
        WHERE exam.id = $1
          AND NULLIF(TRIM(note_text.value), '') IS NOT NULL
      `,
      [examId, revisionStageCode]
    );
  }

  private async syncCanonicalRevisionWorkflow(
    studentId: string,
    stageId: RevisionStage,
    workflowId: string,
    workflow: RevisionWorkflow,
    client: PostgresTransactionClient
  ) {
    const stageCode = canonicalStageCodeByRevisionStage[stageId];

    await client.query(
      `
        INSERT INTO stage_submissions (
          id,
          legacy_revision_workflow_id,
          thesis_id,
          student_id,
          thesis_stage_id,
          latest_document_file,
          status,
          submitted_at,
          validated_at,
          created_at,
          updated_at,
          updated_by
        )
        SELECT
          workflow.id,
          workflow.id,
          thesis.id,
          workflow.student_id,
          stage.id,
          workflow.final_file_ref,
          $4,
          workflow.submitted_at,
          CASE WHEN workflow.ketua_sidang_status = 'approved' THEN COALESCE(workflow.updated_at, NOW()) ELSE NULL END,
          COALESCE(workflow.created_at, NOW()),
          workflow.updated_at,
          workflow.updated_by
        FROM revision_workflows workflow
        JOIN thesis_stages stage
          ON stage.code = $3
        LEFT JOIN theses thesis
          ON thesis.student_id = workflow.student_id
          AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
        WHERE workflow.id = $1
          AND workflow.student_id = $2
        ON CONFLICT (id) DO UPDATE
        SET
          legacy_revision_workflow_id = EXCLUDED.legacy_revision_workflow_id,
          thesis_id = EXCLUDED.thesis_id,
          student_id = EXCLUDED.student_id,
          thesis_stage_id = EXCLUDED.thesis_stage_id,
          latest_document_file = EXCLUDED.latest_document_file,
          status = EXCLUDED.status,
          submitted_at = EXCLUDED.submitted_at,
          validated_at = EXCLUDED.validated_at,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `,
      [
        workflowId,
        studentId,
        stageCode,
        canonicalStageSubmissionStatusByRevisionWorkflow(workflow),
      ]
    );

    await client.query(
      `
        INSERT INTO revision_notes (
          legacy_revision_item_id,
          thesis_id,
          thesis_stage_id,
          title,
          note,
          status,
          created_at,
          updated_at,
          updated_by
        )
        SELECT
          item.id,
          thesis.id,
          stage.id,
          item.title,
          COALESCE(NULLIF(TRIM(item.materi), ''), item.topik, item.penyelesaian),
          CASE item.status
            WHEN 'done' THEN 'COMPLETED'
            WHEN 'in progress' THEN 'PENDING'
            ELSE 'DRAFT'
          END,
          COALESCE(item.created_at, NOW()),
          item.updated_at,
          item.updated_by
        FROM revision_items item
        JOIN revision_workflows workflow
          ON workflow.id = item.revision_workflow_id
        JOIN thesis_stages stage
          ON stage.code = $3
        LEFT JOIN theses thesis
          ON thesis.student_id = workflow.student_id
          AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
        WHERE workflow.id = $1
          AND workflow.student_id = $2
        ON CONFLICT (legacy_revision_item_id) DO UPDATE
        SET
          thesis_id = EXCLUDED.thesis_id,
          thesis_stage_id = EXCLUDED.thesis_stage_id,
          title = EXCLUDED.title,
          note = EXCLUDED.note,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `,
      [workflowId, studentId, stageCode]
    );

    await client.query(
      `
        UPDATE guidance_materials material
        SET revision_note_id = note.id
        FROM revision_notes note
        WHERE note.legacy_revision_item_id = material.source_revision_item_id
          AND material.revision_note_id IS NULL
      `
    );
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
