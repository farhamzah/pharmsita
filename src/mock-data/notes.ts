import { AcademicStage, ThesisRole } from './enums';

export const mockNotes = [
  {
    id: "n1",
    mahasiswaId: "1",
    tahap: AcademicStage.SEMINAR_PROPOSAL,
    topik: "Bimbingan Bab 1-3",
    isiCatatan: "Perbaiki latar belakang masalah agar lebih tajam dan fokus pada gap penelitian.",
    dibuatOlehId: "d1",
    rolePembuat: ThesisRole.PEMBIMBING_1,
    statusCatatan: "revision",
    tanggal: "05/08/2026"
  },
  {
    id: "n2",
    mahasiswaId: "1",
    tahap: AcademicStage.SEMINAR_PROPOSAL,
    topik: "Revisi Proposal",
    isiCatatan: "Latar belakang sudah bagus, silakan persiapkan slide PPT untuk seminar.",
    dibuatOlehId: "d1",
    rolePembuat: ThesisRole.PEMBIMBING_1,
    statusCatatan: "approval",
    tanggal: "10/08/2026"
  },
  {
    id: "n3",
    mahasiswaId: "2",
    tahap: AcademicStage.SIDANG_AKHIR,
    topik: "Revisi Pasca Sidang",
    isiCatatan: "Tambahkan studi literatur terbaru tentang arsitektur sistem informasi.",
    dibuatOlehId: "d5",
    rolePembuat: ThesisRole.PENGUJI_1,
    statusCatatan: "revision",
    tanggal: "02/09/2026"
  },
  {
    id: "n4",
    mahasiswaId: "3",
    tahap: AcademicStage.REVISI_FINALISASI,
    topik: "Cek Kelengkapan Dokumen",
    isiCatatan: "Pastikan format daftar pustaka mengikuti panduan IEEE secara ketat.",
    dibuatOlehId: "d4",
    rolePembuat: ThesisRole.PENGUJI_1,
    statusCatatan: "revision",
    tanggal: "05/09/2026"
  }
];

export const mockAssessments = [
  {
    id: "as1",
    mahasiswaId: "2",
    tahap: AcademicStage.SIDANG_AKHIR,
    dosenId: "d5",
    rolePenilai: ThesisRole.PENGUJI_1,
    statusPenilaian: "Selesai Dinilai",
    nilai: 85,
    catatanPenilaian: "Presentasi sangat baik, namun dokumen masih butuh sedikit revisi teori.",
    tanggal: "01/09/2026"
  }
];

export const mockValidations = [
  {
    id: "v1",
    mahasiswaId: "1",
    tahap: AcademicStage.SEMINAR_PROPOSAL,
    dosenId: "d1",
    roleValidator: ThesisRole.PEMBIMBING_1,
    statusValidasi: "Disetujui",
    catatan: "Layak untuk maju ke seminar proposal minggu depan.",
    tanggal: "12/08/2026"
  },
  {
    id: "v2",
    mahasiswaId: "2",
    tahap: AcademicStage.SIDANG_AKHIR,
    dosenId: "d5",
    roleValidator: ThesisRole.PENGUJI_1,
    statusValidasi: "Menunggu Revisi",
    catatan: "Harap selesaikan revisi sebelum 14 Hari pasca sidang.",
    tanggal: "02/09/2026"
  }
];
