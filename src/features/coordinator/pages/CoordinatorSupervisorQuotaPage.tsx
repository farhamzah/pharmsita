import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';
import { X, Edit, User, Users, CheckCircle2, Search } from 'lucide-react';

interface DosenSupervisorData {
  id: string;
  name: string;
  nip: string;
  programStudi: string;
  jabatan: string;
  p1Max: number;
  p1Active: number;
  p2Max: number;
  p2Active: number;
  completedCount: number;
}

const INITIAL_DOSEN_LIST: DosenSupervisorData[] = [
  {
    id: '1',
    name: 'Dr. Apt. Rina Marlina, M.Farm.',
    nip: '198008102005012001',
    programStudi: 'S1 Farmasi',
    jabatan: 'Lektor',
    p1Max: 8,
    p1Active: 5,
    p2Max: 8,
    p2Active: 2,
    completedCount: 12
  },
  {
    id: '2',
    name: 'Dr. Apt. Budi Santoso, M.Si.',
    nip: '197803152006021002',
    programStudi: 'S1 Farmasi',
    jabatan: 'Lektor Kepala',
    p1Max: 6,
    p1Active: 4,
    p2Max: 6,
    p2Active: 1,
    completedCount: 9
  },
  {
    id: '3',
    name: 'Dr. Apt. Siti Nurhayati, M.Farm.',
    nip: '197505202004012003',
    programStudi: 'S1 Farmasi',
    jabatan: 'Koordinator / Lektor Kepala',
    p1Max: 10,
    p1Active: 4,
    p2Max: 10,
    p2Active: 3,
    completedCount: 15
  },
  {
    id: '4',
    name: 'Apt. Ahmad Subagja, M.Sc.',
    nip: '198502122010021004',
    programStudi: 'S1 Farmasi',
    jabatan: 'Asisten Ahli',
    p1Max: 5,
    p1Active: 3,
    p2Max: 5,
    p2Active: 2,
    completedCount: 4
  },
  {
    id: '5',
    name: 'Apt. Citra Dewi, M.Farm.',
    nip: '198812312015012005',
    programStudi: 'S1 Farmasi',
    jabatan: 'Asisten Ahli',
    p1Max: 6,
    p1Active: 2,
    p2Max: 6,
    p2Active: 2,
    completedCount: 6
  }
];

interface MappedStudent {
  id: string;
  name: string;
  nim: string;
  title: string;
  stage: string;
  studentId: string;
}

interface StudentSupervisorData {
  id: string; // studentId
  name: string;
  nim: string;
  title: string;
  stage: string;
  p1Id: string;
  p2Id: string;
}

const INITIAL_STUDENT_LIST: StudentSupervisorData[] = [
  {
    id: '10',
    name: 'Alif Fikri',
    nim: '10123001',
    title: 'Sistem Deteksi Anomali Jaringan IoT menggunakan Deep Learning',
    stage: 'Bimbingan Pra Proposal',
    p1Id: '1',
    p2Id: '2'
  },
  {
    id: '6',
    name: 'Sisca Kaila',
    nim: '887766554',
    title: 'Sistem Deteksi Intrusi Jaringan Nirkabel Terdistribusi',
    stage: 'Seminar Proposal',
    p1Id: '1',
    p2Id: '3'
  },
  {
    id: '11',
    name: 'Ratna Sari',
    nim: '10123002',
    title: 'Pengembangan Aplikasi Monitoring Pasien Hipertensi',
    stage: 'Sidang Akhir',
    p1Id: '3',
    p2Id: '1'
  },
  {
    id: '12',
    name: 'Bagas Aditya',
    nim: '10123003',
    title: 'Analisis Sentimen Pengguna Aplikasi E-Commerce menggunakan Metode SVM',
    stage: 'Sidang Akhir',
    p1Id: '2',
    p2Id: '4'
  },
  {
    id: '13',
    name: 'Dewi Lestari',
    nim: '10123004',
    title: 'Penerapan Metode Agile pada Pengembangan Sistem Informasi Akademik',
    stage: 'Revisi Sidang',
    p1Id: '4',
    p2Id: '5'
  },
  {
    id: '14',
    name: 'Toni Hidayat',
    nim: '10123005',
    title: 'Optimasi Jaringan menggunakan Algoritma Genetika',
    stage: 'Revisi Seminar Proposal',
    p1Id: '5',
    p2Id: '4'
  },
  {
    id: '9',
    name: 'Hendra Setiawan',
    nim: '121212121',
    title: 'Pengaruh Smartphone terhadap Prestasi Belajar',
    stage: 'Selesai',
    p1Id: '1',
    p2Id: '2'
  },
  {
    id: '1',
    name: 'Budi Santoso',
    nim: '13519001',
    title: 'Sistem Informasi Manajemen Perpustakaan Berbasis AI',
    stage: 'Selesai',
    p1Id: '3',
    p2Id: '5'
  }
];

