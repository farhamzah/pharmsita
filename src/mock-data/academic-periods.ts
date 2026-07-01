export interface AcademicPeriod {
  id: string;
  name: string;
  semester: "Ganjil" | "Genap";
  startDate: string;
  endDate: string;
  status: "Aktif" | "Selesai";
}

export const mockAcademicPeriods: AcademicPeriod[] = [];
export const mockAngkatan: string[] = [];
