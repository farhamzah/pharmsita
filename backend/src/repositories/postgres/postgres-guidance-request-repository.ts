import type {
  PostgresConnectionPool,
  PostgresQueryExecutor,
  PostgresTransactionClient,
} from "../../database/postgres/connection";
import type {
  GuidanceMaterial,
  GuidanceRequest,
  GuidanceRequestStatus,
  GuidanceScheduleStatus,
  GuidanceType,
  StepId,
} from "../../domain/types";
import type {
  GuidanceMaterialSubmissionInput,
  GuidanceMaterialValidationInput,
  GuidanceRequestRepository,
  GuidanceRequestSaveInput,
  GuidanceRequestValidationInput,
} from "../contracts";
import { toIso } from "./row-mappers";

const requiredValidMaterialCount = 8;

const requestColumns = `
  gw.id,
  gw.student_id,
  gw.stage_id,
  gw.guidance_type,
  gw.google_docs_link,
  gw.guidance_status,
  gw.request_status,
  gw.guidance_requested_at,
  gw.guidance_note,
  gw.guidance_approval_note,
  gw.guidance_approved_at,
  gw.validated_at,
  gw.validated_by,
  gw.lecturer_note,
  gw.created_at,
  gw.updated_at,
  gw.updated_by,
  active_supervisor.lecturer_id::TEXT AS active_lecturer_id,
  active_supervisor.lecturer_name_snapshot AS active_lecturer_name
`;

const requestBaseFrom = `
  FROM guidance_workflows gw
  LEFT JOIN LATERAL (
    SELECT
      sa.lecturer_id,
      sa.lecturer_name_snapshot
    FROM final_project_registrations fpr
    JOIN supervisor_assignments sa
      ON sa.registration_id = fpr.id
      AND sa.status = 'Aktif'
    WHERE fpr.student_id = gw.student_id
      AND fpr.status = 'Disetujui'
    ORDER BY sa.supervisor_order ASC, sa.assigned_at ASC
    LIMIT 1
  ) active_supervisor ON TRUE
`;

const materialColumns = `
  id,
  guidance_workflow_id,
  guidance_request_id,
  revision_note_id,
  submitted_by,
  title,
  material_type,
  source_revision_item_id,
  topic,
  content,
  status,
  canonical_status,
  attempt_number,
  submitted_at,
  validated_at,
  validated_by,
  lecturer_note,
  created_at,
  updated_at,
  updated_by
`;

interface GuidanceRequestRow {
  id: string;
  student_id: string;
  stage_id: StepId;
  guidance_type: GuidanceType | null;
  google_docs_link: string;
  guidance_status: GuidanceScheduleStatus;
  request_status: GuidanceRequestStatus;
  guidance_requested_at: Date | string | null;
  guidance_note: string | null;
  guidance_approval_note: string | null;
  guidance_approved_at: Date | string | null;
  validated_at: Date | string | null;
  validated_by: string | null;
  lecturer_note: string | null;
  created_at: Date | string;
  updated_at: Date | string | null;
  updated_by: string | null;
  active_lecturer_id: string | null;
  active_lecturer_name: string | null;
}

interface GuidanceMaterialRow {
  id: string;
  guidance_workflow_id: string;
  guidance_request_id: string | null;
  revision_note_id: string | null;
  submitted_by: string | null;
  title: string | null;
  material_type: GuidanceMaterial["materialType"];
  source_revision_item_id: string | null;
  topic: string;
  content: string | null;
  status: GuidanceMaterial["status"];
  canonical_status: string | null;
  attempt_number: number;
  submitted_at: Date | string | null;
  validated_at: Date | string | null;
  validated_by: string | null;
  lecturer_note: string | null;
  created_at: Date | string;
  updated_at: Date | string | null;
  updated_by: string | null;
}

const stageIdByGuidanceType: Record<GuidanceType, StepId> = {
  "seminar-proposal": "bimbingan-pra-proposal",
  "sidang-akhir": "bimbingan-pra-sidang",
  "revisi-seminar-proposal": "revisi-proposal",
  "revisi-sidang-akhir": "revisi-sidang",
};

const guidanceTypeByStageId: Partial<Record<StepId, GuidanceType>> = {
  "bimbingan-pra-proposal": "seminar-proposal",
  "bimbingan-pra-sidang": "sidang-akhir",
  "revisi-proposal": "revisi-seminar-proposal",
  "revisi-sidang": "revisi-sidang-akhir",
};

