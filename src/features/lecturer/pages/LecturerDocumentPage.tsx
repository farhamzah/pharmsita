import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';
import BaseModal from '../../../components/ui/BaseModal';
import { 
  FileText, 
  Search, 
  ArrowLeft, 
  User, 
  Calendar, 
  Eye, 
  FileDown, 
  UserCheck, 
  TrendingUp, 
  BookOpen, 
  Award
} from 'lucide-react';

interface DocumentItem {
  id: string;
  type: 'Seminar Proposal' | 'Revisi Proposal' | 'Sidang Ujian Akhir' | 'Revisi Akhir';
  fileName: string;
  uploadDate: string;
  status: 'Final' | 'Direvisi' | 'Disetujui' | 'Belum Lengkap';
  fileSize: string;
  abstractSnippet: string;
}

interface CompletedStudent {
  id: string;
  name: string;
  nim: string;
  prodi: string;
  angkatan: string;
  kelas: string;
  title: string;
  graduationYear: string;
  statusTA: 'Selesai';
  p1: string;
  p2: string;
  pengujiProposal: {
    p1: string;
    p2: string;
    ketua: string;
  };
  pengujiSidang: {
    p1: string;
    p2: string;
    ketua: string;
  };
  documents: DocumentItem[];
}

const COMPLETED_STUDENTS_ARCHIVE: CompletedStudent[] = [
  {
    id: 's1',
    name: 'Muhammad Rizki',
    nim: '221011401234',
    prodi: 'S1 Farmasi',
    angkatan: '2022',
    kelas: '08FMPT001',
    title: 'Formulasi dan Uji Aktivitas Bakteri Sediaan Gel Ekstrak Daun Sirih (Piper betle L.) terhadap Bakteri Staphylococcus aureus',
    graduationYear: '2026',
    statusTA: 'Selesai',
    p1: 'Dr. Apt. Rina Marlina, M.Farm.',
    p2: 'Dr. Apt. Budi Santoso, M.Si.',
    pengujiProposal: {
      p1: 'Dr. Budi Harto, M.Farm.',
      p2: 'Dr. Andi Wijaya, M.Si.',
      ketua: 'Prof. Dr. Hj. Siti Rahayu'
    },
    pengujiSidang: {
      p1: 'Dr. Budi Harto, M.Farm.',
      p2: 'Dr. Apt. H. Syamsul Huda, M.Si.',
      ketua: 'Prof. Dr. Hj. Siti Rahayu'
    },
    documents: [
      {
        id: 'doc_1_1',
        type: 'Seminar Proposal',
        fileName: 'Proposal_TA_Muhammad_Rizki_Final.pdf',
        uploadDate: '12 Mei 2026',
        status: 'Disetujui',
        fileSize: '2.4 MB',
        abstractSnippet: 'Latar Belakang: Penggunaan antiseptik alami kini semakin diminati untuk menghindari efek samping zat kimia sintetis. Daun sirih hijau memiliki senyawa flavonoid dan tanin yang berfungsi kuat sebagai antibakteri...'
      },
      {
        id: 'doc_1_2',
        type: 'Revisi Proposal',
        fileName: 'Revisi_Proposal_TA_Muhammad_Rizki_v2.pdf',
        uploadDate: '19 Mei 2026',
        status: 'Final',
        fileSize: '2.6 MB',
        abstractSnippet: 'Penyempurnaan draf proposal skripsi berdasarkan revisi dewan penguji seminar proposal. Meliputi pemutakhiran pustaka 5 tahun terakhir, penambahan rancangan analisis ANOVA, serta klarifikasi konsentrasi gel Carbopol.'
      },
      {
        id: 'doc_1_3',
        type: 'Sidang Ujian Akhir',
        fileName: 'Naskah_Skripsi_Lengkap_Muhammad_Rizki.pdf',
        uploadDate: '21 Juni 2026',
        status: 'Direvisi',
        fileSize: '4.8 MB',
        abstractSnippet: 'Hasil penelitian menunjukkan gel ekstrak daun sirih hijau konsentrasi 4% dan 6% memiliki stabilitas fisik yang baik (uji organoleptik, pH, viskositas selama 4 minggu dipercepat) dan daya hambat Staphylococcus aureus...'
      },
      {
        id: 'doc_1_4',
        type: 'Revisi Akhir',
        fileName: 'Skripsi_Final_Muhammad_Rizki_Divalidasi.pdf',
        uploadDate: '29 Juni 2026',
        status: 'Disetujui',
        fileSize: '5.1 MB',
        abstractSnippet: 'Naskah Tugas Akhir final utuh (Bab 1 s.d 5) yang telah disetujui dewan penguji sidang akhir dan ketua sidang. Dilengkapi lembar pengesahan bermaterai dan siap diunggah ke repositori universitas.'
      }
    ]
  },
  {
    id: 's2',
    name: 'Ratna Sari',
    nim: '10123002',
    prodi: 'S1 Farmasi',
    angkatan: '2022',
    kelas: '08FMPT002',
    title: 'Analisis Stabilitas Fisikokimia dan Efektivitas Antioksidan Ekstrak Metanol Buah Naga Merah (Hylocereus polyrhizus) pada Sediaan Krim Wajah',
    graduationYear: '2026',
    statusTA: 'Selesai',
    p1: 'Dr. Apt. Rina Marlina, M.Farm.',
    p2: 'Dr. Apt. H. Syamsul Huda, M.Si.',
    pengujiProposal: {
      p1: 'Dr. Apt. Budi Santoso, M.Si.',
      p2: 'Dr. Andi Wijaya, M.Si.',
      ketua: 'Dr. Budi Harto, M.Farm.'
    },
    pengujiSidang: {
      p1: 'Dr. Apt. Budi Santoso, M.Si.',
      p2: 'Dr. Andi Wijaya, M.Si.',
      ketua: 'Prof. Dr. Hj. Siti Rahayu'
    },
    documents: [
      {
        id: 'doc_2_1',
        type: 'Seminar Proposal',
        fileName: 'Draf_Proposal_Krim_Antioksidan_Ratna.pdf',
        uploadDate: '08 April 2026',
        status: 'Disetujui',
        fileSize: '1.9 MB',
        abstractSnippet: 'Penelitian ini bertujuan untuk menformulasikan krim wajah dari n-heksan / metanol buah naga merah guna melindungi sel kulit dari paparan radikal bebas serta menguji efisiensi DPPH scavenging activity...'
      },
      {
        id: 'doc_2_2',
        type: 'Revisi Proposal',
        fileName: 'Revisi_Proposal_TA_RatnaSari_ACC.pdf',
        uploadDate: '15 April 2026',
        status: 'Final',
        fileSize: '2.1 MB',
        abstractSnippet: 'Dokumen perbaikan proposal mencakup penjelasan detail rancangan ekstraksi maserasi buah naga merah serta spesifikasi alat penetrasi sel kulit Franz diffusion cell.'
      },
      {
        id: 'doc_2_3',
        type: 'Sidang Ujian Akhir',
        fileName: 'Skripsi_NaskahUtuh_Ujian_Ratna_Sari.pdf',
        uploadDate: '02 Juni 2026',
        status: 'Disetujui',
        fileSize: '3.9 MB',
        abstractSnippet: 'Sediaan krim antioksidan buah naga merah menunjukkan stabilitas pH 5.2 - 5.8 yang cocok untuk kulit wajah. Nilai IC50 antioksidan tergolong kuat (85.4 ppm) dan tidak menimbulkan iritasi kulit pada sukarelawan.'
      },
      {
        id: 'doc_2_4',
        type: 'Revisi Akhir',
        fileName: 'Skripsi_Final_ACC_Tandatangan_Ratna_Sari.pdf',
        uploadDate: '10 Juni 2026',
        status: 'Disetujui',
        fileSize: '4.2 MB',
        abstractSnippet: 'Naskah skripsi lengkap teruji yang telah ditandatangani dewan penguji dan divalidasi oleh dekan fakultas sebagai syarat mutlak yudisium kelulusan akademik.'
      }
    ]
  },
  {
    id: 's3',
    name: 'Alvin Pratama',
    nim: '998877665',
    prodi: 'S1 Teknik Informatika',
    angkatan: '2022',
    kelas: '08FMPT003',
    title: 'Implementasi Algoritma Dijkstra dan A-Star pada Pencarian Rute Terpendek Distribusi Logistik Apotek',
    graduationYear: '2026',
    statusTA: 'Selesai',
    p1: 'Dr. Apt. Budi Santoso, M.Si.',
    p2: 'Prof. Dr. Hj. Siti Rahayu',
    pengujiProposal: {
      p1: 'Dr. Andi Wijaya, M.Si.',
      p2: 'Dr. Budi Harto, M.Farm.',
      ketua: 'Dr. Apt. Rina Marlina, M.Farm.'
    },
    pengujiSidang: {
      p1: 'Dr. Andi Wijaya, M.Si.',
      p2: 'Dr. Budi Harto, M.Farm.',
      ketua: 'Dr. Apt. Rina Marlina, M.Farm.'
    },
    documents: [
      {
        id: 'doc_3_1',
        type: 'Seminar Proposal',
        fileName: 'Proposal_TA_AlvinPratama.pdf',
        uploadDate: '20 Maret 2026',
        status: 'Disetujui',
        fileSize: '3.1 MB',
        abstractSnippet: 'Distribusi obat-obatan membutuhkan ketepatan rute untuk meminimalkan keterlambatan. Proposal ini membahas perbandingan kinerja waktu komputasi rute terpendek antara metode Dijkstra dan A*...'
      },
      {
        id: 'doc_3_2',
        type: 'Revisi Proposal',
        fileName: 'Revisi_Proposal_Dijkstra_Alvin.pdf',
        uploadDate: '27 Maret 2026',
        status: 'Final',
        fileSize: '3.3 MB',
        abstractSnippet: 'Revisi draf proposal dengan menyelaraskan peta titik koordinat API Google Maps dan menambahkan parameter tingkat kemacetan jalan raya.'
      },
      {
        id: 'doc_3_3',
        type: 'Sidang Ujian Akhir',
        fileName: 'Skripsi_Naskah_Alvin_Logistik_Apotek.pdf',
        uploadDate: '10 Mei 2026',
        status: 'Direvisi',
        fileSize: '5.5 MB',
        abstractSnippet: 'Aplikasi pencarian rute terpendek terbukti memangkas waktu pengiriman obat hingga 23.4% dibanding rute manual. Analisis komparatif menunjukkan algoritma A-Star 12% lebih cepat dibanding Dijkstra...'
      },
      {
        id: 'doc_3_4',
        type: 'Revisi Akhir',
        fileName: 'Skripsi_Final_Alvin_Diresmikan.pdf',
        uploadDate: '20 Mei 2026',
        status: 'Disetujui',
        fileSize: '5.9 MB',
        abstractSnippet: 'Dokumen skripsi final terintegrasi yang telah melalui revisi tata bahasa, format tabel, serta penambahan halaman kode sumber program pencarian rute.'
      }
    ]
  }
];

