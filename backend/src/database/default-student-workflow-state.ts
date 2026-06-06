import type {
  ExamStage,
  ExamWorkflow,
  GuidanceStage,
  GuidanceWorkflow,
  RequirementBundle,
  RevisionStage,
  RevisionWorkflow,
  StudentStep,
  ThesisSubmission,
} from "../domain/types";
import type { StudentWorkflowState } from "./schema";

const nowIso = () => new Date().toISOString();

const createDefaultProgressSteps = (): Omit<StudentStep, "isLocked">[] => [
  {
    id: "pendaftaran-ta",
    order: 1,
    label: "Pendaftaran TA",
    description: "Lengkapi semua persyaratan berkas administratif dan ajukan judul Tugas Akhir Anda.",
    status: "active",
  },
  {
    id: "bimbingan-pra-proposal",
    order: 2,
    label: "Bimbingan Pra Proposal",
    description: "Lakukan proses bimbingan dengan dosen pembimbing untuk menyusun draf proposal.",
    status: "pending",
  },
  {
    id: "sidang-proposal",
    order: 3,
    label: "Sidang Proposal",
    description: "Presentasikan draf proposal Anda di depan dewan penguji.",
    status: "pending",
  },
  {
    id: "revisi-proposal",
    order: 4,
    label: "Revisi Proposal",
    description: "Perbaiki draf proposal berdasarkan catatan dewan penguji sidang proposal.",
    status: "pending",
  },
  {
    id: "bimbingan-pra-sidang",
    order: 5,
    label: "Bimbingan Pra Sidang",
    description: "Lanjutkan bimbingan intensif untuk menyelesaikan naskah Tugas Akhir.",
    status: "pending",
  },
  {
    id: "sidang",
    order: 6,
    label: "Sidang",
    description: "Pertahankan hasil Tugas Akhir di hadapan dewan penguji.",
    status: "pending",
  },
  {
    id: "revisi-sidang",
    order: 7,
    label: "Revisi Sidang",
    description: "Selesaikan perbaikan naskah final Tugas Akhir.",
    status: "pending",
  },
];

const createInitialRequirementBundle = (): RequirementBundle => ({
  driveLink: "https://drive.google.com/drive/folders/mock_pharmsita_initial",
  requirements: [
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
      catatanKoordinator:
        "Transkrip Anda menunjukkan adanya nilai D pada Mata Kuliah Anatomi Fisiologi.",
    },
    {
      id: "req_a4",
      label: "Terdaftar sebagai Mahasiswa Aktif di semester berjalan",
      status: "Valid",
    },
  ],
});

const createDefaultThesisSubmissions = (): ThesisSubmission[] => [
  {
    id: "sub_1",
    date: "10 Mei 2026",
    skema: "Skripsi",
    jenisTA: "Penelitian Reguler",
    judulTA:
      "Formulasi dan Evaluasi Karakteristik Fisikokimia Sediaan Gel Ekstrak Daun Kelor",
    deskripsiTA:
      "Penelitian ini berfokus pada formulasi sediaan gel menggunakan ekstrak daun kelor.",
    pembimbing1: "Dr. Apt. Rina Marlina, M.Farm.",
    pembimbing2: "Dr. Apt. Budi Santoso, M.Si. (Ditentukan Koordinator)",
    status: "Ditolak",
    catatanKoordinator:
      "Judul dan metode perlu diperbarui agar memiliki kebaruan yang lebih kuat.",
    buktiFile: "bukti_kwitansi_pembayaran_ta.pdf",
  },
];

const createGuidanceWorkflow = (stageId: GuidanceStage): GuidanceWorkflow => ({
  stageId,
  googleDocsLink: "https://docs.google.com/document/d/mock_pharmsita_doc/edit",
  finalFile: null,
  pembimbing1Approved: false,
  pembimbing2Approved: false,
  guidanceStatus: "idle",
  guidanceRequestedAt: null,
  guidanceApprovedAt: null,
  guidanceStartDate: null,
  guidanceTime: null,
  guidanceNote: null,
  guidanceApprovalNote: null,
  sessions: Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    title: `Sesi Bimbingan ${index + 1}`,
    status: index === 0 ? "in progress" : "pending",
    chats: [],
    sessionStatus: "idle",
    sessionStartDate: null,
    sessionStartTime: null,
  })),
});

const createExamWorkflow = (stageId: ExamStage): ExamWorkflow => ({
  stageId,
  status: "terjadwal",
  googleDocsLink: "https://docs.google.com/document/d/mock_pharmsita_doc/edit",
  submittedAt: nowIso(),
  grade: null,
  resultStatus: "belum-dinilai",
  revisionNotes: [],
  requirements: [
    { id: "req_exam_01", label: "Dokumen utama sudah lengkap", fulfilled: true },
    { id: "req_exam_02", label: "Bukti bimbingan sudah lengkap", fulfilled: true },
  ],
  panelists: [
    {
      id: "panel_01",
      role: "ketua-sidang",
      roleLabel: "Ketua Sidang",
      name: "Prof. Dr. Hj. Siti Rahayu",
      nidn: "111022501001",
      approved: true,
    },
    {
      id: "panel_02",
      role: "penguji1",
      roleLabel: "Penguji 1",
      name: "Dr. Budi Harto, M.Farm.",
      nidn: "221011401065",
      approved: true,
    },
    {
      id: "panel_03",
      role: "penguji2",
      roleLabel: "Penguji 2",
      name: "Dr. Andi Wijaya, M.Si.",
      nidn: "221011401077",
      approved: true,
    },
  ],
  schedule: {
    tanggal: "2026-06-16",
    waktu: "09:00 - 11:00",
    ruang: "Ruang Seminar A",
    lokasi: "Gedung Farmasi Lt. 2",
  },
});

const createRevisionWorkflow = (stageId: RevisionStage): RevisionWorkflow => ({
  stageId,
  finalFile: null,
  penguji1Approved: false,
  penguji2Approved: false,
  ketuaSidangStatus: "pending",
  submittedAt: null,
  items: [
    {
      id: 1,
      title: "Perbaikan Bab 1",
      topik: "Latar belakang",
      materi: "Perjelas gap penelitian dan urgensi topik.",
      assignedTo: "Dr. Budi Harto, M.Farm.",
      status: "pending",
      chats: [],
    },
    {
      id: 2,
      title: "Perbaikan Metodologi",
      topik: "Metode penelitian",
      materi: "Tambahkan detail instrumen dan alur analisis.",
      assignedTo: "Dr. Andi Wijaya, M.Si.",
      status: "pending",
      chats: [],
    },
  ],
});

export const createDefaultStudentWorkflowState = (): StudentWorkflowState => ({
  progressSteps: createDefaultProgressSteps(),
  requirements: {
    initial: createInitialRequirementBundle(),
    stages: {},
  },
  thesisSubmissions: createDefaultThesisSubmissions(),
  guidance: {
    "bimbingan-pra-proposal": createGuidanceWorkflow("bimbingan-pra-proposal"),
    "bimbingan-pra-sidang": createGuidanceWorkflow("bimbingan-pra-sidang"),
  },
  exams: {
    "sidang-proposal": createExamWorkflow("sidang-proposal"),
    sidang: createExamWorkflow("sidang"),
  },
  revisions: {
    "revisi-proposal": createRevisionWorkflow("revisi-proposal"),
    "revisi-sidang": createRevisionWorkflow("revisi-sidang"),
  },
});
