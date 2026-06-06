// ============================================================
// Service: Sidang Workflow
// State management untuk tahapan Sidang Proposal & Sidang Akhir
// Menggunakan storage mock untuk persistensi sementara.
// ============================================================

import type {
  SidangData,
  SidangStatus,
  SidangResultStatus,
  SidangPanelist,
  SidangRequirement,
} from "../types/sidang";
import { storageService } from "../../../core/services/storage-service";

const STORAGE_KEY_PREFIX = "student_sidang_v2_";

// ─── Default Data Seeds ──────────────────────────────────────

const DEFAULT_PANELISTS_PROPOSAL: SidangPanelist[] = [
  {
    id: "p1",
    name: "Dr. Apt. Rina Marlina, M.Farm.",
    nidn: "0123456789",
    email: "rina.marlina@univ.ac.id",
    role: "pembimbing1",
    roleLabel: "Pembimbing Utama (1)",
    approved: true,
  },
  {
    id: "p2",
    name: "Dr. Apt. Budi Santoso, M.Si.",
    nidn: "0987654321",
    email: "budi.santoso@univ.ac.id",
    role: "pembimbing2",
    roleLabel: "Pembimbing Pendamping (2)",
    approved: true,
  },
  {
    id: "e1",
    name: "Dr. Budi Harto, M.Farm.",
    nidn: "221011401065",
    email: "budi.harto@univ.ac.id",
    role: "penguji1",
    roleLabel: "Penguji 1",
    approved: true,
  },
  {
    id: "e2",
    name: "Dr. Andi Wijaya, M.Si.",
    nidn: "221011401077",
    email: "andi.wijaya@univ.ac.id",
    role: "penguji2",
    roleLabel: "Penguji 2",
    approved: true,
  },
  {
    id: "ks",
    name: "Prof. Dr. Hj. Siti Rahayu, M.Farm.",
    nidn: "111022501001",
    email: "siti.rahayu@univ.ac.id",
    role: "ketua-sidang",
    roleLabel: "Ketua Sidang",
    approved: true,
  },
];

const DEFAULT_PANELISTS_SIDANG: SidangPanelist[] = DEFAULT_PANELISTS_PROPOSAL.map(
  (p) => ({ ...p, approved: false }) // semua belum approve di sidang akhir
);

const DEFAULT_REQUIREMENTS_PROPOSAL: SidangRequirement[] = [
  { id: "bimbingan-8x", label: "Minimal Bimbingan Pra Proposal (8x Approved)", fulfilled: true },
  { id: "p1-approved", label: "Persetujuan Pembimbing Utama (P1)", fulfilled: true },
  { id: "p2-approved", label: "Persetujuan Pembimbing Pendamping (P2)", fulfilled: true },
  { id: "file-proposal", label: "Berkas Proposal TA (PDF/DOCX) Terunggah", fulfilled: true },
  { id: "syarat-admin", label: "Syarat Administrasi Seminar Proposal", fulfilled: true },
  { id: "krs-aktif", label: "KRS Aktif Semester Berjalan", fulfilled: true },
  { id: "form-pendaftaran", label: "Form Pendaftaran Seminar Proposal Diisi", fulfilled: true },
];

const DEFAULT_REQUIREMENTS_SIDANG: SidangRequirement[] = [
  { id: "bimbingan-8x", label: "Minimal Bimbingan Pra Sidang (8x Approved)", fulfilled: false },
  { id: "p1-approved", label: "Persetujuan Pembimbing Utama (P1)", fulfilled: false },
  { id: "p2-approved", label: "Persetujuan Pembimbing Pendamping (P2)", fulfilled: false },
  { id: "file-skripsi", label: "Naskah Skripsi Final (PDF/DOCX) Terunggah", fulfilled: false },
  { id: "revisi-sempro", label: "Revisi Seminar Proposal Selesai", fulfilled: false },
  { id: "syarat-admin", label: "Syarat Administrasi Sidang Akhir", fulfilled: false },
  { id: "form-pendaftaran", label: "Form Pendaftaran Sidang Akhir Diisi", fulfilled: false },
  { id: "krs-aktif", label: "KRS Aktif Semester Berjalan", fulfilled: false },
];

const DEFAULT_REVISION_NOTES_PROPOSAL = [
  "Bab 1: Perjelas latar belakang pemilihan ekstrak daun sirih dibanding tanaman antiseptik lain.",
  "Bab 2: Mutakhirkan pustaka jurnal 5 tahun terakhir untuk metode uji aktivitas bakteri.",
  "Bab 3: Tambahkan penjelasan rinci mengenai variasi konsentrasi basis gel (Carbopol 940).",
  "Bab 4: Tambahkan rencana analisis statistik ANOVA satu arah untuk uji stabilitas fisik gel.",
];

