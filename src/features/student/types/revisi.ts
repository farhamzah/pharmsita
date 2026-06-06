// ============================================================
// Types: Revisi (Proposal & Akhir) Workflow
// Reusable untuk tahapan Revisi Seminar Proposal dan Revisi Sidang Akhir
// ============================================================

import type { ChatMessage } from "./bimbingan";

export interface RevisiItem {
  id: number;
  title: string;
  topik: string;
  materi: string;
  status: "pending" | "in progress" | "done";
  assignedTo: string; // nama penguji yang memberikan revisi
  chats: ChatMessage[];
  penyelesaian?: string;
  penyelesaianLink?: string;
  submittedAt?: string;
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

