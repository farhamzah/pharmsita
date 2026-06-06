import type { BimbinganData, BimbinganSession, ChatMessage } from "../types/bimbingan";
import { storageService } from "../../../core/services/storage-service";

const LOCAL_STORAGE_PREFIX = "student_bimbingan_data_";

const createDefaultSessions = (): BimbinganSession[] => [
  {
    id: 1,
    title: "Diskusi Topik Utama & Latar Belakang Masalah",
    status: "approved",
    sessionStatus: "approved",
    sessionStartDate: "2026-05-20",
    sessionStartTime: "09:30",
    chats: [
      {
        id: "msg_1_1",
        senderName: "Dimas Indra Jaya",
        senderRole: "mahasiswa",
        message: "Assalamualaikum wr. wb. Bu Rina, saya ingin berkonsultasi mengenai ide judul Tugas Akhir bertema formulasi gel daun sirih.",
        timestamp: "2026-05-10T09:00:00Z",
      },
      {
        id: "msg_1_2",
        senderName: "Dr. Apt. Rina Marlina, M.Farm.",
        senderRole: "dosen",
        message: "Waalaikumsalam, ide bagus Dimas. Silakan susun rancangan latar belakang dan fokus uji stabilitasnya. Kumpulkan draftnya di sini ya.",
        timestamp: "2026-05-10T11:15:00Z",
      },
      {
        id: "msg_1_3",
        senderName: "Dimas Indra Jaya",
        senderRole: "mahasiswa",
        message: "Baik bu, sudah saya lampirkan draf latar belakang pada tautan Google Docs di atas. Terima kasih bu.",
        timestamp: "2026-05-11T08:00:00Z",
      },
      {
        id: "msg_1_4",
        senderName: "Dr. Apt. Rina Marlina, M.Farm.",
        senderRole: "dosen",
        message: "Saya sudah membacanya. Secara garis besar sudah oke, bisa dilanjutkan ke penyusunan bab Tinjauan Pustaka. Topik bimbingan ini saya approve.",
        timestamp: "2026-05-12T14:30:00Z",
      },
    ],
  },
  {
    id: 2,
    title: "Penyusunan Tinjauan Pustaka & Kajian Teori Gel Stabilitas",
    status: "approved",
    sessionStatus: "approved",
    sessionStartDate: "2026-05-27",
    sessionStartTime: "09:30",
    chats: [
      {
        id: "msg_2_1",
        senderName: "Dimas Indra Jaya",
        senderRole: "mahasiswa",
        message: "Pagi bu, untuk Tinjauan Pustaka mengenai uji stabilitas dipercepat, apakah saya perlu merujuk pada standar ICH Guideline?",
        timestamp: "2026-05-14T08:30:00Z",
      },
      {
        id: "msg_2_2",
        senderName: "Dr. Apt. Rina Marlina, M.Farm.",
        senderRole: "dosen",
        message: "Ya betul, sangat disarankan menggunakan ICH Q1A untuk stabilitas sediaan baru agar metodologinya kuat.",
        timestamp: "2026-05-14T10:00:00Z",
      },
      {
        id: "msg_2_3",
        senderName: "Dr. Apt. Rina Marlina, M.Farm.",
        senderRole: "dosen",
        message: "Silakan tambahkan juga literatur daun sirih dari jurnal 5 tahun terakhir.",
        timestamp: "2026-05-14T10:02:00Z",
      },
    ],
  },
  {
    id: 3,
    title: "Pembahasan Metode Penelitian & Desain Formulasi",
    status: "approved",
    sessionStatus: "approved",
    sessionStartDate: "2026-06-03",
    sessionStartTime: "09:30",
    chats: [
      {
        id: "msg_3_1",
        senderName: "Dimas Indra Jaya",
        senderRole: "mahasiswa",
        message: "Siang bu, berikut merupakan persentase konsentrasi ekstrak yang akan saya uji yaitu 2%, 4%, dan 6%. Mohon arahannya.",
        timestamp: "2026-05-16T13:00:00Z",
      },
      {
        id: "msg_3_2",
        senderName: "Dr. Apt. Rina Marlina, M.Farm.",
        senderRole: "dosen",
        message: "Rentang konsentrasinya sudah bagus. Pastikan kontrol negatif dan kontrol positif (gel basis tanpa zat aktif) disiapkan dalam pengujian.",
        timestamp: "2026-05-16T15:45:00Z",
      },
    ],
  },
  {
    id: 4,
    title: "Diskusi Pembimbing 2 - Analisis Instrumen Uji Fisik Gel",
    status: "in progress",
    sessionStatus: "approved",
    sessionStartDate: "2026-06-10",
    sessionStartTime: "09:30",
    chats: [
      {
        id: "msg_4_1",
        senderName: "Dimas Indra Jaya",
        senderRole: "mahasiswa",
        message: "Selamat pagi Pak Budi, saya ingin bertanya mengenai metode uji viskositas gel. Apakah sebaiknya menggunakan viskosimeter Brookfield spindle nomor 4?",
        timestamp: "2026-05-19T07:45:00Z",
      },
      {
        id: "msg_4_2",
        senderName: "Dr. Apt. Budi Santoso, M.Si.",
        senderRole: "dosen",
        message: "Halo Dimas. Untuk sediaan gel dengan viskositas sedang, spindle 4 kecepatan 50 rpm biasanya paling stabil. Silakan dicoba dulu dan catat hasilnya pada tabel metodologi.",
        timestamp: "2026-05-19T11:20:00Z",
      },
    ],
  },
  {
    id: 5,
    title: "Bimbingan 5 (Belum diisi)",
    status: "pending",
    sessionStatus: "idle",
    sessionStartDate: null,
    sessionStartTime: null,
    chats: [],
  },
  {
    id: 6,
    title: "Bimbingan 6 (Belum diisi)",
    status: "pending",
    sessionStatus: "idle",
    sessionStartDate: null,
    sessionStartTime: null,
    chats: [],
  },
  {
    id: 7,
    title: "Bimbingan 7 (Belum diisi)",
    status: "pending",
    sessionStatus: "idle",
    sessionStartDate: null,
    sessionStartTime: null,
    chats: [],
  },
  {
    id: 8,
    title: "Bimbingan 8 (Belum diisi)",
    status: "pending",
    sessionStatus: "idle",
    sessionStartDate: null,
    sessionStartTime: null,
    chats: [],
  },
];

