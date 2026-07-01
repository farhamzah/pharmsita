import type { BimbinganData, BimbinganSession, ChatMessage } from "../types/bimbingan";
import { storageService } from "../../../core/services/storage-service";

const LOCAL_STORAGE_PREFIX = "student_bimbingan_data_";
const REQUIRED_SESSION_COUNT = 8;

const createDefaultSessions = (): BimbinganSession[] =>
  Array.from({ length: REQUIRED_SESSION_COUNT }, (_, index) => ({
    id: index + 1,
    title: `Bimbingan ${index + 1} (Belum diisi)`,
    status: "pending",
    sessionStatus: "idle",
    sessionStartDate: null,
    sessionStartTime: null,
    chats: [],
  }));

const createEmptyBimbinganData = (stageId: string): BimbinganData => ({
  stageId,
  googleDocsLink: "",
  pembimbing1Approved: false,
  pembimbing2Approved: false,
  sessions: createDefaultSessions(),
  finalFile: null,
  guidanceStatus: "idle",
  guidanceRequestedAt: null,
  guidanceApprovedAt: null,
  guidanceStartDate: null,
  guidanceTime: null,
  guidanceNote: null,
  guidanceApprovalNote: null,
});

const isLegacySeedData = (data: BimbinganData): boolean => {
  if (data.guidanceApprovedAt === "2026-05-19T10:00:00Z") return true;
  return data.sessions.some((session) => session.id <= 4 && session.chats.length > 0);
};

export class BimbinganService {
  private getKey(stageId: string): string {
    return `${LOCAL_STORAGE_PREFIX}${stageId}`;
  }

  getBimbinganData(stageId: string): BimbinganData {
    const key = this.getKey(stageId);
    const saved = storageService.get<BimbinganData>(key);

    if (saved && !isLegacySeedData(saved)) {
      return saved;
    }

    if (saved) {
      storageService.remove(key);
    }

    const emptyData = createEmptyBimbinganData(stageId);
    this.saveBimbinganData(stageId, emptyData);
    return emptyData;
  }

  saveBimbinganData(stageId: string, data: BimbinganData) {
    storageService.set(this.getKey(stageId), data);
  }

  updateGoogleDocsLink(stageId: string, link: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.googleDocsLink = link;
    this.saveBimbinganData(stageId, data);
    return data;
  }

  updateApproval(stageId: string, pembimbingNum: 1 | 2, approved: boolean): BimbinganData {
    const data = this.getBimbinganData(stageId);
    if (pembimbingNum === 1) {
      data.pembimbing1Approved = approved;
    } else {
      data.pembimbing2Approved = approved;
    }
    this.saveBimbinganData(stageId, data);
    return data;
  }

  updateSession(
    stageId: string,
    sessionId: number,
    title: string,
    status: "pending" | "in progress" | "approved"
  ): BimbinganData {
    const data = this.getBimbinganData(stageId);
    const session = data.sessions.find((item) => item.id === sessionId);

    if (session) {
      session.title = title;
      session.status = status;
      if (status === "approved") {
        session.sessionStatus = "approved";
      }
      this.saveBimbinganData(stageId, data);
    }

    return data;
  }

  addChatMessage(
    stageId: string,
    sessionId: number,
    senderName: string,
    senderRole: "mahasiswa" | "dosen",
    message: string
  ): BimbinganData {
    const data = this.getBimbinganData(stageId);
    const session = data.sessions.find((item) => item.id === sessionId);

    if (session) {
      const newMsg: ChatMessage = {
        id: `msg_${sessionId}_${Date.now()}`,
        senderName,
        senderRole,
        message,
        timestamp: new Date().toISOString(),
      };
      session.chats.push(newMsg);
      if (session.status === "pending") {
        session.status = "in progress";
      }
      this.saveBimbinganData(stageId, data);
    }

    return data;
  }

  uploadFinalFile(stageId: string, fileName: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.finalFile = fileName;
    this.saveBimbinganData(stageId, data);
    return data;
  }

  resetBimbinganData(stageId: string): BimbinganData {
    storageService.remove(this.getKey(stageId));
    return this.getBimbinganData(stageId);
  }

  requestGuidance(stageId: string, note: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.guidanceStatus = "requested";
    data.guidanceRequestedAt = new Date().toISOString();
    data.guidanceNote = note || null;
    data.guidanceApprovedAt = null;
    data.guidanceStartDate = null;
    data.guidanceTime = null;
    data.guidanceApprovalNote = null;
    this.saveBimbinganData(stageId, data);
    return data;
  }

  approveGuidance(stageId: string, startDate: string, startTime: string, approvalNote: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.guidanceStatus = "approved";
    data.guidanceApprovedAt = new Date().toISOString();
    data.guidanceStartDate = startDate;
    data.guidanceTime = startTime;
    data.guidanceApprovalNote = approvalNote || null;
    this.saveBimbinganData(stageId, data);
    return data;
  }

  requestSessionGuidance(stageId: string, sessionId: number): BimbinganData {
    const data = this.getBimbinganData(stageId);
    const session = data.sessions.find((item) => item.id === sessionId);
    if (session) {
      session.sessionStatus = "requested";
      session.sessionStartDate = null;
      session.sessionStartTime = null;
      this.saveBimbinganData(stageId, data);
    }
    return data;
  }

  approveSessionGuidance(stageId: string, sessionId: number, startDate: string, startTime: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    const session = data.sessions.find((item) => item.id === sessionId);
    if (session) {
      session.sessionStatus = "approved";
      session.status = "in progress";
      session.sessionStartDate = startDate;
      session.sessionStartTime = startTime;
      session.title = session.title.includes("Belum diisi")
        ? `Diskusi Topik Bimbingan ${sessionId}`
        : session.title;
      this.saveBimbinganData(stageId, data);
    }
    return data;
  }

  resetGuidance(stageId: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.guidanceStatus = "idle";
    data.guidanceRequestedAt = null;
    data.guidanceApprovedAt = null;
    data.guidanceStartDate = null;
    data.guidanceTime = null;
    data.guidanceApprovalNote = null;
    data.sessions = createDefaultSessions();
    this.saveBimbinganData(stageId, data);
    return data;
  }
}

export const bimbinganService = new BimbinganService();