const toCanonicalMaterialStatus = (status: GuidanceMaterial["status"]) => {
  switch (status) {
    case "Draft":
      return "DRAFT";
    case "Diajukan":
      return "PENDING";
    case "Valid":
      return "VALID";
    case "Ditolak":
      return "REJECTED";
    default:
      return "PENDING";
  }
};

const toMaterial = (row: GuidanceMaterialRow): GuidanceMaterial => ({
  id: row.id,
  guidanceRequestId: row.guidance_request_id || row.guidance_workflow_id,
  materialType: row.material_type,
  sourceRevisionItemId: row.source_revision_item_id,
  topic: row.title || row.topic,
  content: row.content || undefined,
  status: row.status,
  attemptNumber: Number(row.attempt_number),
  submittedAt: toIso(row.submitted_at),
  validatedAt: toIso(row.validated_at),
  validatedBy: row.validated_by,
  lecturerNote: row.lecturer_note || undefined,
  createdAt: toIso(row.created_at) || undefined,
  updatedAt: toIso(row.updated_at) || undefined,
  updatedBy: row.updated_by,
});

const materialAttemptGroupKey = (material: GuidanceMaterial) =>
  material.materialType === "revision" && material.sourceRevisionItemId
    ? `revision:${material.sourceRevisionItemId}`
    : `normal:${material.topic}`;

const byAttemptOldest = (left: GuidanceMaterial, right: GuidanceMaterial) => {
  if (left.attemptNumber !== right.attemptNumber) {
    return left.attemptNumber - right.attemptNumber;
  }

  const leftTime = left.submittedAt || left.createdAt || left.updatedAt || left.id;
  const rightTime = right.submittedAt || right.createdAt || right.updatedAt || right.id;
  return leftTime.localeCompare(rightTime);
};

const withAttemptSummaries = (materials: GuidanceMaterial[]) => {
  const groups = new Map<string, GuidanceMaterial[]>();

  for (const material of materials) {
    const key = materialAttemptGroupKey(material);
    const current = groups.get(key) || [];
    current.push(material);
    groups.set(key, current);
  }

  for (const group of groups.values()) {
    group.sort(byAttemptOldest);
    const latest = group[group.length - 1];
    const latestRejected = [...group]
      .reverse()
      .find((item) => item.status === "Ditolak");

    for (const material of group) {
      material.attemptSummary = {
        totalAttempts: group.length,
        latestAttemptNumber: latest.attemptNumber,
        latestMaterialId: latest.id,
        latestStatus: latest.status,
        isLatestAttempt: material.id === latest.id,
        hasRejectedAttempt: group.some((item) => item.status === "Ditolak"),
        latestRejectedNote: latestRejected?.lecturerNote,
        latestRejectedAt:
          latestRejected?.validatedAt || latestRejected?.updatedAt || null,
      };
    }
  }

  return materials;
};