export const LecturerDocumentPage: React.FC = () => {
  const [students] = useState<CompletedStudent[]>(COMPLETED_STUDENTS_ARCHIVE);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // PDF Preview State
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.name.toLowerCase().includes(query) ||
      s.nim.toLowerCase().includes(query) ||
      s.title.toLowerCase().includes(query) ||
      s.graduationYear.includes(query)
    );
  });

  const handleOpenPreview = (doc: DocumentItem) => {
    setActiveDoc(doc);
    setPreviewOpen(true);
  };

  const listColumns = [
    {
      key: 'mahasiswa',
      label: 'Nama Mahasiswa',
      sortable: true,
      render: (row: CompletedStudent) => (
        <div className="py-1">
          <p className="font-extrabold text-foreground text-sm leading-tight">{row.name}</p>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">NIM: {row.nim}</p>
          <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800 rounded mt-1 uppercase">
            TA {row.statusTA}
          </span>
        </div>
      )
    },
    {
      key: 'judul',
      label: 'Judul Tugas Akhir',
      render: (row: CompletedStudent) => (
        <p className="text-xs text-foreground/80 leading-relaxed font-semibold italic border-l-2 border-primary/30 pl-2 py-0.5 max-w-[380px]" title={row.title}>
          {row.title}
        </p>
      )
    },
    {
      key: 'tahun',
      label: 'Tahun Sidang',
      render: (row: CompletedStudent) => (
        <span className="font-bold text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" /> {row.graduationYear}
        </span>
      )
    },
    {
      key: 'pembimbing',
      label: 'Dosen Pembimbing',
      render: (row: CompletedStudent) => (
        <div className="text-[11px] leading-relaxed font-medium">
          <p className="text-foreground/80"><strong className="text-primary font-bold">P1:</strong> {row.p1.split(',')[0]}</p>
          <p className="text-foreground/80 mt-0.5"><strong className="text-primary font-bold">P2:</strong> {row.p2.split(',')[0]}</p>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row: CompletedStudent) => (
        <button
          onClick={() => setSelectedStudentId(row.id)}
          className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg hover:bg-sky-100/50 transition cursor-pointer shadow-3xs flex items-center gap-1"
        >
          Lihat Detail
        </button>
      )
    }
  ];

  const getStatusBadgeStyle = (status: DocumentItem['status']) => {
    switch (status) {
      case 'Final':
        return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400';
      case 'Disetujui':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400';
      case 'Direvisi':
        return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
    }
  };

  return (
    <RoleLayoutComponent>
      {selectedStudent ? (
        // ================= DETAIL ARCHIVE VIEW =================
        <ContentWrapper
          title="Arsip Digital Skripsi Mahasiswa"
          description="Histori progres penyelesaian file draf bimbingan, revisi dewan penguji, hingga naskah akhir mahasiswa ybs."
          headerRight={
            <button
              onClick={() => setSelectedStudentId(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 bg-card border rounded-lg shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
            </button>
          }
        >
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Student Profile Card */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col lg:flex-row gap-6 justify-between">
              <div className="flex gap-4 items-start min-w-0">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-lg text-foreground leading-tight flex items-center gap-2">
                    {selectedStudent.name}
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full uppercase shrink-0">
                      Tugas Akhir {selectedStudent.statusTA}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">
                    NIM: {selectedStudent.nim} • Prodi: {selectedStudent.prodi}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Angkatan: {selectedStudent.angkatan} • Kelas: {selectedStudent.kelas}
                  </p>
                </div>
              </div>
              <div className="lg:text-right max-w-lg border-t lg:border-t-0 pt-4 lg:pt-0 border-border/60">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Judul Tugas Akhir</span>
                <p className="text-xs font-bold text-foreground leading-relaxed italic border-l-2 lg:border-l-0 lg:border-r-2 border-primary/30 pl-2 lg:pl-0 lg:pr-2 py-0.5">
                  "{selectedStudent.title}"
                </p>
                <span className="text-[9px] font-bold text-muted-foreground block mt-2">
                  Tahun Sidang Kelulusan: <strong className="text-foreground">{selectedStudent.graduationYear}</strong>
                </span>
              </div>
            </div>

            {/* Academic Board: Supervisors & Examiners */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Supervisors */}
              <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground border-b border-border/60 pb-3 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary" /> Tim Pembimbing Akademik
                </h4>
                <div className="space-y-3.5">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-0.5">Dosen Pembimbing 1 (Utama)</span>
                    <p className="text-xs font-bold text-foreground leading-tight">{selectedStudent.p1}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">NIDN: 0123456789</p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">Dosen Pembimbing 2 (Pendamping)</span>
                    <p className="text-xs font-bold text-foreground leading-tight">{selectedStudent.p2}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">NIDN: 0987654321</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Examiners (Proposal vs Final Defense) */}
              <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground border-b border-border/60 pb-3 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-primary" /> Histori Dewan Penguji Sidang
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Proposal Examiners */}
                  <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-3">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-primary border-b border-border/40 pb-1.5 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Seminar Proposal
                    </h5>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-medium">Ketua Dewan Penguji</span>
                        <p className="font-bold text-foreground">{selectedStudent.pengujiProposal.ketua.split(',')[0]}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-muted-foreground block font-medium">Dosen Penguji 1</span>
                          <p className="font-bold text-foreground truncate" title={selectedStudent.pengujiProposal.p1}>{selectedStudent.pengujiProposal.p1.split(',')[0]}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block font-medium">Dosen Penguji 2</span>
                          <p className="font-bold text-foreground truncate" title={selectedStudent.pengujiProposal.p2}>{selectedStudent.pengujiProposal.p2.split(',')[0]}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thesis Defense Examiners */}
                  <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-3">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-secondary-foreground border-b border-border/40 pb-1.5 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Sidang Ujian Akhir
                    </h5>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-medium">Ketua Dewan Penguji</span>
                        <p className="font-bold text-foreground">{selectedStudent.pengujiSidang.ketua.split(',')[0]}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-muted-foreground block font-medium">Dosen Penguji 1</span>
                          <p className="font-bold text-foreground truncate" title={selectedStudent.pengujiSidang.p1}>{selectedStudent.pengujiSidang.p1.split(',')[0]}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block font-medium">Dosen Penguji 2</span>
                          <p className="font-bold text-foreground truncate" title={selectedStudent.pengujiSidang.p2}>{selectedStudent.pengujiSidang.p2.split(',')[0]}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Journey Timeline */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-6 flex items-center gap-1.5 pb-3 border-b border-border/60">
                <TrendingUp className="w-4 h-4 text-primary" /> Timeline Perjalanan Dokumen Tugas Akhir
              </h4>
              <div className="relative pl-6 sm:pl-8 border-l border-border/80 ml-4 py-2 space-y-6">
                {selectedStudent.documents.map((doc, idx) => {
                  return (
                    <div key={doc.id} className="relative group">
                      {/* Timeline Dot Indicator */}
                      <span className="absolute -left-[31px] sm:-left-[39px] top-1 w-4 h-4 rounded-full border bg-background border-primary flex items-center justify-center text-primary group-hover:scale-110 transition shadow-2xs shrink-0 z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </span>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/20 hover:bg-muted/40 border border-border/50 rounded-xl transition duration-200">
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-primary block mb-0.5">Langkah {idx + 1}</span>
                          <h6 className="text-xs font-extrabold text-foreground">{doc.type}</h6>
                          <p className="text-[10px] text-muted-foreground mt-0.5">File: {doc.fileName} ({doc.fileSize})</p>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <span className="text-[9px] text-muted-foreground font-semibold block sm:inline-block">Diupload: {doc.uploadDate}</span>
                          <span className={`inline-block sm:ml-2.5 px-2 py-0.5 text-[8px] font-extrabold rounded border uppercase ${getStatusBadgeStyle(doc.status)}`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Archive Listing */}
            <SectionCard title="Arsip Berkas Digital Skripsi" collapsible={false} className="border-border/50 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {selectedStudent.documents.map((doc, idx) => (
                  <div key={doc.id} className="bg-muted/10 border border-border/80 rounded-2xl p-5 hover:border-primary/40 transition flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex gap-2.5 items-center">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-primary uppercase block">Dokumen {idx + 1}</span>
                            <h5 className="text-xs font-bold text-foreground leading-tight mt-0.5">{doc.type}</h5>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase shrink-0 ${getStatusBadgeStyle(doc.status)}`}>
                          {doc.status}
                        </span>
                      </div>

                      {/* Content Description */}
                      <div className="space-y-2 border-y border-border/50 py-3">
                        <div>
                          <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Nama File</span>
                          <p className="text-xs font-semibold text-foreground truncate mt-0.5" title={doc.fileName}>{doc.fileName}</p>
                          <span className="text-[9px] text-muted-foreground mt-0.5 block">Ukuran: {doc.fileSize} • Upload: {doc.uploadDate}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Sinopsis/Keterangan Abstrak</span>
                          <p className="text-[10px] text-foreground/80 leading-relaxed italic line-clamp-3 mt-1 pl-2 border-l-2 border-border font-medium">
                            {doc.abstractSnippet}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2.5 mt-5">
                      <button
                        onClick={() => handleOpenPreview(doc)}
                        className="px-3.5 py-2 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 text-xs font-extrabold rounded-lg hover:bg-sky-100/50 transition cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat File
                      </button>
                      <button
                        onClick={() => alert(`Memulai download file: ${doc.fileName}`)}
                        className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-extrabold rounded-lg hover:bg-primary/95 transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                      >
                        <FileDown className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </ContentWrapper>
      ) : (
        // ================= LIST VIEW (DEFAULT) =================
        <ContentWrapper
          title="Arsip Dokumen Kelulusan"
          description="Daftar seluruh mahasiswa bimbingan yang telah lulus ujian dan menyelesaikan perbaikan revisi tugas akhir secara resmi."
        >
          <SectionCard title="Daftar Arsip Digital Mahasiswa" collapsible={false} className="border-border/50 shadow-xs animate-in fade-in duration-300">
            {/* Search Input Bar */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Cari nama, NIM, atau judul TA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-primary bg-card text-foreground"
                />
                <div className="absolute left-3 top-3 text-muted-foreground">
                  <Search className="w-4 h-4" />
                </div>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer shrink-0"
                >
                  Reset Pencarian
                </button>
              )}
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-12 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <h6 className="text-xs font-bold text-muted-foreground">Tidak Ada Arsip Dokumen</h6>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  Tidak ditemukan berkas mahasiswa yang memenuhi kriteria pencarian Anda.
                </p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
                <DataTable data={filteredStudents} columns={listColumns} />
              </div>
            )}
          </SectionCard>
        </ContentWrapper>
      )}

      {/* PDF PREVIEW MODAL */}
      {previewOpen && activeDoc && (
        <BaseModal
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setActiveDoc(null);
          }}
          title={`Simulasi PDF Viewer - ${activeDoc.type}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 pt-2">
            {/* Simulated PDF Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/60 dark:bg-slate-900 border border-border rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-foreground">{activeDoc.fileName}</span>
                <span className="text-[10px] text-muted-foreground">({activeDoc.fileSize})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground font-semibold">Halaman 1 dari 12</span>
                <div className="h-4 w-[1px] bg-border/60" />
                <span className="text-muted-foreground font-semibold">Zoom 100%</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => alert('Fitur pencetakan terintegrasi!')}
                  className="px-2.5 py-1.5 border border-border bg-card rounded-md font-semibold hover:bg-muted text-foreground cursor-pointer"
                >
                  Print
                </button>
                <button
                  onClick={() => alert(`Mengunduh berkas asli: ${activeDoc.fileName}`)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/95 cursor-pointer"
                >
                  Download Asli
                </button>
              </div>
            </div>

            {/* Simulated PDF Document Page Canvas */}
            <div className="bg-slate-800 dark:bg-slate-950 p-6 sm:p-8 rounded-2xl flex justify-center max-h-[60vh] overflow-y-auto min-h-[400px]">
              <div className="bg-white text-slate-900 w-full max-w-[700px] aspect-[1/1.4] p-8 sm:p-12 shadow-2xl flex flex-col justify-between font-serif animate-in zoom-in-95 duration-200">
                {/* Simulated Content */}
                <div className="space-y-6">
                  {/* Paper Header */}
                  <div className="text-center space-y-1.5 border-b border-slate-900/10 pb-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-sans">Dokumentasi Skripsi Digital</span>
                    <h2 className="text-xs uppercase font-bold text-slate-900 tracking-wider">Universitas PharmSita Indonesia</h2>
                    <h3 className="text-[10px] font-medium text-slate-600">Fakultas Ilmu Kesehatan & Matematika</h3>
                  </div>

                  {/* Title */}
                  <div className="py-4">
                    <span className="text-[9px] uppercase font-bold text-primary tracking-widest font-sans block mb-1">Judul Penelitian</span>
                    <h1 className="text-sm font-extrabold leading-relaxed text-slate-900 border-l-4 border-slate-900 pl-3">
                      {selectedStudent?.title || 'Formulasi dan Uji Aktivitas Bakteri Sediaan Gel Ekstrak Daun Sirih'}
                    </h1>
                  </div>

                  {/* Author */}
                  <div className="text-xs border-y border-slate-950/5 py-2.5 font-sans grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] uppercase font-bold text-slate-400 block">Mahasiswa Penulis</span>
                      <strong className="text-slate-800 font-bold">{selectedStudent?.name}</strong>
                      <p className="text-[10px] text-slate-500 mt-0.5">NIM. {selectedStudent?.nim}</p>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-slate-400 block">Dosen Pembimbing 1</span>
                      <strong className="text-slate-800 font-bold">{selectedStudent?.p1.split(',')[0]}</strong>
                      <p className="text-[10px] text-slate-500 mt-0.5">NIDN. 0123456789</p>
                    </div>
                  </div>

                  {/* Abstract Section */}
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 font-sans block">Format Ringkasan Abstrak ({activeDoc.status})</span>
                    <p className="text-[10px] leading-relaxed text-slate-700 italic text-justify pl-1 border-l border-slate-300">
                      "{activeDoc.abstractSnippet}"
                    </p>
                    <p className="text-[10px] leading-relaxed text-slate-600 text-justify">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam id massa sed nisl elementum cursus eu a diam. Mauris eget dictum justo. In hendrerit, neque vitae placerat tempus, arcu lectus bibendum nisl, in feugiat purus lectus non ligula. Curabitur convallis, elit eu tempus varius, magna ipsum rutrum nibh, at efficitur orci purus sed dolor. Pellentesque in metus scelerisque, iaculis erat eget, posuere ipsum.
                    </p>
                  </div>
                </div>

                {/* Footer Stamp */}
                <div className="border-t border-slate-950/10 pt-4 flex justify-between items-center text-[8px] text-slate-400 font-sans">
                  <span>Arsip Kelulusan Dokumen #{activeDoc.id}</span>
                  <span className="font-semibold text-emerald-600 uppercase tracking-widest flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                    STATUS: {activeDoc.status}
                  </span>
                  <span>Halaman 1</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-3 border-t border-border/50">
              <button
                onClick={() => {
                  setPreviewOpen(false);
                  setActiveDoc(null);
                }}
                className="px-4 py-2 bg-muted text-muted-foreground text-xs font-bold rounded-lg hover:bg-muted/80 cursor-pointer"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </BaseModal>
      )}
    </RoleLayoutComponent>
  );
};

export default LecturerDocumentPage;