// ─── Factory Default Data ─────────────────────────────────────

function createDefaultData(stageId: "sidang-proposal" | "sidang"): SidangData {
  const isProposal = stageId === "sidang-proposal";
  return {
    stageId,
    status: isProposal ? "terjadwal" : "belum-daftar",
    panelists: isProposal
      ? DEFAULT_PANELISTS_PROPOSAL
      : DEFAULT_PANELISTS_SIDANG,
    schedule: isProposal
      ? {
          tanggal: "Senin, 16 Juni 2026",
          waktu: "09.00 – 11.00 WIB",
          ruang: "Ruang Seminar A",
          lokasi: "Gedung Farmasi Lt. 2",
          moderator: "Dr. Apt. Budi Santoso, M.Si.",
        }
      : null, // sidang akhir belum ada jadwal
    requirements: isProposal
      ? DEFAULT_REQUIREMENTS_PROPOSAL
      : DEFAULT_REQUIREMENTS_SIDANG,
    submittedAt: null,
    googleDocsLink: "https://docs.google.com/document/d/example-ta-2024",
    grade: isProposal ? "A-" : null,
    resultStatus: isProposal ? "lulus-dengan-revisi" : "belum-dinilai",
    revisionNotes: isProposal ? DEFAULT_REVISION_NOTES_PROPOSAL : [],
  };
}

// ─── Service Class ────────────────────────────────────────────

class SidangService {
  private getKey(stageId: string): string {
    return `${STORAGE_KEY_PREFIX}${stageId}`;
  }

  /**
   * Ambil data sidang dari storage mock, atau seed default jika belum ada.
   */
  getData(stageId: "sidang-proposal" | "sidang"): SidangData {
    const saved = storageService.get<SidangData>(this.getKey(stageId));
    if (saved) {
      return saved;
    }
    const defaultData = createDefaultData(stageId);
    this.save(stageId, defaultData);
    return defaultData;
  }

  /**
   * Simpan data sidang ke storage mock.
   */
  private save(stageId: string, data: SidangData): void {
    storageService.set(this.getKey(stageId), data);
  }

  /**
   * Update status sidang
   */
  updateStatus(stageId: "sidang-proposal" | "sidang", status: SidangStatus): SidangData {
    const data = this.getData(stageId);
    data.status = status;
    if (status === "menunggu-jadwal" && !data.submittedAt) {
      data.submittedAt = new Date().toISOString();
    }
    this.save(stageId, data);
    return this.getData(stageId);
  }

  /**
   * Update penilaian & kelulusan sidang
   */
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
    return this.getData(stageId);
  }

  /**
   * Toggle fulfillment status sebuah requirement (untuk demo/simulator)
   */
  toggleRequirement(stageId: "sidang-proposal" | "sidang", reqId: string): SidangData {
    const data = this.getData(stageId);
    const req = data.requirements.find((r) => r.id === reqId);
    if (req) {
      req.fulfilled = !req.fulfilled;
    }
    this.save(stageId, data);
    return this.getData(stageId);
  }

  /**
   * Toggle approval status sebuah panelist (untuk demo/simulator dosen)
   */
  togglePanelistApproval(stageId: "sidang-proposal" | "sidang", panelistId: string): SidangData {
    const data = this.getData(stageId);
    const panelist = data.panelists.find((p) => p.id === panelistId);
    if (panelist) {
      panelist.approved = !panelist.approved;
    }
    this.save(stageId, data);
    return this.getData(stageId);
  }

  /**
   * Update Google Docs link
   */
  updateDocsLink(stageId: "sidang-proposal" | "sidang", link: string): SidangData {
    const data = this.getData(stageId);
    data.googleDocsLink = link;
    this.save(stageId, data);
    return this.getData(stageId);
  }

  /**
   * Simulasi: set semua requirements fulfilled & semua panelist approved
   */
  simulateAllApproved(stageId: "sidang-proposal" | "sidang"): SidangData {
    const data = this.getData(stageId);
    data.requirements.forEach((r) => (r.fulfilled = true));
    data.panelists.forEach((p) => (p.approved = true));
    this.save(stageId, data);
    return this.getData(stageId);
  }

  /**
   * Reset data ke default
   */
  reset(stageId: "sidang-proposal" | "sidang"): SidangData {
    storageService.remove(this.getKey(stageId));
    return this.getData(stageId);
  }
}

export const sidangService = new SidangService();
