import { AcademicStage, ThesisRole } from './enums';

export const mockTheses = [
  {
    id: "t1",
    mahasiswaId: "1",
    judul: "Penerapan Machine Learning untuk Prediksi Cuaca di Indonesia",
    tahapanAktif: AcademicStage.SEMINAR_PROPOSAL,
    statusUmum: "Menjadwalkan Sidang",
    fileSkripsi: "Proposal_Skripsi_Budi_Santoso.pdf",
    linkSkripsi: "https://docs.google.com/document/d/proposal-budi",
  },
  {
    id: "t2",
    mahasiswaId: "2",
    judul: "Sistem Informasi Manajemen Tugas Akhir Terintegrasi",
    tahapanAktif: AcademicStage.SIDANG_AKHIR,
    statusUmum: "Selesai Sidang - Menunggu Revisi",
    fileSkripsi: "Skripsi_Final_Siti_Aminah.pdf",
    linkSkripsi: "https://docs.google.com/document/d/skripsi-siti",
  },
  {
    id: "t3",
    mahasiswaId: "3",
    judul: "Analisis Kinerja Algoritma Enkripsi AES pada Perangkat IoT",
    tahapanAktif: AcademicStage.REVISI_FINALISASI,
    statusUmum: "Sedang Mengerjakan Revisi",
    fileSkripsi: "Revisi_Skripsi_Andi_Wijaya.pdf",
    linkSkripsi: "https://docs.google.com/document/d/revisi-andi",
  },
  {
    id: "t4",
    mahasiswaId: "4",
    judul: "Pengembangan Game Edukasi Anak",
    tahapanAktif: AcademicStage.SEMINAR_PROPOSAL,
    statusUmum: "Bimbingan Skripsi",
    fileSkripsi: "-",
    linkSkripsi: "-",
  },
  {
    id: "t5",
    mahasiswaId: "5",
    judul: "Analisis Sentimen pada Media Sosial",
    tahapanAktif: AcademicStage.SIDANG_AKHIR,
    statusUmum: "Jadwal Sidang Ditetapkan",
    fileSkripsi: "Skripsi_Dodi.pdf",
    linkSkripsi: "-",
  },
  {
    id: "t6",
    mahasiswaId: "6",
    judul: "Sistem Deteksi Intrusi Jaringan",
    tahapanAktif: AcademicStage.SEMINAR_PROPOSAL,
    statusUmum: "Jadwal Sidang Ditetapkan",
    fileSkripsi: "Proposal_Sisca.pdf",
    linkSkripsi: "-",
  },
  {
    id: "t7",
    mahasiswaId: "7",
    judul: "Pembuatan Robot Pembersih Lantai",
    tahapanAktif: AcademicStage.REVISI_FINALISASI,
    statusUmum: "Jadwal Sidang Ditetapkan",
    fileSkripsi: "Revisi_Robot_Ujang.pdf",
    linkSkripsi: "-",
  },
  {
    id: "t8",
    mahasiswaId: "8",
    judul: "Sistem Pakar Diagnosa Penyakit",
    tahapanAktif: AcademicStage.SIDANG_AKHIR,
    statusUmum: "Jadwal Sidang Ditetapkan",
    fileSkripsi: "Skripsi_Lia.pdf",
    linkSkripsi: "-",
  },
  {
    id: "t9",
    mahasiswaId: "9",
    judul: "Pengaruh Penggunaan Smartphone Terhadap Prestasi Belajar",
    tahapanAktif: AcademicStage.SIDANG_AKHIR,
    statusUmum: "Selesai Sidang",
    fileSkripsi: "Skripsi_Hendra.pdf",
    linkSkripsi: "-",
  },
  // the rest from coordinator-student-data
  { id: "t10", mahasiswaId: "10", judul: "Sistem Deteksi Anomali pada Jaringan IoT menggunakan Deep Learning", tahapanAktif: AcademicStage.BIMBINGAN, statusUmum: "Bimbingan", fileSkripsi: "-", linkSkripsi: "-" },
  { id: "t11", mahasiswaId: "11", judul: "Pengembangan Aplikasi Monitoring Pasien Hipertensi Berbasis Mobile", tahapanAktif: AcademicStage.SEMINAR_PROPOSAL, statusUmum: "Siap Sempro", fileSkripsi: "-", linkSkripsi: "-" },
  { id: "t12", mahasiswaId: "12", judul: "Analisis Sentimen Pengguna Aplikasi E-Commerce menggunakan Metode SVM", tahapanAktif: AcademicStage.SIDANG_AKHIR, statusUmum: "Siap Sidang", fileSkripsi: "-", linkSkripsi: "-" },
  { id: "t13", mahasiswaId: "13", judul: "Penerapan Metode Agile pada Pengembangan Sistem Informasi Akademik", tahapanAktif: AcademicStage.REVISI_FINALISASI, statusUmum: "Revisi", fileSkripsi: "-", linkSkripsi: "-" },
  { id: "t14", mahasiswaId: "14", judul: "Optimasi Jaringan menggunakan Algoritma Genetika", tahapanAktif: AcademicStage.SEMINAR_PROPOSAL, statusUmum: "Selesai Sempro", fileSkripsi: "-", linkSkripsi: "-" }
];

