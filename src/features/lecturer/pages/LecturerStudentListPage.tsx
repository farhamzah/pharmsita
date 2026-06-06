import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';

// Import Student components for monitoring
import { InteractiveStepper } from '../../student/components/dashboard/InteractiveStepper';
import { PendaftaranTACombined } from '../../student/components/dashboard/PendaftaranTACombined';
import { BimbinganWorkflow } from '../../student/components/dashboard/BimbinganWorkflow';
import { SidangWorkflow } from '../../student/components/dashboard/SidangWorkflow';
import { RevisiWorkflow } from '../../student/components/dashboard/RevisiWorkflow';

import { 
  ArrowLeft, 
  User, 
  Search,
  Users
} from 'lucide-react';
import type { StudentStep, StepId, StepStatus } from '../../student/types/progress';

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

const STEP_LABELS: Record<string, string> = {
  'pendaftaran-ta': 'Pendaftaran TA',
  'bimbingan-pra-proposal': 'Bimbingan Pra Proposal',
  'sidang-proposal': 'Seminar Proposal',
  'revisi-proposal': 'Revisi Seminar Proposal',
  'bimbingan-pra-sidang': 'Bimbingan Pra Sidang',
  'sidang': 'Sidang Akhir',
  'revisi-sidang': 'Revisi Sidang',
  'selesai': 'Selesai'
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  'pendaftaran-ta': 'Lengkapi semua persyaratan berkas administratif dan ajukan judul Tugas Akhir Anda.',
  'bimbingan-pra-proposal': 'Lakukan proses bimbingan dengan dosen pembimbing untuk menyusun draf proposal.',
  'sidang-proposal': 'Presentasikan draf proposal Anda di depan dewan penguji.',
  'revisi-proposal': 'Perbaiki draf proposal berdasarkan catatan masukan dari dewan penguji sidang proposal.',
  'bimbingan-pra-sidang': 'Lanjutkan bimbingan intensif untuk menyelesaikan seluruh naskah Tugas Akhir.',
  'sidang': 'Pertahankan hasil Tugas Akhir Anda di hadapan dewan penguji sidang akhir.',
  'revisi-sidang': 'Selesaikan perbaikan naskah final Tugas Akhir dan kumpulkan untuk finalisasi kelulusan.'
};

const mapStudentToStepId = (student: any): string => {
  switch (student.id) {
    case "1": return "sidang-proposal";
    case "2": return "bimbingan-pra-sidang";
    case "3": return "revisi-sidang";
    case "4": return "revisi-proposal";
    case "5": return "sidang";
    case "6": return "sidang-proposal";
    case "7": return "revisi-sidang";
    case "8": return "sidang";
    case "9": return "selesai";
    case "10": return "bimbingan-pra-proposal";
    case "11": return "sidang-proposal";
    case "12": return "sidang";
    case "13": return "revisi-sidang";
    case "14": return "revisi-proposal";
    default:
      return "pendaftaran-ta";
  }
};

const getStepsForStudent = (student: any): StudentStep[] => {
  const currentStepId = mapStudentToStepId(student);
  
  const stepIds: StepId[] = [
    'pendaftaran-ta',
    'bimbingan-pra-proposal',
    'sidang-proposal',
    'revisi-proposal',
    'bimbingan-pra-sidang',
    'sidang',
    'revisi-sidang'
  ];

  const currentIdx = stepIds.indexOf(currentStepId as StepId);
  const isSelesai = currentStepId === 'selesai';

  return stepIds.map((id, idx) => {
    let status: StepStatus = 'pending';
    if (isSelesai) {
      status = 'completed';
    } else if (idx < currentIdx) {
      status = 'completed';
    } else if (idx === currentIdx) {
      status = 'active';
    }

    return {
      id,
      order: idx + 1,
      label: STEP_LABELS[id],
      description: STEP_DESCRIPTIONS[id],
      status,
      isLocked: isSelesai ? false : idx > currentIdx
    };
  });
};

