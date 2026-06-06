export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: "mahasiswa" | "dosen";
  message: string;
  timestamp: string;
}

export interface BimbinganSession {
  id: number; // 1 s.d. 8
  title: string;
  status: "pending" | "in progress" | "approved";
  chats: ChatMessage[];
  sessionStatus?: 'idle' | 'requested' | 'approved';
  sessionStartDate?: string | null;
  sessionStartTime?: string | null;
}

export type GuidanceStatus = 'idle' | 'requested' | 'approved';

export interface BimbinganData {
  stageId: string; // e.g. 'bimbingan-pra-proposal' atau 'bimbingan-pra-sidang'
  googleDocsLink: string;
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

