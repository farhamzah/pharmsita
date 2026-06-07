// ============================================================
// Types: Revisi (Proposal & Akhir) Workflow
// Reusable untuk tahapan Revisi Seminar Proposal dan Revisi Sidang Akhir
// ============================================================

import type { ChatMessage } from "./bimbingan";

export interface RevisiItem {
  id: number;
  sourceRevisionItemId?: string;
  title: string;
  topik: string;
  materi: string;
  status: "pending" | "in progress" | "done";
  assignedTo: string; // nama penguji yang memberikan revisi
  chats: ChatMessage[];
  penyelesaian?: string;
  penyelesaianLink?: string;
  submittedAt?: string;
  revisionMaterialId?: string;
  revisionMaterialStatus?: "Draft" | "Diajukan" | "Valid" | "Ditolak";
  revisionMaterialAttemptNumber?: number;
  revisionMaterialLecturerNote?: string;
}

export interface RevisiData {
  stageId: "revisi-proposal" | "revisi-sidang";
  penguji1Approved: boolean;
  penguji2Approved: boolean;
  ketuaSidangStatus: "pending" | "approved" | "rejected";
  items: RevisiItem[];
  finalFile: string | null;
  submittedAt: string | null;
}

export type RevisionCompletionGateAction = "final-upload" | "progress-completion";

export interface RevisionCompletionGateCheck {
  code:
    | "REVISION_ITEMS_AVAILABLE"
    | "REVISION_ITEMS_DONE"
    | "PENGUJI_1_APPROVED"
    | "PENGUJI_2_APPROVED"
    | "CHAIR_APPROVED"
    | "FINAL_FILE_UPLOADED";
  label: string;
  passed: boolean;
  detail: string;
  requiredFor: RevisionCompletionGateAction[];
}

export interface RevisionCompletionGateStatus {
  stageId: RevisiData["stageId"];
  readyForFinalUpload: boolean;
  readyForProgressCompletion: boolean;
  finalFile: string | null;
  finalUploadBlockingReasons: string[];
  progressCompletionBlockingReasons: string[];
  blockingReasons: string[];
  checks: RevisionCompletionGateCheck[];
  evaluatedAt: string;
}
