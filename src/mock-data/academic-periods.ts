export interface AcademicPeriod {
  id: string;
  name: string; // e.g. "2025/2026"
  semester: 'Ganjil' | 'Genap';
  startDate: string;
  endDate: string;
  status: 'Aktif' | 'Selesai';
}

export const mockAcademicPeriods: AcademicPeriod[] = [
  { id: '1', name: '2025/2026', semester: 'Genap', startDate: '01 Mar 2026', endDate: '30 Agu 2026', status: 'Aktif' },
  { id: '2', name: '2025/2026', semester: 'Ganjil', startDate: '01 Sep 2025', endDate: '28 Feb 2026', status: 'Selesai' },
  { id: '3', name: '2024/2025', semester: 'Genap', startDate: '01 Mar 2025', endDate: '30 Agu 2025', status: 'Selesai' },
  { id: '4', name: '2024/2025', semester: 'Ganjil', startDate: '01 Sep 2024', endDate: '28 Feb 2025', status: 'Selesai' },
  { id: '5', name: '2023/2024', semester: 'Genap', startDate: '01 Mar 2024', endDate: '30 Agu 2024', status: 'Selesai' },
  { id: '6', name: '2023/2024', semester: 'Ganjil', startDate: '01 Sep 2023', endDate: '28 Feb 2024', status: 'Selesai' },
  { id: '7', name: '2022/2023', semester: 'Genap', startDate: '01 Mar 2023', endDate: '30 Agu 2023', status: 'Selesai' },
  { id: '8', name: '2022/2023', semester: 'Ganjil', startDate: '01 Sep 2022', endDate: '28 Feb 2023', status: 'Selesai' },
  { id: '9', name: '2021/2022', semester: 'Genap', startDate: '01 Mar 2022', endDate: '30 Agu 2022', status: 'Selesai' },
  { id: '10', name: '2021/2022', semester: 'Ganjil', startDate: '01 Sep 2021', endDate: '28 Feb 2022', status: 'Selesai' },
  { id: '11', name: '2020/2021', semester: 'Genap', startDate: '01 Mar 2021', endDate: '30 Agu 2021', status: 'Selesai' },
  { id: '12', name: '2020/2021', semester: 'Ganjil', startDate: '01 Sep 2020', endDate: '28 Feb 2021', status: 'Selesai' },
  { id: '13', name: '2019/2020', semester: 'Genap', startDate: '01 Mar 2020', endDate: '30 Agu 2020', status: 'Selesai' },
  { id: '14', name: '2019/2020', semester: 'Ganjil', startDate: '01 Sep 2019', endDate: '28 Feb 2020', status: 'Selesai' },
];

export const mockAngkatan = Array.from(new Set(mockAcademicPeriods.map(p => p.name.split('/')[0]))).sort();