export class BimbinganService {
  /**
   * Mengambil data bimbingan lengkap berdasarkan tahapan (stageId)
   */
  getBimbinganData(stageId: string): BimbinganData {
    const key = LOCAL_STORAGE_PREFIX + stageId;
    const saved = storageService.get<BimbinganData>(key);

    if (saved) {
      // Force upgrade old local storage if status is idle or fields are empty
      if (saved.guidanceStatus === 'idle' || !saved.guidanceTime || !saved.guidanceStartDate) {
        storageService.remove(key);
      } else {
        return saved;
      }
    }

    // Default seed data (Pre-Confirmed & Approved by Lecturer)
    const defaultData: BimbinganData = {
      stageId,
      googleDocsLink: "https://docs.google.com/document/d/1mock_pharmsita_doc_link_daun_sirih/edit",
      pembimbing1Approved: false,
      pembimbing2Approved: false,
      sessions: createDefaultSessions(),
      finalFile: null,
      guidanceStatus: 'approved',
      guidanceRequestedAt: "2026-05-18T09:00:00Z",
      guidanceApprovedAt: "2026-05-19T10:00:00Z",
      guidanceStartDate: "2026-05-20",
      guidanceTime: "09:30",
      guidanceNote: "Saya ingin mengajukan bimbingan Tugas Akhir mengenai formulasi gel daun sirih.",
      guidanceApprovalNote: "Silakan mulai bimbingan. Saya telah menyetujui pengajuan bimbingan Anda.",
    };
    this.saveBimbinganData(stageId, defaultData);
    return defaultData;
  }

  /**
   * Menyimpan data bimbingan ke storage mock.
   */
  saveBimbinganData(stageId: string, data: BimbinganData) {
    const key = LOCAL_STORAGE_PREFIX + stageId;
    storageService.set(key, data);
  }

  /**
   * Mengupdate link google docs utama
   */
  updateGoogleDocsLink(stageId: string, link: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.googleDocsLink = link;
    this.saveBimbinganData(stageId, data);
    return data;
  }

  /**
   * Mengupdate status bimbingan dari Pembimbing 1 atau Pembimbing 2 (Kelayakan TA)
   */
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

  /**
   * Mengupdate data spesifik sesi bimbingan (Judul topik & status)
   */
  updateSession(
    stageId: string,
    sessionId: number,
    title: string,
    status: "pending" | "in progress" | "approved"
  ): BimbinganData {
    const data = this.getBimbinganData(stageId);
    const session = data.sessions.find(s => s.id === sessionId);
    if (session) {
      session.title = title;
      session.status = status;

      // Jika session di-approve, coba buat session berikutnya berstatus 'pending' & 'idle'
      if (status === "approved") {
        session.sessionStatus = "approved";
        const nextSession = data.sessions.find(s => s.id === sessionId + 1);
        if (nextSession && nextSession.status === "pending") {
          nextSession.status = "pending";
          nextSession.sessionStatus = "idle";
          nextSession.sessionStartDate = null;
          nextSession.sessionStartTime = null;
        }
      }

      this.saveBimbinganData(stageId, data);
    }
    return data;
  }