const getGuidedStudents = (
  students: StudentSupervisorData[],
  lecturerId: string,
  filterType: 'p1' | 'p2' | 'completed'
): MappedStudent[] => {
  return students
    .filter(s => {
      if (filterType === 'p1') return s.p1Id === lecturerId && s.stage !== 'Selesai';
      if (filterType === 'p2') return s.p2Id === lecturerId && s.stage !== 'Selesai';
      return (s.p1Id === lecturerId || s.p2Id === lecturerId) && s.stage === 'Selesai';
    })
    .map(s => ({
      id: `g-${s.id}`,
      name: s.name,
      nim: s.nim,
      title: s.title,
      stage: s.stage,
      studentId: s.id
    }));
};

export const CoordinatorSupervisorQuotaPage: React.FC = () => {
  const [dosenList, setDosenList] = useState<DosenSupervisorData[]>(INITIAL_DOSEN_LIST);
  const [studentsList, setStudentsList] = useState<StudentSupervisorData[]>(INITIAL_STUDENT_LIST);
  
  // View states
  const [activeMainTab, setActiveMainTab] = useState<'kuota' | 'pembimbing'>('kuota');
  const [selectedDosenId, setSelectedDosenId] = useState<string | null>(null);
  const [guidedFilter, setGuidedFilter] = useState<'p1' | 'p2' | 'completed'>('p1');

  // Edit Quota Modal State
  const [isEditingQuota, setIsEditingQuota] = useState<boolean>(false);
  const [currentEditDosen, setCurrentEditDosen] = useState<DosenSupervisorData | null>(null);
  const [quotaP1Input, setQuotaP1Input] = useState<number>(8);
  const [quotaP2Input, setQuotaP2Input] = useState<number>(8);

  // Edit Pembimbing Modal State
  const [isEditingPembimbing, setIsEditingPembimbing] = useState<boolean>(false);
  const [currentEditStudent, setCurrentEditStudent] = useState<StudentSupervisorData | null>(null);
  const [p1InputId, setP1InputId] = useState<string>('');
  const [p2InputId, setP2InputId] = useState<string>('');
  const [alasanChange, setAlasanChange] = useState<string>('');

  // Search filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchDosenQuery, setSearchDosenQuery] = useState<string>('');

  // Derived state for dynamic supervisor counts on lecturers
  const dynamicDosenList = dosenList.map(d => {
    const p1Active = studentsList.filter(s => s.p1Id === d.id && s.stage !== 'Selesai').length;
    const p2Active = studentsList.filter(s => s.p2Id === d.id && s.stage !== 'Selesai').length;
    return {
      ...d,
      p1Active,
      p2Active
    };
  });

  // Derived state for filtered lecturers in Kuota Pembimbing tab
  const filteredDosen = dynamicDosenList.filter(d => {
    const query = searchDosenQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      d.name.toLowerCase().includes(query) ||
      d.nip.toLowerCase().includes(query) ||
      d.programStudi.toLowerCase().includes(query) ||
      d.jabatan.toLowerCase().includes(query)
    );
  });

  // Derived state for filtered students in Pembimbing tab
  const filteredStudents = studentsList.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const p1 = dynamicDosenList.find(d => d.id === s.p1Id);
    const p2 = dynamicDosenList.find(d => d.id === s.p2Id);
    
    return (
      s.name.toLowerCase().includes(query) ||
      s.nim.toLowerCase().includes(query) ||
      s.title.toLowerCase().includes(query) ||
      s.stage.toLowerCase().includes(query) ||
      (p1 && p1.name.toLowerCase().includes(query)) ||
      (p2 && p2.name.toLowerCase().includes(query))
    );
  });

  // Redirection to student monitoring detail
  const handleStudentClick = (student: MappedStudent) => {
    const stageMap: Record<string, string> = {
      'Persyaratan Awal': 'pendaftaran-ta',
      'Pengajuan Judul': 'pendaftaran-ta',
      'Bimbingan Pra Proposal': 'bimbingan-pra-proposal',
      'Seminar Proposal': 'sidang-proposal',
      'Revisi Seminar Proposal': 'revisi-proposal',
      'Bimbingan Pra Sidang': 'bimbingan-pra-sidang',
      'Sidang Akhir': 'sidang',
      'Revisi Sidang': 'revisi-sidang',
      'Selesai': 'revisi-sidang'
    };
    const targetStepId = stageMap[student.stage] || 'pendaftaran-ta';
    sessionStorage.setItem('monitor_student_id', student.studentId);
    sessionStorage.setItem('monitor_step_id', targetStepId);
    window.location.hash = `#/${getCurrentRolePath()}/tahapan-akademik`;
  };

  // Open Edit Quota modal
  const openEditQuotaModal = (dosen: DosenSupervisorData) => {
    setCurrentEditDosen(dosen);
    setQuotaP1Input(dosen.p1Max);
    setQuotaP2Input(dosen.p2Max);
    setIsEditingQuota(true);
  };

  // Save Quota changes
  const handleSaveQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditDosen) return;

    const updatedList = dosenList.map(item => {
      if (item.id === currentEditDosen.id) {
        return {
          ...item,
          p1Max: quotaP1Input,
          p2Max: quotaP2Input
        };
      }
      return item;
    });

    setDosenList(updatedList);
    setIsEditingQuota(false);
    setCurrentEditDosen(null);
  };

  // Open Edit Pembimbing modal
  const openEditPembimbingModal = (student: StudentSupervisorData) => {
    setCurrentEditStudent(student);
    setP1InputId(student.p1Id);
    setP2InputId(student.p2Id);
    setAlasanChange('');
    setIsEditingPembimbing(true);
  };

  // Save Pembimbing changes
  const handleSavePembimbing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditStudent) return;

    if (p1InputId === p2InputId) {
      alert('Dosen Pembimbing 1 dan Pembimbing 2 tidak boleh sama.');
      return;
    }

    const updatedStudents = studentsList.map(s => {
      if (s.id === currentEditStudent.id) {
        return {
          ...s,
          p1Id: p1InputId,
          p2Id: p2InputId
        };
      }
      return s;
    });

    setStudentsList(updatedStudents);
    setIsEditingPembimbing(false);
    setCurrentEditStudent(null);
  };

  const selectedDosen = dynamicDosenList.find(d => d.id === selectedDosenId);
  const guidedStudents = selectedDosen ? getGuidedStudents(studentsList, selectedDosen.id, guidedFilter) : [];

  const quotaColumns = [
    { key: 'dosen', label: 'Dosen', sortable: true, render: (row: DosenSupervisorData) => (
      <div className="py-1">
        <p className="font-bold text-foreground text-sm">{row.name}</p>
        <p className="text-xs text-muted-foreground font-semibold">NIP: {row.nip}</p>
      </div>
    )},
    { key: 'quota', label: 'Kuota P1 | P2', render: (row: DosenSupervisorData) => {
      const p1Full = row.p1Active >= row.p1Max;
      const p2Full = row.p2Active >= row.p2Max;
      return (
        <div className="text-xs font-semibold flex items-center gap-1.5 py-1">
          <span className={`px-2 py-0.5 rounded-full border ${p1Full ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-sky-50 border-sky-200 text-sky-700'}`}>
            P1 {row.p1Active}/{row.p1Max}
          </span>
          <span className="text-muted-foreground font-bold">|</span>
          <span className={`px-2 py-0.5 rounded-full border ${p2Full ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
            P2 {row.p2Active}/{row.p2Max}
          </span>
        </div>
      );
    }},
    { key: 'completed', label: 'Selesai', sortable: true, render: (row: DosenSupervisorData) => (
      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
        {row.completedCount} Mahasiswa
      </span>
    )},
    { key: 'actions', label: 'Aksi', render: (row: DosenSupervisorData) => (
      <div className="flex items-center gap-1.5 py-1">
        <button 
          onClick={() => openEditQuotaModal(row)}
          className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border shadow-3xs transition cursor-pointer"
        >
          Ubah Kuota
        </button>
        <button 
          onClick={() => {
            setSelectedDosenId(row.id);
            setGuidedFilter('p1');
          }}
          className="px-2.5 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition shadow-3xs cursor-pointer"
        >
          Lihat Detail
        </button>
      </div>
    )}
  ];

  const studentColumns = [
    { key: 'student', label: 'Nama', sortable: true, render: (row: MappedStudent) => (
      <div className="py-1 max-w-[450px]">
        <p className="font-bold text-foreground text-sm">{row.name}</p>
        <p className="text-xs text-muted-foreground font-semibold">NIM: {row.nim}</p>
        <p className="text-xs text-foreground/80 mt-1 font-medium leading-relaxed italic border-l-2 border-primary/30 pl-2 py-0.5" title={row.title}>
          {row.title}
        </p>
      </div>
    )},
    { key: 'stage', label: 'Tahapan', render: (row: MappedStudent) => (
      <span className="font-bold text-xs text-primary bg-primary/5 dark:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg inline-block">
        {row.stage}
      </span>
    )},
    { key: 'actions', label: 'Aksi', render: (row: MappedStudent) => (
      <button 
        onClick={() => handleStudentClick(row)}
        className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg hover:bg-sky-100/50 transition cursor-pointer shadow-3xs"
      >
        Lihat Detail
      </button>
    )}
  ];

  const allStudentsColumns = [
    { key: 'student', label: 'Nama', sortable: true, render: (row: StudentSupervisorData) => (
      <div className="py-1 max-w-[450px]">
        <p className="font-bold text-foreground text-sm">{row.name}</p>
        <p className="text-xs text-muted-foreground font-semibold">NIM: {row.nim}</p>
        <p className="text-xs text-foreground/80 mt-1 font-medium leading-relaxed italic border-l-2 border-primary/30 pl-2 py-0.5" title={row.title}>
          {row.title}
        </p>
      </div>
    )},
    { key: 'stage', label: 'Tahapan', render: (row: StudentSupervisorData) => (
      <span className="font-bold text-xs text-primary bg-primary/5 dark:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg inline-block">
        {row.stage}
      </span>
    )},
    { key: 'supervisors', label: 'Pembimbing', render: (row: StudentSupervisorData) => {
      const p1 = dynamicDosenList.find(d => d.id === row.p1Id);
      const p2 = dynamicDosenList.find(d => d.id === row.p2Id);
      return (
        <div className="text-xs font-semibold py-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-extrabold border border-sky-200 dark:border-sky-800">
              P1
            </span>
            <span className="text-foreground">{p1 ? p1.name : 'Belum Ditentukan'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-200 dark:border-indigo-800">
              P2
            </span>
            <span className="text-foreground">{p2 ? p2.name : 'Belum Ditentukan'}</span>
          </div>
        </div>
      );
    }},
    { key: 'actions', label: 'Aksi', render: (row: StudentSupervisorData) => (
      <button 
        onClick={() => openEditPembimbingModal(row)}
        className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg hover:bg-sky-100/50 transition cursor-pointer shadow-3xs"
      >
        Ubah Pembimbing
      </button>
    )}
  ];

  return (
    <RoleLayoutComponent>
      {selectedDosen ? (
        // ================= DOSEN DETAIL PANEL VIEW =================
        <ContentWrapper 
          title="Detail Dosen Pembimbing" 
          description="Pantau kuota beban kerja serta data mahasiswa Tugas Akhir yang dibimbing oleh dosen terpilih."
          headerRight={
            <button 
              onClick={() => setSelectedDosenId(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 bg-card border rounded-lg shadow-2xs cursor-pointer"
            >
              <X className="w-4 h-4" /> Tutup Detail
            </button>
          }
        >
          {/* Header Dosen Profile Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs mb-6 grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Section: Personal Profile */}
            <div className="md:col-span-6 flex gap-4 items-center border-b md:border-b-0 md:border-r border-border/60 pb-4 md:pb-0 pr-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-base text-foreground leading-snug truncate">{selectedDosen.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">NIP: {selectedDosen.nip}</p>
                <p className="text-xs font-semibold text-primary mt-1">{selectedDosen.programStudi} • {selectedDosen.jabatan}</p>
              </div>
            </div>

            {/* Right Section: Statistics */}
            <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
              <div className="text-center md:text-left bg-muted/20 p-2.5 rounded-xl border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Mahasiswa Aktif</span>
                <strong className="text-base font-extrabold text-foreground block mt-1">{selectedDosen.p1Active + selectedDosen.p2Active} Mhs</strong>
              </div>
              <div className="text-center md:text-left bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Mahasiswa Lulus</span>
                <strong className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 block mt-1">{selectedDosen.completedCount} Mhs</strong>
              </div>
              <div className="text-center md:text-left bg-sky-500/5 p-2.5 rounded-xl border border-sky-500/10">
                <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-bold block">Kuota P1</span>
                <strong className="text-base font-extrabold text-sky-700 dark:text-sky-400 block mt-1">{selectedDosen.p1Active}/{selectedDosen.p1Max}</strong>
              </div>
              <div className="text-center md:text-left bg-indigo-500/5 p-2.5 rounded-xl border border-indigo-500/10">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold block">Kuota P2</span>
                <strong className="text-base font-extrabold text-indigo-700 dark:text-indigo-400 block mt-1">{selectedDosen.p2Active}/{selectedDosen.p2Max}</strong>
              </div>
            </div>
          </div>

          {/* Sub Navigation / Filter for guided students */}
          <div className="flex flex-wrap gap-2 border-b pb-4 mb-6">
            <button 
              onClick={() => setGuidedFilter('p1')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                guidedFilter === 'p1' 
                  ? 'bg-sky-600 text-white shadow-xs' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Sebagai Pembimbing 1 ({selectedDosen.p1Active})
            </button>
            <button 
              onClick={() => setGuidedFilter('p2')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                guidedFilter === 'p2' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Sebagai Pembimbing 2 ({selectedDosen.p2Active})
            </button>
            <button 
              onClick={() => setGuidedFilter('completed')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                guidedFilter === 'completed' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Terselesaikan ({selectedDosen.completedCount})
            </button>
          </div>

          {/* Guided Student Table */}
          <SectionCard 
            title={`Daftar Mahasiswa Bimbingan — ${
              guidedFilter === 'p1' ? 'Sebagai Pembimbing Utama (1)' : 
              guidedFilter === 'p2' ? 'Sebagai Pembimbing Pendamping (2)' : 
              'Telah Lulus/Selesai'
            }`} 
            className="border-border/50"
          >
            {guidedStudents.length === 0 ? (
              <div className="py-12 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
                <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <h6 className="text-xs font-bold text-muted-foreground">Tidak Ada Mahasiswa</h6>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  Saat ini tidak ada mahasiswa yang tercatat dalam kelompok bimbingan ini.
                </p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-3xs">
                <DataTable data={guidedStudents} columns={studentColumns} />
              </div>
            )}
          </SectionCard>
        </ContentWrapper>
      ) : (
        // ================= MAIN TABS LIST VIEW =================
        <ContentWrapper 
          title="Pembimbing & Kuota Tugas Akhir" 
          description="Manajemen kuota beban kerja dosen serta pemantauan dan alokasi dosen pembimbing mahasiswa."
        >
          {/* Main Tabs Navigation */}
          <div className="flex gap-2 mb-6 border-b border-border/80">
            <button
              onClick={() => setActiveMainTab('kuota')}
              className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                activeMainTab === 'kuota'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Kuota Pembimbing
            </button>
            <button
              onClick={() => setActiveMainTab('pembimbing')}
              className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                activeMainTab === 'pembimbing'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Pembimbing
            </button>
          </div>

          {activeMainTab === 'kuota' ? (
            <>
              {/* Stat Cards - Kuota Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 border border-border/50 rounded-xl bg-card shadow-xs">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Dosen Tersedia</p>
                  <h3 className="text-2xl font-extrabold text-foreground">{dynamicDosenList.length} Dosen</h3>
                </div>
                <div className="p-4 border rounded-xl bg-sky-50/50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-900/50 shadow-xs relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-1.5 h-full bg-sky-500"></div>
                  <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Total Mahasiswa Aktif</p>
                  <h3 className="text-2xl font-extrabold text-sky-700 dark:text-sky-300">
                    {studentsList.filter(s => s.stage !== 'Selesai').length} Mhs
                  </h3>
                </div>
                <div className="p-4 border rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50 shadow-xs relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-1.5 h-full bg-emerald-500"></div>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Mahasiswa Lulus</p>
                  <h3 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    {studentsList.filter(s => s.stage === 'Selesai').length} Mhs
                  </h3>
                </div>
              </div>

              <SectionCard title="Daftar Monitor Kuota Dosen" className="border-border/50 shadow-xs">
                <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <input 
                      type="text" 
                      placeholder="Cari dosen, NIP, prodi, atau jabatan..."
                      value={searchDosenQuery}
                      onChange={(e) => setSearchDosenQuery(e.target.value)}
                      className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-primary bg-card text-foreground"
                    />
                    <div className="absolute left-3 top-3 text-muted-foreground">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  {searchDosenQuery && (
                    <button
                      onClick={() => setSearchDosenQuery('')}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer shrink-0"
                    >
                      Reset Pencarian
                    </button>
                  )}
                </div>

                {filteredDosen.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
                    <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <h6 className="text-xs font-bold text-muted-foreground">Tidak Ada Hasil Pencarian</h6>
                    <p className="text-[10px] text-muted-foreground/80 mt-1">
                      Tidak ditemukan dosen pembimbing yang cocok dengan kata kunci "{searchDosenQuery}".
                    </p>
                  </div>
                ) : (
                  <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
                    <DataTable data={filteredDosen} columns={quotaColumns} />
                  </div>
                )}
              </SectionCard>
            </>
          ) : (
            // ================= PEMBIMBING STUDENTS LIST VIEW =================
            <SectionCard title="Data Penugasan Dosen Pembimbing Mahasiswa" className="border-border/50 shadow-xs">
              <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <input 
                    type="text" 
                    placeholder="Cari mahasiswa, NIM, judul TA, atau pembimbing..."
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
                  <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <h6 className="text-xs font-bold text-muted-foreground">Tidak Ada Hasil Pencarian</h6>
                  <p className="text-[10px] text-muted-foreground/80 mt-1">
                    Tidak ditemukan data bimbingan yang cocok dengan kata kunci "{searchQuery}".
                  </p>
                </div>
              ) : (
                <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
                  <DataTable data={filteredStudents} columns={allStudentsColumns} />
                </div>
              )}
            </SectionCard>
          )}
        </ContentWrapper>
      )}

      {/* UBAH KUOTA POPUP MODAL */}
      {isEditingQuota && currentEditDosen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border/70 rounded-2xl max-w-sm w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setIsEditingQuota(false);
                setCurrentEditDosen(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              title="Tutup Form"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 pr-10 border-b border-border/50 pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" /> Ubah Kuota Maksimal Dosen
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Dosen: <strong className="text-foreground">{currentEditDosen.name}</strong> • NIP: {currentEditDosen.nip}
              </p>
            </div>

            <form onSubmit={handleSaveQuota} className="space-y-4">
              
              {/* KUOTA MAKSIMAL P1 */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Kuota Maksimal Pembimbing Utama (P1) <span className="text-rose-500">*</span></label>
                <input 
                  type="number" 
                  required
                  min={currentEditDosen.p1Active}
                  value={quotaP1Input}
                  onChange={(e) => setQuotaP1Input(parseInt(e.target.value) || 0)}
                  className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                />
                <p className="text-[9px] text-muted-foreground">Aktif Saat Ini: <strong>{currentEditDosen.p1Active} Mahasiswa</strong>. Batas kuota tidak boleh kurang dari mahasiswa aktif.</p>
              </div>

              {/* KUOTA MAKSIMAL P2 */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Kuota Maksimal Pembimbing Pendamping (P2) <span className="text-rose-500">*</span></label>
                <input 
                  type="number" 
                  required
                  min={currentEditDosen.p2Active}
                  value={quotaP2Input}
                  onChange={(e) => setQuotaP2Input(parseInt(e.target.value) || 0)}
                  className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                />
                <p className="text-[9px] text-muted-foreground">Aktif Saat Ini: <strong>{currentEditDosen.p2Active} Mahasiswa</strong>. Batas kuota tidak boleh kurang dari mahasiswa aktif.</p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-border/50 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingQuota(false);
                    setCurrentEditDosen(null);
                  }}
                  className="px-4 py-2 border border-border text-xs font-semibold rounded-lg hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Kuota
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* UBAH PEMBIMBING POPUP MODAL */}
      {isEditingPembimbing && currentEditStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border/70 rounded-2xl max-w-sm w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setIsEditingPembimbing(false);
                setCurrentEditStudent(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              title="Tutup Form"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 pr-10 border-b border-border/50 pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" /> Ubah Dosen Pembimbing
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Mahasiswa: <strong className="text-foreground">{currentEditStudent.name}</strong> • NIM: {currentEditStudent.nim}
              </p>
            </div>

            <form onSubmit={handleSavePembimbing} className="space-y-4">
              
              {/* PEMBIMBING 1 SELECT */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Pembimbing Utama (P1) <span className="text-rose-500">*</span></label>
                <select 
                  required
                  value={p1InputId}
                  onChange={(e) => setP1InputId(e.target.value)}
                  className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                >
                  <option value="" disabled>Pilih Pembimbing 1</option>
                  {dynamicDosenList.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Kuota P1: {d.p1Active}/{d.p1Max})
                    </option>
                  ))}
                </select>
              </div>

              {/* PEMBIMBING 2 SELECT */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Pembimbing Pendamping (P2) <span className="text-rose-500">*</span></label>
                <select 
                  required
                  value={p2InputId}
                  onChange={(e) => setP2InputId(e.target.value)}
                  className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                >
                  <option value="" disabled>Pilih Pembimbing 2</option>
                  {dynamicDosenList.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Kuota P2: {d.p2Active}/{d.p2Max})
                    </option>
                  ))}
                </select>
              </div>

              {/* CATATAN PERUBAHAN */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Catatan / Alasan Perubahan <span className="text-muted-foreground/60">(Opsional)</span></label>
                <textarea 
                  rows={3}
                  value={alasanChange}
                  onChange={(e) => setAlasanChange(e.target.value)}
                  placeholder="Tulis alasan perubahan penugasan dosen pembimbing..."
                  className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground resize-none"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-border/50 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPembimbing(false);
                    setCurrentEditStudent(null);
                  }}
                  className="px-4 py-2 border border-border text-xs font-semibold rounded-lg hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Perubahan
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </RoleLayoutComponent>
  );
};

export default CoordinatorSupervisorQuotaPage;
