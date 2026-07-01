import { storageService } from "../core/services/storage-service";

export type RequirementValidationStatus =
  | "Belum Upload"
  | "Menunggu Verifikasi"
  | "Valid"
  | "Perlu Revisi"
  | "Ditolak";

export type RequirementStage =
  | "Persyaratan Awal"
  | "Seminar Proposal"
  | "Sidang Akhir"
  | "Yudisium";

export interface MasterRequirement {
  id: string;
  tahap: RequirementStage;
  namaPersyaratan: string;
  deskripsiAturan?: string;
  wajib: boolean;
}

export interface StudentRequirement {
  id: string;
  studentId: string;
  masterRequirementId: string;
  status: RequirementValidationStatus;
  linkBerkas?: string;
  tanggalUpload?: string;
  catatanMahasiswa?: string;
  isChecked: boolean;
  tanggalVerifikasi?: string;
  catatanKoordinator?: string;
  diverifikasiOlehId?: string;
}

export interface RequirementDetail
  extends MasterRequirement,
    Omit<StudentRequirement, "id" | "masterRequirementId"> {
  recordId: string;
}

export const mockMasterRequirements: MasterRequirement[] = [];
export const mockStudentRequirements: StudentRequirement[] = [];

export const loadMasterRequirements = (): MasterRequirement[] => {
  const saved = storageService.get<MasterRequirement[]>("pharmsita_master_requirements");
  mockMasterRequirements.length = 0;
  mockMasterRequirements.push(...(Array.isArray(saved) ? saved : []));
  return mockMasterRequirements;
};

export const getStudentRequirementDetails = (
  studentId: string,
  tahap?: RequirementStage
): RequirementDetail[] => {
  const masters = loadMasterRequirements().filter(
    (requirement) => !tahap || requirement.tahap === tahap
  );

  return masters.map((master) => {
    const studentReq = mockStudentRequirements.find(
      (record) => record.masterRequirementId === master.id && record.studentId === studentId
    );

    return {
      ...master,
      recordId: studentReq?.id || `new_${master.id}`,
      studentId,
      status: studentReq?.status || "Belum Upload",
      linkBerkas: studentReq?.linkBerkas,
      tanggalUpload: studentReq?.tanggalUpload,
      catatanMahasiswa: studentReq?.catatanMahasiswa,
      isChecked: studentReq?.isChecked || false,
      tanggalVerifikasi: studentReq?.tanggalVerifikasi,
      catatanKoordinator: studentReq?.catatanKoordinator,
      diverifikasiOlehId: studentReq?.diverifikasiOlehId,
    };
  });
};

export const getRequirementSummary = (studentId: string, tahap?: RequirementStage) => {
  const details = getStudentRequirementDetails(studentId, tahap);
  const total = details.length;
  const valid = details.filter((detail) => detail.status === "Valid").length;
  return {
    total,
    valid,
    invalid: total - valid,
    progressPercent: total === 0 ? 0 : Math.round((valid / total) * 100),
  };
};