  /**
   * Menambahkan chat bimbingan baru ke forum/sesi bimbingan tertentu
   */
  addChatMessage(
    stageId: string,
    sessionId: number,
    senderName: string,
    senderRole: "mahasiswa" | "dosen",
    message: string
  ): BimbinganData {
    const data = this.getBimbinganData(stageId);
    const session = data.sessions.find(s => s.id === sessionId);
    if (session) {
      const newMsg: ChatMessage = {
        id: "msg_" + sessionId + "_" + Date.now(),
        senderName,
        senderRole,
        message,
        timestamp: new Date().toISOString(),
      };
      session.chats.push(newMsg);

      // Status bimbingan diatur secara manual melalui tombol Ajukan dan Konfirmasi Jadwal,
      // bukan secara otomatis pada saat pengetikan chat pertama kali.

      this.saveBimbinganData(stageId, data);
    }
    return data;
  }

  /**
   * Mengunggah berkas final bimbingan
   */
  uploadFinalFile(stageId: string, fileName: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.finalFile = fileName;
    this.saveBimbinganData(stageId, data);
    return data;
  }

  /**
   * Mereset seluruh progres bimbingan ke keadaan awal
   */
  resetBimbinganData(stageId: string): BimbinganData {
    const key = LOCAL_STORAGE_PREFIX + stageId;
    storageService.remove(key);
    return this.getBimbinganData(stageId);
  }

  // ==================== GUIDANCE REQUEST FLOW ====================

  /**
   * Mahasiswa mengajukan bimbingan (idle → requested)
   */
  requestGuidance(stageId: string, note: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.guidanceStatus = 'requested';
    data.guidanceRequestedAt = new Date().toISOString();
    data.guidanceNote = note || null;
    data.guidanceApprovedAt = null;
    data.guidanceStartDate = null;
    data.guidanceTime = null;
    data.guidanceApprovalNote = null;
    this.saveBimbinganData(stageId, data);
    return data;
  }

  /**
   * Pembimbing menyetujui pengajuan bimbingan (requested → approved)
   */
  approveGuidance(stageId: string, startDate: string, startTime: string, approvalNote: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.guidanceStatus = 'approved';
    data.guidanceApprovedAt = new Date().toISOString();
    data.guidanceStartDate = startDate;
    data.guidanceTime = startTime;
    data.guidanceApprovalNote = approvalNote || null;
    this.saveBimbinganData(stageId, data);
    return data;
  }

  /**
   * Mahasiswa mengajukan bimbingan untuk SESI spesifik
   */
  requestSessionGuidance(stageId: string, sessionId: number): BimbinganData {
    const data = this.getBimbinganData(stageId);
    const session = data.sessions.find(s => s.id === sessionId);
    if (session) {
      session.sessionStatus = 'requested';
      session.sessionStartDate = null;
      session.sessionStartTime = null;
      this.saveBimbinganData(stageId, data);
    }
    return data;
  }

  /**
   * Dospem menyetujui dan menjadwalkan SESI spesifik
   */
  approveSessionGuidance(stageId: string, sessionId: number, startDate: string, startTime: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    const session = data.sessions.find(s => s.id === sessionId);
    if (session) {
      session.sessionStatus = 'approved';
      session.status = 'in progress';
      session.sessionStartDate = startDate;
      session.sessionStartTime = startTime;
      session.title = session.title.includes("Belum diisi")
        ? `Diskusi Topik Bimbingan ${sessionId}`
        : session.title;
      this.saveBimbinganData(stageId, data);
    }
    return data;
  }

  /**
   * Reset status pengajuan bimbingan ke idle (untuk simulator)
   */
  resetGuidance(stageId: string): BimbinganData {
    const data = this.getBimbinganData(stageId);
    data.guidanceStatus = 'idle';
    data.guidanceRequestedAt = null;
    data.guidanceApprovedAt = null;
    data.guidanceStartDate = null;
    data.guidanceTime = null;
    data.guidanceApprovalNote = null;
    
    // Reset all sessions' custom statuses to default mockup state
    data.sessions = createDefaultSessions();
    
    this.saveBimbinganData(stageId, data);
    return data;
  }
}

export const bimbinganService = new BimbinganService();