export const mockLecturerStudentRoles = [
  // Mahasiswa 1
  { mahasiswaId: "1", dosenId: "d1", role: ThesisRole.PEMBIMBING_1 },
  { mahasiswaId: "1", dosenId: "d2", role: ThesisRole.PEMBIMBING_2 },
  { mahasiswaId: "1", dosenId: "d3", role: ThesisRole.PENGUJI_1 },
  { mahasiswaId: "1", dosenId: "d4", role: ThesisRole.PENGUJI_2 },
  { mahasiswaId: "1", dosenId: "d5", role: ThesisRole.KETUA_SIDANG },
  // Mahasiswa 2
  { mahasiswaId: "2", dosenId: "d2", role: ThesisRole.PEMBIMBING_1 },
  { mahasiswaId: "2", dosenId: "d5", role: ThesisRole.PENGUJI_1 },
  // Mahasiswa 3
  { mahasiswaId: "3", dosenId: "d1", role: ThesisRole.PEMBIMBING_2 },
  { mahasiswaId: "3", dosenId: "d4", role: ThesisRole.PENGUJI_1 },
  // Mahasiswa 4
  { mahasiswaId: "4", dosenId: "d1", role: ThesisRole.PEMBIMBING_2 },
  // Mahasiswa 5
  { mahasiswaId: "5", dosenId: "d1", role: ThesisRole.PENGUJI_1 },
  // Mahasiswa 6
  { mahasiswaId: "6", dosenId: "d1", role: ThesisRole.PENGUJI_1 },
  // Mahasiswa 7
  { mahasiswaId: "7", dosenId: "d1", role: ThesisRole.PENGUJI_2 },
  // Mahasiswa 8
  { mahasiswaId: "8", dosenId: "d1", role: ThesisRole.PENGUJI_2 },
  // Mahasiswa 9
  { mahasiswaId: "9", dosenId: "d1", role: ThesisRole.KETUA_SIDANG },
  // New from coordinator
  { mahasiswaId: "10", dosenId: "d1", role: ThesisRole.PEMBIMBING_1 },
  { mahasiswaId: "11", dosenId: "d2", role: ThesisRole.PEMBIMBING_1 },
  { mahasiswaId: "11", dosenId: "d6", role: ThesisRole.PEMBIMBING_2 },
  { mahasiswaId: "12", dosenId: "d6", role: ThesisRole.PEMBIMBING_1 },
  { mahasiswaId: "13", dosenId: "d1", role: ThesisRole.PEMBIMBING_1 },
  { mahasiswaId: "14", dosenId: "d2", role: ThesisRole.PEMBIMBING_1 },
];
