// ============================================================
// Service: Revisi Workflow
// State management untuk tahapan Revisi Seminar Proposal & Revisi Sidang Akhir
// Menggunakan storage mock untuk persistensi sementara.
// ============================================================

import type { RevisiData } from "../types/revisi";
import type { ChatMessage } from "../types/bimbingan";
import { storageService } from "../../../core/services/storage-service";

const STORAGE_KEY_PREFIX = "student_revisi_v1_";

const EXAMINER_1 = "Dr. Budi Harto, M.Farm.";
const EXAMINER_2 = "Dr. Andi Wijaya, M.Si.";

const DEFAULT_REVISION_TOPICS_PROPOSAL = [
  {
    id: 1,
    title: "Bab 1: Perjelas latar belakang pemilihan ekstrak daun sirih dibanding tanaman antiseptik lain.",
    topik: "Latar Belakang Daun Sirih",
    materi: "Perjelas latar belakang pemilihan ekstrak daun sirih dibanding tanaman antiseptik lain.",
    assignedTo: EXAMINER_1,
    status: "pending" as const,
    chats: [],
  },
  {
    id: 2,
    title: "Bab 2: Mutakhirkan pustaka jurnal 5 tahun terakhir untuk metode uji aktivitas bakteri.",
    topik: "Tinjauan Pustaka Aktivitas Bakteri",
    materi: "Mutakhirkan pustaka jurnal 5 tahun terakhir untuk metode uji aktivitas bakteri.",
    assignedTo: EXAMINER_1,
    status: "pending" as const,
    chats: [],
  },
  {
    id: 3,
    title: "Bab 3: Tambahkan penjelasan rinci mengenai variasi konsentrasi basis gel (Carbopol 940).",
    topik: "Formulasi Carbopol 940",
    materi: "Tambahkan penjelasan rinci mengenai variasi konsentrasi basis gel (Carbopol 940).",
    assignedTo: EXAMINER_2,
    status: "pending" as const,
    chats: [],
  },
  {
    id: 4,
    title: "Bab 4: Tambahkan rencana analisis statistik ANOVA satu arah untuk uji stabilitas fisik gel.",
    topik: "Analisis Statistik ANOVA",
    materi: "Tambahkan rencana analisis statistik ANOVA satu arah untuk uji stabilitas fisik gel.",
    assignedTo: EXAMINER_2,
    status: "pending" as const,
    chats: [],
  },
];

const DEFAULT_REVISION_TOPICS_SIDANG = [
  {
    id: 1,
    title: "Bab 4: Koreksi kesimpulan mengenai keefektifan antibakteri gel daun sirih.",
    topik: "Kesimpulan Keefektifan Antibakteri",
    materi: "Koreksi kesimpulan mengenai keefektifan antibakteri gel daun sirih.",
    assignedTo: EXAMINER_1,
    status: "pending" as const,
    chats: [],
  },
  {
    id: 2,
    title: "Bab 5: Tambahkan saran untuk pengujian in-vivo di laboratorium lanjutan.",
    topik: "Saran Pengujian In-Vivo",
    materi: "Tambahkan saran untuk pengujian in-vivo di laboratorium lanjutan.",
    assignedTo: EXAMINER_2,
    status: "pending" as const,
    chats: [],
  },
];

function createDefaultData(stageId: "revisi-proposal" | "revisi-sidang"): RevisiData {
  const isProposal = stageId === "revisi-proposal";
  return {
    stageId,
    penguji1Approved: false,
    penguji2Approved: false,
    ketuaSidangStatus: "pending",
    items: isProposal ? DEFAULT_REVISION_TOPICS_PROPOSAL : DEFAULT_REVISION_TOPICS_SIDANG,
    finalFile: null,
    submittedAt: null,
  };
}

class RevisiService {
  private getKey(stageId: string): string {
    return `${STORAGE_KEY_PREFIX}${stageId}`;
  }

  getData(stageId: "revisi-proposal" | "revisi-sidang"): RevisiData {
    const saved = storageService.get<RevisiData>(this.getKey(stageId));
    if (saved) {
      return saved;
    }
    const defaultData = createDefaultData(stageId);
    this.save(stageId, defaultData);
    return defaultData;
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
    const item = data.items.find((i) => i.id === itemId);
    if (item) {
      item.status = status;
    }
    this.save(stageId, data);
    return this.getData(stageId);
  }

  submitPenyelesaian(
    stageId: "revisi-proposal" | "revisi-sidang",
    itemId: number,
    penyelesaian: string,
    penyelesaianLink: string
  ): RevisiData {
    const data = this.getData(stageId);
    const item = data.items.find((i) => i.id === itemId);
    if (item) {
      item.status = "in progress";
      item.penyelesaian = penyelesaian;
      item.penyelesaianLink = penyelesaianLink;
      item.submittedAt = new Date().toISOString();
    }
    this.save(stageId, data);
    return this.getData(stageId);
  }

  addChatMessage(
    stageId: "revisi-proposal" | "revisi-sidang",
    itemId: number,
    senderName: string,
    senderRole: "mahasiswa" | "dosen",
    message: string
  ): RevisiData {
    const data = this.getData(stageId);
    const item = data.items.find((i) => i.id === itemId);
    if (item) {
      const newChat: ChatMessage = {
        id: `rc_${stageId}_${itemId}_${Date.now()}`,
        senderName,
        senderRole,
        message,
        timestamp: new Date().toISOString(),
      };
      item.chats.push(newChat);

      // Otomatis ubah status ke 'in progress' jika mahasiswa/dosen membalas chat
      if (item.status === "pending") {
        item.status = "in progress";
      }
    }
    this.save(stageId, data);
    return this.getData(stageId);
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
    } else if (role === "ketua-sidang") {
      data.ketuaSidangStatus = status as "pending" | "approved" | "rejected";
    }
    this.save(stageId, data);
    return this.getData(stageId);
  }

  uploadFinalFile(stageId: "revisi-proposal" | "revisi-sidang", fileName: string): RevisiData {
    const data = this.getData(stageId);
    data.finalFile = fileName;
    this.save(stageId, data);
    return this.getData(stageId);
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
    return this.getData(stageId);
  }

  reset(stageId: "revisi-proposal" | "revisi-sidang"): RevisiData {
    storageService.remove(this.getKey(stageId));
    return this.getData(stageId);
  }
}

export const revisiService = new RevisiService();
