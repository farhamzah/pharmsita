import type { StudentRequirement } from "./requirements";

export interface StudentValidationSummary {
  studentId: string;
  nim: string;
  nama: string;
  angkatan: string;
  programStudi: string;
  tahapanAktif: string;
  linkBerkasDrive?: string;
  statusPengajuan: "Belum Mengajukan" | "Menunggu Validasi" | "Disetujui" | "Ditolak";
}

export const mockStudentValidationList: StudentValidationSummary[] = [];
export const mockExtendedStudentRequirements: StudentRequirement[] = [];

export const getValidationRequirementsForStudent = (studentId: string): StudentRequirement[] =>
  mockExtendedStudentRequirements.filter((record) => record.studentId === studentId);

export const getStudentValidationStatus = (studentId: string) => {
  const records = getValidationRequirementsForStudent(studentId);
  if (records.length === 0) return "Belum Valid" as const;
  return records.every((record) => record.status === "Valid")
    ? ("Valid" as const)
    : ("Belum Valid" as const);
};
