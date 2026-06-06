import {
  mockAcademicPeriods,
  mockCoordinatorProfiles,
  mockJenisTA,
  mockLecturerProfiles,
  mockStudentProfiles,
} from "../../mock-data";
import { loadMasterRequirements } from "../../mock-data/requirements";
import { storageService } from "./storage-service";

export const ADMIN_STORAGE_KEYS = {
  accounts: "pharmsita_accounts",
  academicPeriods: "pharmsita_periods",
  jenisTA: "pharmsita_jenis_ta",
  documents: "pharmsita_documents",
  requirements: "pharmsita_master_requirements",
} as const;

export type AdminAccount = Record<string, any>;
export type AdminMasterRecord = Record<string, any>;

export const initialSupportingDocuments: AdminMasterRecord[] = [
  { id: "doc_1", name: "Formulir Pendaftaran TA", description: "Formulir pengajuan judul tugas akhir resmi prodi.", allowedTypes: "PDF", isRequired: "Wajib", status: "Aktif" },
  { id: "doc_2", name: "KRS Semester Berjalan", description: "Bukti KRS aktif semester berjalan yang mencantumkan mata kuliah TA.", allowedTypes: "PDF, Image", isRequired: "Wajib", status: "Aktif" },
  { id: "doc_3", name: "Transkrip Nilai Sementara", description: "Transkrip nilai akademik lengkap untuk syarat kelayakan SKS.", allowedTypes: "PDF", isRequired: "Wajib", status: "Aktif" },
  { id: "doc_4", name: "Sertifikat TOEFL / Bahasa Inggris", description: "Bukti tes kemampuan bahasa inggris minimal skor 450.", allowedTypes: "PDF, Image", isRequired: "Opsional", status: "Aktif" },
];

export const sanitizeAdminAccount = (account: AdminAccount): AdminAccount => {
  const { password, ...safeAccount } = account;
  return safeAccount;
};

export const sanitizeAdminAccounts = (accounts: AdminAccount[] = []) =>
  accounts.map(sanitizeAdminAccount);

const loadList = <T>(key: string, fallback: T[]): T[] => {
  const saved = storageService.get<T[]>(key);
  if (Array.isArray(saved)) return saved;

  storageService.set(key, fallback);
  return fallback;
};

const buildInitialAccounts = (): AdminAccount[] => {
  const students = mockStudentProfiles.map((student) => ({
    id: student.id,
    name: student.name,
    identifier: student.nim,
    role: "Mahasiswa",
    status: student.status,
    email: student.email,
    phone: student.phone,
    gender: student.gender || "Laki-laki",
    tanggalLahir: student.tanggalLahir || "2002-10-05",
    alamat: student.alamat || "Jl. Raya Puspiptek No. 45, Tangerang Selatan",
    programStudi: student.programStudi || "S1 Farmasi",
    angkatan: student.angkatan || "2022",
    kelas: student.kelas || "FA-22-01",
    skemaTA: student.skemaTA || "Skripsi",
    jenisTA: student.jenisTA || "Penelitian",
    tahapanAktif: student.tahapanAktif || "Bimbingan",
    judulTA: student.judulTA || "Formulasi dan Uji Stabilitas Sediaan Gel Ekstrak Daun Sirih",
    pembimbing1: student.pembimbing1 || "Dr. Apt. Rina Marlina, M.Farm.",
    pembimbing2: student.pembimbing2 || "Dr. Apt. Budi Santoso, M.Si.",
  }));

  const lecturers = mockLecturerProfiles.map((lecturer) => ({
    id: lecturer.id,
    name: lecturer.name,
    identifier: lecturer.nidn,
    role: "Dosen",
    status: lecturer.status,
    email: lecturer.email,
    phone: lecturer.phone,
    gender: lecturer.gender || "Perempuan",
    tanggalLahir: lecturer.tanggalLahir || "1980-08-10",
    alamat: lecturer.alamat || "Komp. Dosen UNPAD Blok A No. 1, Bandung",
    programStudi: lecturer.programStudi || "S1 Farmasi",
    jabatanAkademik: lecturer.jabatanAkademik || "Lektor",
    bidangKeahlian: Array.isArray(lecturer.bidangKeahlian)
      ? lecturer.bidangKeahlian.join(", ")
      : "Farmasetika, Teknologi Sediaan Farmasi",
    kuotaPembimbing1: lecturer.kuotaPembimbing1 || 8,
    kuotaPembimbing2: lecturer.kuotaPembimbing2 || 8,
    kuotaTerpakaiPembimbing1: lecturer.kuotaTerpakaiPembimbing1 || 0,
    kuotaTerpakaiPembimbing2: lecturer.kuotaTerpakaiPembimbing2 || 0,
    peranSistem: lecturer.peranSistem || ["Pembimbing", "Penguji"],
  }));

  const coordinators = mockCoordinatorProfiles.map((coordinator) => ({
    id: coordinator.id,
    name: coordinator.name,
    identifier: "197505202000032001",
    role: "Koordinator",
    status: coordinator.status,
    email: coordinator.email,
    phone: coordinator.phone,
    gender: coordinator.gender || "Perempuan",
    tanggalLahir: coordinator.tanggalLahir || "1975-05-20",
    alamat: coordinator.alamat || "Graha Bintaro GR9 No. 15, Tangerang Selatan",
    programStudi: coordinator.programStudi || "S1 Farmasi",
    jabatan: coordinator.jabatan || "Koordinator Tugas Akhir Prodi Farmasi",
    hakAksesUtama: coordinator.hakAksesUtama || ["Validasi Pengajuan Tugas Akhir", "Pengaturan Kuota Dosen"],
  }));

  return sanitizeAdminAccounts([...students, ...lecturers, ...coordinators]);
};