export const LecturerStudentListPage: React.FC = () => {
  const [studentsList] = useState<StudentSupervisorData[]>(INITIAL_STUDENT_LIST);
  const [activeFilter, setActiveFilter] = useState<'pembimbing-1' | 'pembimbing-2' | 'terselesaikan'>('pembimbing-1');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string>('pendaftaran-ta');
  const [searchQuery, setSearchQuery] = useState<string>('');

  React.useEffect(() => {
    const targetStudentId = sessionStorage.getItem('target_student_id');
    const targetStepId = sessionStorage.getItem('target_step_id');
    if (targetStudentId && targetStepId) {
      setSelectedStudentId(targetStudentId);
      setActiveStepId(targetStepId);
      sessionStorage.removeItem('target_student_id');
      sessionStorage.removeItem('target_step_id');
    }
  }, []);

  const getActiveStudents = () => {
    switch (activeFilter) {
      case 'pembimbing-1':
        return studentsList.filter(s => s.p1Id === '1' && s.stage !== 'Selesai');
      case 'pembimbing-2':
        return studentsList.filter(s => s.p2Id === '1' && s.stage !== 'Selesai');
      case 'terselesaikan':
        return studentsList.filter(s => (s.p1Id === '1' || s.p2Id === '1') && s.stage === 'Selesai');
      default:
        return [];
    }
  };

  const filteredStudents = getActiveStudents().filter(s => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.name.toLowerCase().includes(query) ||
      s.nim.toLowerCase().includes(query) ||
      s.title.toLowerCase().includes(query) ||
      s.stage.toLowerCase().includes(query)
    );
  });

  const selectedStudent = studentsList.find(s => s.id === selectedStudentId);
  const activeSteps = selectedStudent ? getStepsForStudent(selectedStudent) : [];
  const currentStep = activeSteps.find(s => s.id === activeStepId);

  const studentColumns = [
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
    { key: 'actions', label: 'Aksi', render: (row: StudentSupervisorData) => (
      <button 
        onClick={() => {
          setSelectedStudentId(row.id);
          const currentStepId = mapStudentToStepId(row);
          setActiveStepId(currentStepId === 'selesai' ? 'revisi-sidang' : currentStepId);
        }}
        className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg hover:bg-sky-100/50 transition cursor-pointer shadow-3xs"
      >
        Lihat Detail
      </button>
    )}
  ];

  const handleStepClick = (step: StudentStep) => {
    setActiveStepId(step.id);
  };

  const renderWorkflowStepContent = (step: StudentStep) => {
    switch (step.id) {
      case "pendaftaran-ta":
        return <PendaftaranTACombined />;
        
      case "bimbingan-pra-proposal":
      case "bimbingan-pra-sidang":
        return <BimbinganWorkflow stageId={step.id} role="pembimbing" studentId={selectedStudentId || "1"} useLecturerApi />;
        
      case "sidang-proposal":
      case "sidang":
        return <SidangWorkflow stageId={step.id} role="dosen" studentId={selectedStudentId || "1"} useLecturerApi />;
        
      case "revisi-proposal":
      case "revisi-sidang":
        return <RevisiWorkflow stageId={step.id} role="dosen" studentId={selectedStudentId || "1"} useLecturerApi />;
        
      default:
        return <div className="p-4 text-center text-muted-foreground">Pilih langkah di sebelah kiri untuk melihat detail.</div>;
    }
  };

  return (
    <RoleLayoutComponent>
      {/* LOCAL CSS TO ENFORCE READ-ONLY FOR COORDINATOR/LECTURER MONITOR VIEW */}
      <style>{`
        .coordinator-monitor-view .bg-slate-50.dark\\:bg-slate-900\\/40,
        .coordinator-monitor-view .bg-slate-50.dark\\:bg-slate-900\\/40.border,
        .coordinator-monitor-view div:has(> h6:contains("Simulator")),
        .coordinator-monitor-view div:has(> h6:contains("Simulasi")),
        .coordinator-monitor-view div:has(> h6:contains("Demo")),
        .coordinator-monitor-view button:has(svg.lucide-sliders),
        .coordinator-monitor-view button:contains("Reset"),
        .coordinator-monitor-view button:contains("Selesaikan Tahap"),
        .coordinator-monitor-view select[value="mahasiswa"],
        .coordinator-monitor-view input[type="file"],
        .coordinator-monitor-view .pt-4.border-t.border-border\\/40.flex.flex-wrap.justify-between,
        .coordinator-monitor-view .bg-slate-50.dark\\:bg-slate-900\\/40.border.border-border\\/80.rounded-2xl.p-5 {
          display: none !important;
        }
        
        /* Disable editing link */
        .coordinator-monitor-view button:contains("Edit Link"),
        .coordinator-monitor-view button:contains("Ubah Link") {
          display: none !important;
        }

        /* Read-only cursor overlay on simulator inputs */
        .coordinator-monitor-view input,
        .coordinator-monitor-view textarea,
        .coordinator-monitor-view select {
          pointer-events: none !important;
          background-color: var(--muted) !important;
          opacity: 0.8 !important;
        }
      `}</style>

      {selectedStudent ? (
        // ================= DETAIL MONITORING VIEW =================
        <ContentWrapper 
          title="Monitoring Progres Mahasiswa" 
          description={`Pemantauan berkas dan tahapan Tugas Akhir mahasiswa bimbingan secara real-time.`}
          headerRight={
            <button 
              onClick={() => setSelectedStudentId(null)} 
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 bg-card border rounded-lg shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
            </button>
          }
        >
          {/* Student Status Summary Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground">{selectedStudent.name}</h4>
                <p className="text-xs text-muted-foreground">NIM: {selectedStudent.nim} • Skema: {selectedStudent.nim === '987654321' ? 'Non Skripsi' : 'Skripsi'}</p>
              </div>
            </div>
            <div className="md:text-right">
              <span className="text-[10px] block text-muted-foreground uppercase font-bold">Judul Tugas Akhir</span>
              <p className="text-xs font-bold text-foreground max-w-md line-clamp-1 mt-0.5" title={selectedStudent.title}>
                {selectedStudent.title}
              </p>
            </div>
          </div>

          {/* Stepper Timeline & Stage Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start coordinator-monitor-view animate-in zoom-in-95 duration-200">
            {/* LEFT: STEPPER TIMELINE */}
            <div className="lg:col-span-4 bg-card p-5 rounded-2xl border border-border shadow-xs">
              <InteractiveStepper
                steps={activeSteps}
                activeStepId={activeStepId}
                onStepClick={handleStepClick}
              />
            </div>

            {/* RIGHT: TAHAPAN CONTENT VIEW */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {currentStep && (
                <div className="bg-card rounded-2xl border border-border shadow-xs p-6">
                  {/* Step Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 mb-6">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="text-primary font-mono text-base">#{currentStep.order}</span>
                        {currentStep.label}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {currentStep.description}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize border ${
                          currentStep.status === "completed" ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400" :
                          currentStep.status === "active" ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/20 dark:border-sky-900 dark:text-sky-400 animate-pulse-slow" :
                          "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {currentStep.status === "completed" ? "Selesai" : currentStep.status === "active" ? "Sedang Diproses" : "Belum Mulai"}
                      </span>
                    </div>
                  </div>

                  {/* Step Active View Content */}
                  <div className="text-xs">
                    {renderWorkflowStepContent(currentStep)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ContentWrapper>
      ) : (
        // ================= LIST VIEW (DEFAULT) =================
        <ContentWrapper 
          title="Mahasiswa Bimbingan Akademik" 
          description="Pantau progres dan status kelulusan berkas Tugas Akhir seluruh mahasiswa bimbingan Anda secara real-time."
        >
          {/* Tabs Filter Navigation */}
          <div className="flex gap-2 mb-6 border-b border-border/80">
            <button
              onClick={() => {
                setActiveFilter('pembimbing-1');
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                activeFilter === 'pembimbing-1'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Sebagai Pembimbing 1 ({studentsList.filter(s => s.p1Id === '1' && s.stage !== 'Selesai').length})
            </button>
            <button
              onClick={() => {
                setActiveFilter('pembimbing-2');
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                activeFilter === 'pembimbing-2'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Sebagai Pembimbing 2 ({studentsList.filter(s => s.p2Id === '1' && s.stage !== 'Selesai').length})
            </button>
            <button
              onClick={() => {
                setActiveFilter('terselesaikan');
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                activeFilter === 'terselesaikan'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Terselesaikan ({studentsList.filter(s => (s.p1Id === '1' || s.p2Id === '1') && s.stage === 'Selesai').length})
            </button>
          </div>

          <SectionCard 
            title={`Daftar Mahasiswa Bimbingan — ${
              activeFilter === 'pembimbing-1' ? 'Sebagai Pembimbing Utama (1)' : 
              activeFilter === 'pembimbing-2' ? 'Sebagai Pembimbing Pendamping (2)' : 
              'Telah Menyelesaikan TA (Arsip)'
            }`} 
            className="border-border/50 shadow-xs"
          >
            {/* Search Input Bar */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <input 
                  type="text" 
                  placeholder="Cari nama, NIM, judul TA, atau tahapan..."
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
                <h6 className="text-xs font-bold text-muted-foreground">Tidak Ada Mahasiswa</h6>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  Tidak ditemukan mahasiswa bimbingan yang cocok dengan kriteria pencarian Anda.
                </p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
                <DataTable data={filteredStudents} columns={studentColumns} />
              </div>
            )}
          </SectionCard>
        </ContentWrapper>
      )}
    </RoleLayoutComponent>
  );
};

export default LecturerStudentListPage;
