import type { ChatMessage } from "../types/bimbingan";
import type { RevisiData } from "../types/revisi";
import { storageService } from "../../../core/services/storage-service";

const STORAGE_KEY_PREFIX = "student_revisi_v1_";

const createEmptyRevisiData = (stageId: "revisi-proposal" | "revisi-sidang"): RevisiData => ({
  stageId,
  penguji1Approved: false,
  penguji2Approved: false,
  ketuaSidangStatus: "pending",
  items: [],
  finalFile: null,
  submittedAt: null,
});

const isLegacySeedData = (data: RevisiData): boolean =>
  data.items.length > 0 && !data.finalFile && !data.submittedAt;

class RevisiService {
  private getKey(stageId: string): string {
    return `${STORAGE_KEY_PREFIX}${stageId}`;
  }

  getData(stageId: "revisi-proposal" | "revisi-sidang"): RevisiData {
    const key = this.getKey(stageId);
    const saved = storageService.get<RevisiData>(key);

    if (saved && !isLegacySeedData(saved)) {
      return saved;
    }

    if (saved) {
      storageService.remove(key);
    }

    const emptyData = createEmptyRevisiData(stageId);
    this.save(stageId, emptyData);
    return emptyData;
  }

  private save(stageId: string, data: RevisiData): void {
    storageService.set(this.getKey(stageId), data);
  }

  updateItemStatus(
    stageId: "revisi-proposal" | "revisi-sidang",
    itemId: number,
    status: "pending" | "in progress" | "done"
  ): RevisiData {
    const data = this.getData(stageId);
    const item = data.items.find((entry) => entry.id === itemId);
    if (item) {
      item.status = status;
    }
    this.save(stageId, data);
    return data;
  }

  submitPenyelesaian(
    stageId: "revisi-proposal" | "revisi-sidang",
    itemId: number,
    penyelesaian: string,
    penyelesaianLink: string
  ): RevisiData {
    const data = this.getData(stageId);
    const item = data.items.find((entry) => entry.id === itemId);
    if (item) {
      item.status = "in progress";
      item.penyelesaian = penyelesaian;
      item.penyelesaianLink = penyelesaianLink;
      item.submittedAt = new Date().toISOString();
    }
    this.save(stageId, data);
    return data;
  }

  addChatMessage(
    stageId: "revisi-proposal" | "revisi-sidang",
    itemId: number,
    senderName: string,
    senderRole: "mahasiswa" | "dosen",
    message: string
  ): RevisiData {
    const data = this.getData(stageId);
    const item = data.items.find((entry) => entry.id === itemId);
    if (item) {
      const newChat: ChatMessage = {
        id: `rc_${stageId}_${itemId}_${Date.now()}`,
        senderName,
        senderRole,
        message,
        timestamp: new Date().toISOString(),
      };
      item.chats.push(newChat);
      if (item.status === "pending") {
        item.status = "in progress";
      }
    }
    this.save(stageId, data);
    return data;
  }

  updateApproval(
    stageId: "revisi-proposal" | "revisi-sidang",
    role: "penguji1" | "penguji2" | "ketua-sidang",
    status: boolean | "pending" | "approved" | "rejected"
  ): RevisiData {
    const data = this.getData(stageId);
    if (role === "penguji1") {
      data.penguji1Approved = !!status;
    } else if (role === "penguji2") {
      data.penguji2Approved = !!status;
    } else {
      data.ketuaSidangStatus = status as "pending" | "approved" | "rejected";
    }
    this.save(stageId, data);
    return data;
  }

  uploadFinalFile(stageId: "revisi-proposal" | "revisi-sidang", fileName: string): RevisiData {
    const data = this.getData(stageId);
    data.finalFile = fileName;
    this.save(stageId, data);
    return data;
  }

  simulateAllApproved(stageId: "revisi-proposal" | "revisi-sidang"): RevisiData {
    const data = this.getData(stageId);
    data.items.forEach((item) => {
      item.status = "done";
    });
    data.penguji1Approved = true;
    data.penguji2Approved = true;
    data.ketuaSidangStatus = "approved";
    this.save(stageId, data);
    return data;
  }

  reset(stageId: "revisi-proposal" | "revisi-sidang"): RevisiData {
    storageService.remove(this.getKey(stageId));
    return this.getData(stageId);
  }
}

export const revisiService = new RevisiService();
