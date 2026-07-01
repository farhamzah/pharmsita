import { AcademicStage, ThesisRole } from "./enums";

export const mockTheses: Array<{
  id: string;
  mahasiswaId: string;
  judul: string;
  tahapanAktif: typeof AcademicStage[keyof typeof AcademicStage];
  statusUmum: string;
  fileSkripsi: string;
  linkSkripsi: string;
}> = [];

export const mockLecturerStudentRoles: Array<{
  mahasiswaId: string;
  dosenId: string;
  role: typeof ThesisRole[keyof typeof ThesisRole];
}> = [];
