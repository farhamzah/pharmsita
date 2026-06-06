import { AcademicStage } from './enums';

export const mockAgendas = [
  {
    id: "ag1",
    mahasiswaId: "1",
    tahap: AcademicStage.SEMINAR_PROPOSAL,
    jenisAgenda: "Seminar Proposal",
    tanggal: "15 Agustus 2026",
    waktu: "10:00 - 12:00 WIB",
    ruang: "Ruang Seminar 2",
    lokasi: "Gedung Labtek V, Lt. 2",
    statusAgenda: "Terjadwal"
  },
  {
    id: "ag2",
    mahasiswaId: "2",
    tahap: AcademicStage.SIDANG_AKHIR,
    jenisAgenda: "Sidang Akhir Skripsi",
    tanggal: "01 September 2026",
    waktu: "08:00 - 10:00 WIB",
    ruang: "Ruang Sidang Utama",
    lokasi: "Gedung Dekanat, Lt. 1",
    statusAgenda: "Selesai"
  },
  {
    id: "ag5",
    mahasiswaId: "5",
    tahap: AcademicStage.SIDANG_AKHIR,
    jenisAgenda: "Sidang Akhir Skripsi",
    tanggal: "15 Oktober 2026",
    waktu: "10:00 - 12:00 WIB",
    ruang: "Ruang Ujian 203",
    lokasi: "Gedung Teknik Informatika",
    statusAgenda: "Terjadwal"
  },
  {
    id: "ag6",
    mahasiswaId: "6",
    tahap: AcademicStage.SEMINAR_PROPOSAL,
    jenisAgenda: "Seminar Proposal",
    tanggal: "16 Oktober 2026",
    waktu: "13:30 - 15:30 WIB",
    ruang: "Ruang Sidang Utama",
    lokasi: "Gedung Rektorat",
    statusAgenda: "Terjadwal"
  },
  {
    id: "ag8",
    mahasiswaId: "8",
    tahap: AcademicStage.SIDANG_AKHIR,
    jenisAgenda: "Sidang Akhir Skripsi",
    tanggal: "19 Oktober 2026",
    waktu: "09:00 - 11:00 WIB",
    ruang: "Ruang Ujian 102",
    lokasi: "Gedung Teknik Informatika",
    statusAgenda: "Terjadwal"
  },
  {
    id: "ag9",
    mahasiswaId: "9",
    tahap: AcademicStage.SIDANG_AKHIR,
    jenisAgenda: "Sidang Akhir Skripsi",
    tanggal: "12 Oktober 2026",
    waktu: "08:00 - 10:00 WIB",
    ruang: "Ruang Sidang Utama",
    lokasi: "Gedung Rektorat",
    statusAgenda: "Selesai"
  }
];
