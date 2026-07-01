import { storageService } from "../../../core/services/storage-service";

export type RequirementStatus = "Valid" | "Menunggu Verifikasi" | "Perlu Revisi" | "Belum Upload";

export interface RequirementItem {
  id: string;
  label: string;
  status: RequirementStatus;
  catatanKoordinator?: string;
}

export interface RequirementBundle {
  requirements: RequirementItem[];
  driveLink: string;
}

export interface ThesisSubmission {
  id: string;
  date: string;
  skema: "Skripsi" | "Non Skripsi";
  jenisTA: string;
  judulTA: string;
  deskripsiTA: string;
  pembimbing1: string;
  pembimbing2: string;
  status: "Sedang Proses Validasi" | "Diterima" | "Ditolak";
  catatanKoordinator?: string;
  buktiFile?: string;
}

export const STUDENT_WORKFLOW_STORAGE_KEYS = {
  initialRequirements: "student_persyaratan_awal_v1",
  thesisSubmissions: "student_thesis_submissions_v1",
  stageRequirementsPrefix: "student_requirements_stage_",
} as const;

export const DEFAULT_INITIAL_REQUIREMENTS: RequirementItem[] = [
  {
    id: "req_a1",
    label: "IPK min 3,00 & min 120 SKS (Transkrip nilai dari semester 1 s.d semester 6)",
    status: "Valid",
  },
  {
    id: "req_a2",
    label: "Sudah mengambil Mata Kuliah Metodologi Penelitian",
    status: "Valid",
  },
  {
    id: "req_a3",
    label: "Tidak ada nilai E dan nilai D pada transkrip utama.",
    status: "Perlu Revisi",
    catatanKoordinator: "Transkrip Anda menunjukkan adanya nilai D pada Mata Kuliah Anatomi Fisiologi. Mohon berkoordinasi dengan dosen wali untuk rencana perbaikan.",
  },
  {
    id: "req_a4",
    label: "Terdaftar sebagai Mahasiswa Aktif di semester berjalan",
    status: "Valid",
  },
  {
    id: "req_a5",
    label: "Mengisi KRS Proposal Tugas Akhir di SIPT",
    status: "Belum Upload",
  },
  {
    id: "req_a6",
    label: "Bukti Pelunasan Registrasi/Pendaftaran Tugas Akhir dari Keuangan",
    status: "Perlu Revisi",
    catatanKoordinator: "Kwitansi pembayaran yang diupload terpotong dan buram. Silakan upload ulang foto bukti pembayaran dengan resolusi tinggi dan utuh.",
  },
  {
    id: "req_a7",
    label: "Transkrip Nilai lengkap dari semester 1 s.d semester 6 atau KHS",
    status: "Belum Upload",
  },
  {
    id: "req_a8",
    label: "Sedang atau sudah memprogramkan MK Metodologi Penelitian (KST/KRS semester saat ini)",
    status: "Belum Upload",
  },
];

export const DEFAULT_THESIS_SUBMISSIONS: ThesisSubmission[] = [];

const cloneRequirements = (requirements: RequirementItem[]) =>
  requirements.map((requirement) => ({ ...requirement }));

const cloneSubmissions = (submissions: ThesisSubmission[]) =>
  submissions.map((submission) => ({ ...submission }));

const stageRequirementsKey = (stageId: string) =>
  `${STUDENT_WORKFLOW_STORAGE_KEYS.stageRequirementsPrefix}${stageId}`;

export const loadInitialRequirements = (): RequirementBundle => {
  const saved = storageService.get<Partial<RequirementBundle>>(
    STUDENT_WORKFLOW_STORAGE_KEYS.initialRequirements
  );

  if (saved?.requirements) {
    return {
      requirements: saved.requirements,
      driveLink: saved.driveLink || "",
    };
  }

  const initial = {
    requirements: cloneRequirements(DEFAULT_INITIAL_REQUIREMENTS),
    driveLink: "",
  };
  storageService.set(STUDENT_WORKFLOW_STORAGE_KEYS.initialRequirements, initial);
  return initial;
};

export const saveInitialRequirements = (
  requirements: RequirementItem[],
  driveLink: string
): RequirementBundle => {
  const bundle = { requirements, driveLink };
  storageService.set(STUDENT_WORKFLOW_STORAGE_KEYS.initialRequirements, bundle);
  return bundle;
};

export const loadThesisSubmissions = (): ThesisSubmission[] => {
  const saved = storageService.get<ThesisSubmission[]>(
    STUDENT_WORKFLOW_STORAGE_KEYS.thesisSubmissions
  );

  if (Array.isArray(saved)) return saved;

  const initial = cloneSubmissions(DEFAULT_THESIS_SUBMISSIONS);
  storageService.set(STUDENT_WORKFLOW_STORAGE_KEYS.thesisSubmissions, initial);
  return initial;
};

export const saveThesisSubmissions = (submissions: ThesisSubmission[]) => {
  storageService.set(STUDENT_WORKFLOW_STORAGE_KEYS.thesisSubmissions, submissions);
  return submissions;
};

export const loadStageRequirements = (
  stageId: string,
  defaultRequirements: RequirementItem[]
): RequirementBundle => {
  const saved = storageService.get<Partial<RequirementBundle>>(stageRequirementsKey(stageId));

  if (saved?.requirements) {
    return {
      requirements: saved.requirements,
      driveLink: saved.driveLink || "",
    };
  }

  return {
    requirements: cloneRequirements(defaultRequirements),
    driveLink: "",
  };
};

export const saveStageRequirements = (
  stageId: string,
  requirements: RequirementItem[],
  driveLink: string
): RequirementBundle => {
  const bundle = { requirements, driveLink };
  storageService.set(stageRequirementsKey(stageId), bundle);
  return bundle;
};

export const studentWorkflowService = {
  loadInitialRequirements,
  saveInitialRequirements,
  loadThesisSubmissions,
  saveThesisSubmissions,
  loadStageRequirements,
  saveStageRequirements,
};