export class PostgresGuidanceRequestRepository
  implements GuidanceRequestRepository
{
  constructor(private readonly pool: PostgresConnectionPool) {}

  async listForStudent(studentId: string) {
    const result = await this.pool.query<GuidanceRequestRow>(
      `
        SELECT ${requestColumns}
        ${requestBaseFrom}
        WHERE gw.student_id = $1
        ORDER BY COALESCE(gw.updated_at, gw.guidance_requested_at, gw.validated_at, gw.created_at) DESC,
          gw.id DESC
      `,
      [studentId]
    );

    return this.hydrate(result.rows, this.pool);
  }

  async findById(id: string) {
    const result = await this.pool.query<GuidanceRequestRow>(
      `
        SELECT ${requestColumns}
        ${requestBaseFrom}
        WHERE gw.id = $1
        LIMIT 1
      `,
      [id]
    );
    const requests = await this.hydrate(result.rows, this.pool);
    return requests[0] || null;
  }

  async getForStudent(studentId: string, id: string) {
    const result = await this.pool.query<GuidanceRequestRow>(
      `
        SELECT ${requestColumns}
        ${requestBaseFrom}
        WHERE gw.id = $1
          AND gw.student_id = $2
        LIMIT 1
      `,
      [id, studentId]
    );
    const requests = await this.hydrate(result.rows, this.pool);
    return requests[0] || null;
  }

  async createForStudent(studentId: string, input: GuidanceRequestSaveInput) {
    const row = await this.withTransaction(async (client) => {
      const stageId = stageIdByGuidanceType[input.guidanceType];
      const result = await client.query<GuidanceRequestRow>(
        `
          INSERT INTO guidance_workflows (
            student_id,
            stage_id,
            guidance_type,
            google_docs_link,
            guidance_status,
            request_status,
            guidance_requested_at,
            guidance_note,
            created_at,
            updated_at,
            updated_by
          )
          VALUES (
            $1, $2, $3, $4, 'requested', 'Menunggu Validasi Dosen',
            $5, $6, $5, $5, $7
          )
          ON CONFLICT (student_id, stage_id)
          DO UPDATE SET
            guidance_type = EXCLUDED.guidance_type,
            google_docs_link = EXCLUDED.google_docs_link,
            guidance_status = 'requested',
            request_status = 'Menunggu Validasi Dosen',
            guidance_requested_at = EXCLUDED.guidance_requested_at,
            guidance_note = EXCLUDED.guidance_note,
            guidance_approved_at = NULL,
            guidance_approval_note = NULL,
            validated_at = NULL,
            validated_by = NULL,
            lecturer_note = NULL,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
          RETURNING id
        `,
        [
          studentId,
          stageId,
          input.guidanceType,
          input.googleDocsLink,
          input.timestamp,
          input.studentNote || null,
          input.actorId,
        ]
      );

      if (result.rows[0]) {
        await this.syncCanonicalGuidanceRequestByWorkflowId(
          result.rows[0].id,
          client
        );
      }

      return result.rows[0];
    });

    const request = row ? await this.findById(row.id) : null;
    if (!request) {
      throw new Error("Guidance request was not saved.");
    }

    return request;
  }

  async listForLecturer(lecturerId: string) {
    const result = await this.pool.query<GuidanceRequestRow>(
      `
        SELECT ${requestColumns}
        ${requestBaseFrom}
        WHERE EXISTS (
          SELECT 1
          FROM final_project_registrations fpr
          JOIN supervisor_assignments sa
            ON sa.registration_id = fpr.id
            AND sa.status = 'Aktif'
          WHERE fpr.student_id = gw.student_id
            AND fpr.status = 'Disetujui'
            AND sa.lecturer_id = $1
        )
        OR EXISTS (
          SELECT 1
          FROM exams e
          JOIN exam_panelists ep
            ON ep.exam_id = e.id
          WHERE e.student_id = gw.student_id
            AND ep.lecturer_id = $1
        )
        OR EXISTS (
          SELECT 1
          FROM revision_workflows rw
          JOIN revision_items ri
            ON ri.revision_workflow_id = rw.id
          WHERE rw.student_id = gw.student_id
            AND ri.assigned_to_user_id = $1
        )
        ORDER BY COALESCE(gw.updated_at, gw.guidance_requested_at, gw.validated_at, gw.created_at) DESC,
          gw.id DESC
      `,
      [lecturerId]
    );

    return this.hydrate(result.rows, this.pool);
  }

  async validateRequest(id: string, input: GuidanceRequestValidationInput) {
    const result = await this.withTransaction(async (client) => {
      const updated = await client.query<{ id: string }>(
        `
          UPDATE guidance_workflows
          SET
            guidance_status = CASE WHEN $2 = 'Disetujui' THEN 'approved' ELSE guidance_status END,
            request_status = $2,
            guidance_approved_at = CASE WHEN $2 = 'Disetujui' THEN $4 ELSE guidance_approved_at END,
            guidance_approval_note = $3,
            validated_at = $4,
            validated_by = $5,
            lecturer_note = $3,
            updated_at = $4,
            updated_by = $5
          WHERE id = $1
          RETURNING id
        `,
        [id, input.status, input.lecturerNote || null, input.timestamp, input.actorId]
      );

      if (updated.rows[0]) {
        await this.syncCanonicalGuidanceRequestByWorkflowId(
          updated.rows[0].id,
          client
        );
      }

      return updated;
    });

    return result.rows[0] ? this.findById(result.rows[0].id) : null;
  }

  async listMaterials(id: string) {
    const result = await this.pool.query<GuidanceMaterialRow>(
      `
        SELECT ${materialColumns}
        FROM guidance_materials
        WHERE guidance_workflow_id = $1
        ORDER BY created_at ASC, attempt_number ASC, id ASC
      `,
      [id]
    );

    return withAttemptSummaries(result.rows.map(toMaterial));
  }

  async submitMaterial(id: string, input: GuidanceMaterialSubmissionInput) {
    const row = await this.withTransaction(async (client) => {
      const request = await client.query<{ id: string }>(
        `
          SELECT id
          FROM guidance_workflows
          WHERE id = $1
          FOR UPDATE
        `,
        [id]
      );

      if (!request.rows[0]) {
        return null;
      }

      await this.syncCanonicalGuidanceRequestByWorkflowId(id, client);

      const attemptResult = await client.query<{ next_attempt_number: string }>(
        `
          SELECT (COALESCE(MAX(attempt_number), 0) + 1)::TEXT AS next_attempt_number
          FROM guidance_materials
          WHERE guidance_workflow_id = $1
            AND material_type = $2
            AND (
              $2 <> 'revision'
              OR source_revision_item_id = $3::uuid
            )
        `,
        [id, input.materialType, input.sourceRevisionItemId || null]
      );
      const attemptNumber = Number(
        attemptResult.rows[0]?.next_attempt_number || "1"
      );
      const inserted = await client.query<GuidanceMaterialRow>(
        `
          INSERT INTO guidance_materials (
            guidance_workflow_id,
            guidance_request_id,
            submitted_by,
            title,
            material_type,
            source_revision_item_id,
            revision_note_id,
            topic,
            content,
            status,
            canonical_status,
            attempt_number,
            submitted_at,
            created_at,
            updated_at,
            updated_by
          )
          VALUES (
            $1,
            $1,
            $8,
            $4,
            $2,
            $3,
            (
              SELECT id
              FROM revision_notes
              WHERE legacy_revision_item_id = $3::uuid
              LIMIT 1
            ),
            $4,
            $5,
            'Diajukan',
            'PENDING',
            $6,
            $7,
            $7,
            $7,
            $8
          )
          RETURNING ${materialColumns}
        `,
        [
          id,
          input.materialType,
          input.sourceRevisionItemId || null,
          input.topic,
          input.content || null,
          attemptNumber,
          input.timestamp,
          input.actorId,
        ]
      );

      await client.query(
        `
          UPDATE guidance_workflows
          SET updated_at = $2, updated_by = $3
          WHERE id = $1
        `,
        [id, input.timestamp, input.actorId]
      );

      const material = inserted.rows[0] || null;
      if (material) {
        await this.syncCanonicalGuidanceMaterialById(material.id, client);
      }

      return material;
    });

    return row ? toMaterial(row) : null;
  }

  async validateMaterial(id: string, input: GuidanceMaterialValidationInput) {
    const row = await this.withTransaction(async (client) => {
      const result = await client.query<GuidanceMaterialRow>(
        `
          UPDATE guidance_materials
          SET
            status = $2,
            canonical_status = $6,
            lecturer_note = $3,
            validated_at = $4,
            validated_by = $5,
            updated_at = $4,
            updated_by = $5
          WHERE id = $1
          RETURNING ${materialColumns}
        `,
        [
          id,
          input.status,
          input.lecturerNote || null,
          input.timestamp,
          input.actorId,
          toCanonicalMaterialStatus(input.status),
        ]
      );
      const material = result.rows[0];

      if (!material) {
        return null;
      }

      await client.query(
        `
          UPDATE guidance_workflows
          SET updated_at = $2, updated_by = $3
          WHERE id = $1
        `,
        [material.guidance_workflow_id, input.timestamp, input.actorId]
      );

      await this.syncCanonicalGuidanceRequestByWorkflowId(
        material.guidance_workflow_id,
        client
      );
      await this.syncCanonicalGuidanceMaterialById(material.id, client);

      return material;
    });

    return row ? toMaterial(row) : null;
  }

  private async syncCanonicalGuidanceRequestByWorkflowId(
    guidanceWorkflowId: string,
    client: PostgresTransactionClient
  ) {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO guidance_requests (
          id,
          legacy_guidance_workflow_id,
          thesis_id,
          submitted_by,
          approved_by,
          thesis_stage_id,
          document_link,
          status,
          validate_note,
          submitted_at,
          approved_at,
          created_at,
          updated_at,
          updated_by
        )
        SELECT
          gw.id,
          gw.id,
          thesis.id,
          gw.student_id,
          gw.validated_by,
          stage.id,
          COALESCE(gw.google_docs_link, ''),
          CASE gw.request_status
            WHEN 'Draft' THEN 'DRAFT'
            WHEN 'Menunggu Validasi Dosen' THEN 'PENDING'
            WHEN 'Disetujui' THEN 'APPROVED'
            WHEN 'Ditolak' THEN 'REJECTED'
            ELSE CASE gw.guidance_status
              WHEN 'requested' THEN 'PENDING'
              WHEN 'approved' THEN 'APPROVED'
              ELSE 'DRAFT'
            END
          END,
          COALESCE(gw.lecturer_note, gw.guidance_approval_note, gw.guidance_note),
          gw.guidance_requested_at,
          COALESCE(gw.validated_at, gw.guidance_approved_at),
          COALESCE(gw.created_at, NOW()),
          gw.updated_at,
          gw.updated_by
        FROM guidance_workflows gw
        JOIN thesis_stages stage
          ON stage.legacy_step_id = gw.stage_id
        LEFT JOIN theses thesis
          ON thesis.student_id = gw.student_id
          AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
        WHERE gw.id = $1
        ON CONFLICT (id) DO UPDATE
        SET
          legacy_guidance_workflow_id = EXCLUDED.legacy_guidance_workflow_id,
          thesis_id = EXCLUDED.thesis_id,
          submitted_by = EXCLUDED.submitted_by,
          approved_by = EXCLUDED.approved_by,
          thesis_stage_id = EXCLUDED.thesis_stage_id,
          document_link = EXCLUDED.document_link,
          status = EXCLUDED.status,
          validate_note = EXCLUDED.validate_note,
          submitted_at = EXCLUDED.submitted_at,
          approved_at = EXCLUDED.approved_at,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
        RETURNING id
      `,
      [guidanceWorkflowId]
    );

    if (!result.rows[0]) {
      throw new Error("Canonical guidance stage mapping is missing.");
    }

    return result.rows[0].id;
  }

  private async syncCanonicalGuidanceMaterialById(
    materialId: string,
    client: PostgresTransactionClient
  ) {
    await client.query(
      `
        UPDATE guidance_materials material
        SET
          guidance_request_id = request.id,
          submitted_by = COALESCE(material.submitted_by, workflow.student_id),
          title = COALESCE(NULLIF(TRIM(material.title), ''), material.topic),
          canonical_status = CASE material.status
            WHEN 'Draft' THEN 'DRAFT'
            WHEN 'Diajukan' THEN 'PENDING'
            WHEN 'Valid' THEN 'VALID'
            WHEN 'Ditolak' THEN 'REJECTED'
            ELSE 'PENDING'
          END,
          revision_note_id = COALESCE(material.revision_note_id, note.id)
        FROM guidance_workflows workflow
        LEFT JOIN guidance_requests request
          ON request.legacy_guidance_workflow_id = workflow.id
        LEFT JOIN revision_notes note
          ON note.legacy_revision_item_id = material.source_revision_item_id
        WHERE material.id = $1
          AND workflow.id = material.guidance_workflow_id
      `,
      [materialId]
    );
  }

  private async hydrate(
    rows: GuidanceRequestRow[],
    db: PostgresQueryExecutor
  ): Promise<GuidanceRequest[]> {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const materialResult = await db.query<GuidanceMaterialRow>(
      `
        SELECT ${materialColumns}
        FROM guidance_materials
        WHERE guidance_workflow_id = ANY($1::uuid[])
        ORDER BY created_at ASC, attempt_number ASC, id ASC
      `,
      [ids]
    );
    const materialsByRequest = new Map<string, GuidanceMaterial[]>();

    for (const row of materialResult.rows) {
      const current = materialsByRequest.get(row.guidance_workflow_id) || [];
      current.push(toMaterial(row));
      materialsByRequest.set(row.guidance_workflow_id, current);
    }

    return rows.map((row) => {
      const materials = withAttemptSummaries(materialsByRequest.get(row.id) || []);
      const validCount = materials.filter((item) => item.status === "Valid").length;
      const pendingCount = materials.filter(
        (item) => item.status === "Diajukan"
      ).length;
      const rejectedCount = materials.filter(
        (item) => item.status === "Ditolak"
      ).length;

      return {
        id: row.id,
        studentId: row.student_id,
        guidanceType:
          row.guidance_type || guidanceTypeByStageId[row.stage_id] || "seminar-proposal",
        googleDocsLink: row.google_docs_link,
        status: row.request_status,
        studentNote: row.guidance_note || undefined,
        lecturerNote:
          row.lecturer_note || row.guidance_approval_note || undefined,
        submittedAt: toIso(row.guidance_requested_at),
        validatedAt: toIso(row.validated_at || row.guidance_approved_at),
        validatedBy: row.validated_by,
        activeLecturerId: row.active_lecturer_id,
        activeLecturerName: row.active_lecturer_name || undefined,
        materialSummary: {
          validCount,
          requiredValidCount: requiredValidMaterialCount,
          pendingCount,
          rejectedCount,
          canSubmitNextGate: validCount >= requiredValidMaterialCount,
        },
        materials,
        createdAt: toIso(row.created_at) || undefined,
        updatedAt: toIso(row.updated_at) || undefined,
        updatedBy: row.updated_by,
      };
    });
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
