import { AcademicStage, ThesisRole } from "./enums";

export const mockNotes: Array<{
  id: string;
  mahasiswaId: string;
  tahap: typeof AcademicStage[keyof typeof AcademicStage];
  topik: string;
  isiCatatan: string;
  dibuatOlehId: string;
  rolePembuat: typeof ThesisRole[keyof typeof ThesisRole];
  statusCatatan: string;
  tanggal: string;
}> = [];

export const mockAssessments: Array<{
  id: string;
  mahasiswaId: string;
  tahap: typeof AcademicStage[keyof typeof AcademicStage];
  dosenId: string;
  rolePenilai: typeof ThesisRole[keyof typeof ThesisRole];
  statusPenilaian: string;
  nilai: number;
  catatanPenilaian: string;
  tanggal: string;
}> = [];

export const mockValidations: Array<{
  id: string;
  mahasiswaId: string;
  tahap: typeof AcademicStage[keyof typeof AcademicStage];
  dosenId: string;
  roleValidator: typeof ThesisRole[keyof typeof ThesisRole];
  statusValidasi: string;
  catatan: string;
  tanggal: string;
}> = [];
