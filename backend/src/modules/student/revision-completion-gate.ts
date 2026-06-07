import type {
  RevisionCompletionGateStatus,
  RevisionStage,
  RevisionWorkflow,
  StepId,
  UserAccount,
} from "../../domain/types";
import { conflict } from "../../http/errors";
import { studentWorkflowRepository } from "../../repositories";
import { auditService } from "../audit/audit-service";

const revisionStepIds: RevisionStage[] = ["revisi-proposal", "revisi-sidang"];

export const isRevisionStepId = (stepId: StepId): stepId is RevisionStage =>
  revisionStepIds.includes(stepId as RevisionStage);

const itemStatusSummary = (workflow: RevisionWorkflow) => {
  const doneCount = workflow.items.filter((item) => item.status === "done").length;
  return `${doneCount}/${workflow.items.length} butir selesai`;
};

const blockingReasonByCode: Record<RevisionCompletionGateStatus["checks"][number]["code"], string> = {
  REVISION_ITEMS_AVAILABLE: "Belum ada butir revisi yang bisa divalidasi.",
  REVISION_ITEMS_DONE: "Semua butir revisi harus berstatus selesai.",
  PENGUJI_1_APPROVED: "Approval Penguji 1 belum disetujui.",
  PENGUJI_2_APPROVED: "Approval Penguji 2 belum disetujui.",
  CHAIR_APPROVED: "Approval Ketua Sidang belum disetujui.",
  FINAL_FILE_UPLOADED: "Dokumen final hasil revisi belum diunggah.",
};

export const buildRevisionCompletionGateStatus = (
  workflow: RevisionWorkflow
): RevisionCompletionGateStatus => {
  const checks: RevisionCompletionGateStatus["checks"] = [
    {
      code: "REVISION_ITEMS_AVAILABLE",
      label: "Butir revisi tersedia",
      passed: workflow.items.length > 0,
      detail:
        workflow.items.length > 0
          ? `${workflow.items.length} butir revisi tersedia`
          : "Belum ada butir revisi yang bisa divalidasi.",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "REVISION_ITEMS_DONE",
      label: "Semua butir revisi selesai",
      passed: workflow.items.length > 0 && workflow.items.every((item) => item.status === "done"),
      detail: itemStatusSummary(workflow),
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "PENGUJI_1_APPROVED",
      label: "Approval Penguji 1",
      passed: workflow.penguji1Approved,
      detail: workflow.penguji1Approved ? "Disetujui" : "Belum disetujui",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "PENGUJI_2_APPROVED",
      label: "Approval Penguji 2",
      passed: workflow.penguji2Approved,
      detail: workflow.penguji2Approved ? "Disetujui" : "Belum disetujui",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "CHAIR_APPROVED",
      label: "Approval Ketua Sidang",
      passed: workflow.ketuaSidangStatus === "approved",
      detail:
        workflow.ketuaSidangStatus === "approved"
          ? "Disetujui"
          : workflow.ketuaSidangStatus === "rejected"
            ? "Ditolak"
            : "Menunggu",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "FINAL_FILE_UPLOADED",
      label: "Dokumen final hasil revisi",
      passed: Boolean(workflow.finalFile),
      detail: workflow.finalFile || "Belum diunggah",
      requiredFor: ["progress-completion"],
    },
  ];

  const finalUploadBlockingReasons = checks
    .filter((check) => check.requiredFor.includes("final-upload") && !check.passed)
    .map((check) => blockingReasonByCode[check.code]);
  const progressCompletionBlockingReasons = checks
    .filter((check) => check.requiredFor.includes("progress-completion") && !check.passed)
    .map((check) => blockingReasonByCode[check.code]);

  return {
    stageId: workflow.stageId,
    readyForFinalUpload: finalUploadBlockingReasons.length === 0,
    readyForProgressCompletion: progressCompletionBlockingReasons.length === 0,
    finalFile: workflow.finalFile,
    finalUploadBlockingReasons,
    progressCompletionBlockingReasons,
    blockingReasons: progressCompletionBlockingReasons,
    checks,
    evaluatedAt: new Date().toISOString(),
  };
};

export const getRevisionCompletionGateStatus = async (
  studentId: string,
  stageId: RevisionStage
) => buildRevisionCompletionGateStatus(
  await studentWorkflowRepository.getRevision(studentId, stageId)
);

export const recordRevisionCompletionGateAudit = async (
  input: {
    actor?: UserAccount | null;
    action:
      | "REVISION_COMPLETION_GATE_READ"
      | "REVISION_COMPLETION_GATE_BLOCKED"
      | "REVISION_COMPLETION_GATE_ALLOWED";
    studentId: string;
    stageId: RevisionStage;
    gate: RevisionCompletionGateStatus;
    reason?: string;
  }
) => auditService.record({
  actor: input.actor,
  action: input.action,
  resourceType: "revision-completion-gate",
  resourceId: `${input.studentId}:${input.stageId}`,
  after: input.gate,
  reason: input.reason,
});

export const assertRevisionReadyForFinalUpload = (
  workflow: RevisionWorkflow
) => {
  const gate = buildRevisionCompletionGateStatus(workflow);

  if (!gate.readyForFinalUpload) {
    throw conflict("Dokumen final revisi belum bisa diunggah.", {
      issues: gate.finalUploadBlockingReasons,
      completionGate: gate,
    });
  }
};

export const assertRevisionReadyForProgressCompletion = (
  workflow: RevisionWorkflow
) => {
  const gate = buildRevisionCompletionGateStatus(workflow);

  if (!gate.readyForProgressCompletion) {
    throw conflict("Tahap revisi belum bisa diselesaikan.", {
      issues: gate.progressCompletionBlockingReasons,
      completionGate: gate,
    });
  }
};

export const assertRevisionStepCanBeCompleted = async (
  studentId: string,
  stageId: RevisionStage,
  actor?: UserAccount | null
) => {
  const workflow = await studentWorkflowRepository.getRevision(studentId, stageId);
  const gate = buildRevisionCompletionGateStatus(workflow);

  await recordRevisionCompletionGateAudit({
    actor,
    action: gate.readyForProgressCompletion
      ? "REVISION_COMPLETION_GATE_ALLOWED"
      : "REVISION_COMPLETION_GATE_BLOCKED",
    studentId,
    stageId,
    gate,
    reason: gate.readyForProgressCompletion
      ? "Progress completion gate allowed."
      : gate.progressCompletionBlockingReasons.join("; "),
  });

  if (!gate.readyForProgressCompletion) {
    throw conflict("Tahap revisi belum bisa diselesaikan.", {
      issues: gate.progressCompletionBlockingReasons,
      completionGate: gate,
    });
  }
};
