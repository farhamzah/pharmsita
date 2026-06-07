export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: "mahasiswa" | "dosen";
  message: string;
  timestamp: string;
}

export type GuidanceType =
  | "seminar-proposal"
  | "sidang-akhir"
  | "revisi-seminar-proposal"
  | "revisi-sidang-akhir";

export type GuidanceRequestStatus =
  | "Draft"
  | "Menunggu Validasi Dosen"
  | "Disetujui"
  | "Ditolak";

export type GuidanceMaterialStatus = "Draft" | "Diajukan" | "Valid" | "Ditolak";

export interface GuidanceMaterialSummary {
  validCount: number;
  requiredValidCount: number;
  pendingCount: number;
  rejectedCount: number;
  canSubmitNextGate: boolean;
}

export interface GuidanceMaterial {
  id: string;
  guidanceRequestId: string;
  materialType: "normal" | "revision";
  sourceRevisionItemId?: string | null;
  topic: string;
  content?: string;
  status: GuidanceMaterialStatus;
  attemptNumber: number;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  lecturerNote?: string;
  attemptSummary?: {
    totalAttempts: number;
    latestAttemptNumber: number;
    latestMaterialId: string;
    latestStatus: GuidanceMaterialStatus;
    isLatestAttempt: boolean;
    hasRejectedAttempt: boolean;
    latestRejectedNote?: string;
    latestRejectedAt?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface GuidanceRequestAggregate {
  id: string;
  studentId: string;
  guidanceType: GuidanceType;
  googleDocsLink: string;
  status: GuidanceRequestStatus;
  studentNote?: string;
  lecturerNote?: string;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  activeLecturerId?: string | null;
  activeLecturerName?: string;
  materialSummary: GuidanceMaterialSummary;
  materials: GuidanceMaterial[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface BimbinganSession {
  id: number; // 1 s.d. 8
  title: string;
  status: "pending" | "in progress" | "approved";
  chats: ChatMessage[];
  sessionStatus?: 'idle' | 'requested' | 'approved';
  sessionStartDate?: string | null;
  sessionStartTime?: string | null;
  materialId?: string;
  materialStatus?: GuidanceMaterialStatus;
  lecturerNote?: string;
  attemptNumber?: number;
  submittedAt?: string | null;
  validatedAt?: string | null;
}

export type GuidanceStatus = 'idle' | 'requested' | 'approved';

export interface BimbinganData {
  stageId: string; // e.g. 'bimbingan-pra-proposal' atau 'bimbingan-pra-sidang'
  guidanceRequestId?: string;
  guidanceType?: GuidanceType;
  requestStatus?: GuidanceRequestStatus;
  googleDocsLink: string;
  activeLecturerId?: string | null;
  activeLecturerName?: string;
  materialSummary?: GuidanceMaterialSummary;
  pembimbing1Approved: boolean;
  pembimbing2Approved: boolean;
  sessions: BimbinganSession[];
  finalFile: string | null;
  guidanceStatus: GuidanceStatus;
  guidanceRequestedAt: string | null;   // ISO timestamp
  guidanceApprovedAt: string | null;    // ISO timestamp
  guidanceStartDate: string | null;     // YYYY-MM-DD (tanggal mulai ditentukan dosen)
  guidanceTime: string | null;          // HH:MM (jam bimbingan ditentukan dosen)
  guidanceNote: string | null;          // Catatan mahasiswa saat mengajukan
  guidanceApprovalNote: string | null;  // Catatan pembimbing saat menyetujui
}
