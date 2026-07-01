import type {
  SidangData,
  SidangResultStatus,
  SidangStatus,
} from "../types/sidang";
import { storageService } from "../../../core/services/storage-service";

const STORAGE_KEY_PREFIX = "student_sidang_v2_";

const createEmptySidangData = (stageId: "sidang-proposal" | "sidang"): SidangData => ({
  stageId,
  status: "belum-daftar",
  panelists: [],
  schedule: null,
  requirements: [],
  submittedAt: null,
  googleDocsLink: "",
  grade: null,
  resultStatus: "belum-dinilai",
  revisionNotes: [],
});

const isLegacySeedData = (data: SidangData): boolean =>
  Boolean(data.schedule?.ruang === "Ruang Seminar A") ||
  data.panelists.length >= 5 ||
  data.revisionNotes.length >= 4;

class SidangService {
  private getKey(stageId: string): string {
    return `${STORAGE_KEY_PREFIX}${stageId}`;
  }

  getData(stageId: "sidang-proposal" | "sidang"): SidangData {
    const key = this.getKey(stageId);
    const saved = storageService.get<SidangData>(key);

    if (saved && !isLegacySeedData(saved)) {
      return saved;
    }

    if (saved) {
      storageService.remove(key);
    }

    const emptyData = createEmptySidangData(stageId);
    this.save(stageId, emptyData);
    return emptyData;
  }

  private save(stageId: string, data: SidangData): void {
    storageService.set(this.getKey(stageId), data);
  }

  updateStatus(stageId: "sidang-proposal" | "sidang", status: SidangStatus): SidangData {
    const data = this.getData(stageId);
    data.status = status;
    if (status === "menunggu-jadwal" && !data.submittedAt) {
      data.submittedAt = new Date().toISOString();
    }
    this.save(stageId, data);
    return data;
  }

  updateAssessment(
    stageId: "sidang-proposal" | "sidang",
    grade: string | null,
    resultStatus: SidangResultStatus
  ): SidangData {
    const data = this.getData(stageId);
    data.grade = grade;
    data.resultStatus = resultStatus;
    if (resultStatus === "lulus" || resultStatus === "lulus-dengan-revisi") {
      data.status = "selesai";
    }
    this.save(stageId, data);
    return data;
  }

  toggleRequirement(stageId: "sidang-proposal" | "sidang", reqId: string): SidangData {
    const data = this.getData(stageId);
    const req = data.requirements.find((item) => item.id === reqId);
    if (req) {
      req.fulfilled = !req.fulfilled;
    }
    this.save(stageId, data);
    return data;
  }

  togglePanelistApproval(stageId: "sidang-proposal" | "sidang", panelistId: string): SidangData {
    const data = this.getData(stageId);
    const panelist = data.panelists.find((item) => item.id === panelistId);
    if (panelist) {
      panelist.approved = !panelist.approved;
    }
    this.save(stageId, data);
    return data;
  }

  updateDocsLink(stageId: "sidang-proposal" | "sidang", link: string): SidangData {
    const data = this.getData(stageId);
    data.googleDocsLink = link;
    this.save(stageId, data);
    return data;
  }

  simulateAllApproved(stageId: "sidang-proposal" | "sidang"): SidangData {
    const data = this.getData(stageId);
    data.requirements.forEach((item) => {
      item.fulfilled = true;
    });
    data.panelists.forEach((item) => {
      item.approved = true;
    });
    this.save(stageId, data);
    return data;
  }

  reset(stageId: "sidang-proposal" | "sidang"): SidangData {
    storageService.remove(this.getKey(stageId));
    return this.getData(stageId);
  }
}

export const sidangService = new SidangService();
