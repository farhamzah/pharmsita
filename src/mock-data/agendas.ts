import { AcademicStage } from "./enums";

export const mockAgendas: Array<{
  id: string;
  mahasiswaId: string;
  tahap: typeof AcademicStage[keyof typeof AcademicStage];
  jenisAgenda: string;
  tanggal: string;
  waktu: string;
  ruang: string;
  lokasi: string;
  statusAgenda: string;
}> = [];
