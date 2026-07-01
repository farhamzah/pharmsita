import { AcademicStage, Roles } from "./enums";

export interface BaseProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  role: typeof Roles[keyof typeof Roles];
  status: "Aktif" | "Nonaktif" | "Cuti" | "Lulus";
  tanggalLahir?: string;
  alamat?: string;
  gender?: "Laki-laki" | "Perempuan";
}

export interface StudentProfile extends BaseProfile {
  nim: string;
  programStudi: string;
  angkatan: string;
  kelas?: string;
  skemaTA: "Skripsi" | "Non Skripsi";
  jenisTA?: string;
  judulTA?: string;
  pembimbing1?: string;
  pembimbing2?: string;
  tahapanAktif: typeof AcademicStage[keyof typeof AcademicStage];
  statusPengajuan?: "Belum Mengajukan" | "Menunggu Validasi" | "Disetujui" | "Ditolak";
  linkBerkas?: string;
}

export interface LecturerProfile extends BaseProfile {
  nidn: string;
  programStudi: string;
  bidangKeahlian: string[];
  jabatanAkademik: string;
  kuotaPembimbing1: number;
  kuotaTerpakaiPembimbing1: number;
  kuotaTersediaPembimbing1: number;
  kuotaPembimbing2: number;
  kuotaTerpakaiPembimbing2: number;
  kuotaTersediaPembimbing2: number;
  peranSistem: ("Pembimbing" | "Penguji" | "Ketua Sidang")[];
}

export interface CoordinatorProfile extends BaseProfile {
  jabatan: string;
  programStudi: string;
  hakAksesUtama: string[];
}

export interface AdminProfile extends BaseProfile {
  divisi: string;
  tingkatAkses: "Superadmin" | "Admin Prodi";
  cakupanAkses?: string[];
}

export const mockStudentProfiles: StudentProfile[] = [];
export const mockLecturerProfiles: LecturerProfile[] = [];
export const mockCoordinatorProfiles: CoordinatorProfile[] = [];
export const mockAdminProfiles: AdminProfile[] = [];