export const loadAdminAccounts = (): AdminAccount[] => {
  const saved = storageService.get<AdminAccount[]>(ADMIN_STORAGE_KEYS.accounts);
  if (Array.isArray(saved)) {
    const sanitized = sanitizeAdminAccounts(saved);
    storageService.set(ADMIN_STORAGE_KEYS.accounts, sanitized);
    return sanitized;
  }

  const initial = buildInitialAccounts();
  storageService.set(ADMIN_STORAGE_KEYS.accounts, initial);
  return initial;
};

export const saveAdminAccounts = (accounts: AdminAccount[]) => {
  const sanitized = sanitizeAdminAccounts(accounts);
  storageService.set(ADMIN_STORAGE_KEYS.accounts, sanitized);
  return sanitized;
};

export const loadAcademicPeriods = () =>
  loadList(ADMIN_STORAGE_KEYS.academicPeriods, mockAcademicPeriods);

export const saveAcademicPeriods = (periods: AdminMasterRecord[]) => {
  storageService.set(ADMIN_STORAGE_KEYS.academicPeriods, periods);
  return periods;
};

export const loadJenisTAList = () =>
  loadList(ADMIN_STORAGE_KEYS.jenisTA, mockJenisTA);

export const saveJenisTAList = (items: AdminMasterRecord[]) => {
  storageService.set(ADMIN_STORAGE_KEYS.jenisTA, items);
  return items;
};

export const loadSupportingDocuments = () =>
  loadList(ADMIN_STORAGE_KEYS.documents, initialSupportingDocuments);

export const saveSupportingDocuments = (documents: AdminMasterRecord[]) => {
  storageService.set(ADMIN_STORAGE_KEYS.documents, documents);
  return documents;
};

export const loadRequirementDefinitions = () => {
  const saved = storageService.get<AdminMasterRecord[]>(ADMIN_STORAGE_KEYS.requirements);
  if (Array.isArray(saved)) return saved;

  const initial = loadMasterRequirements().map((requirement) => ({
    ...requirement,
    status: "status" in requirement ? (requirement as AdminMasterRecord).status : "Aktif",
  }));
  storageService.set(ADMIN_STORAGE_KEYS.requirements, initial);
  return initial;
};

export const saveRequirementDefinitions = (requirements: AdminMasterRecord[]) => {
  storageService.set(ADMIN_STORAGE_KEYS.requirements, requirements);
  loadMasterRequirements();
  return requirements;
};

export const adminDataService = {
  loadAccounts: loadAdminAccounts,
  saveAccounts: saveAdminAccounts,
  loadAcademicPeriods,
  saveAcademicPeriods,
  loadJenisTAList,
  saveJenisTAList,
  loadSupportingDocuments,
  saveSupportingDocuments,
  loadRequirementDefinitions,
  saveRequirementDefinitions,
};
