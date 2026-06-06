// ============================================================
// Types: Sidang (Proposal & Akhir) Workflow
// Reusable untuk tahapan Sidang Proposal dan Sidang Akhir
// ============================================================

export type SidangStatus = "belum-daftar" | "menunggu-jadwal" | "terjadwal" | "selesai";

export type SidangResultStatus = "lulus" | "lulus-dengan-revisi" | "tidak-lulus" | "belum-dinilai";

export interface SidangPanelist {
  id: string;
  name: string;
  nidn: string;
  email?: string;
  role: "pembimbing1" | "pembimbing2" | "penguji1" | "penguji2" | "ketua-sidang";
  roleLabel: string;
  approved: boolean; // apakah panelist ini sudah approve / setuju
}

export interface SidangSchedule {
  tanggal: string;    // e.g. "Senin, 16 Juni 2026"
  waktu: string;      // e.g. "09.00 – 11.00 WIB"
  ruang: string;      // e.g. "Ruang Seminar A"
  lokasi: string;     // e.g. "Gedung Farmasi Lt. 2"
  moderator?: string; // optional nama moderator/sekretaris
}

export interface SidangRequirement {
  id: string;
  label: string;
  fulfilled: boolean;
  note?: string; // catatan tambahan
}

export interface SidangData {
  stageId: "sidang-proposal" | "sidang";
  status: SidangStatus;
  panelists: SidangPanelist[];
  schedule: SidangSchedule | null; // null jika belum terjadwal
  requirements: SidangRequirement[];
  submittedAt: string | null;   // ISO timestamp pengajuan
  googleDocsLink: string;
  grade: string | null; // e.g., "A", "B+", "belum dinilai"
  resultStatus: SidangResultStatus;
  revisionNotes: string[]; // List ringkasan revisi (non-clickable)
}
