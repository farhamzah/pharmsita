import React, { useState, useEffect } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { coordinatorStudentMock } from '../../../mock-data/ui-mocks';
import {
  coordinatorWorkflowApi,
  type StudentDirectoryItem,
} from '../../../core/api/domain';

// Import Student components for monitoring
import { InteractiveStepper } from '../../student/components/dashboard/InteractiveStepper';
import { PendaftaranTACombined } from '../../student/components/dashboard/PendaftaranTACombined';
import { BimbinganWorkflow } from '../../student/components/dashboard/BimbinganWorkflow';
import { SidangWorkflow } from '../../student/components/dashboard/SidangWorkflow';
import { RevisiWorkflow } from '../../student/components/dashboard/RevisiWorkflow';

// Import Profile and Mocks
import { UnifiedProfileView } from '../../../components/shared/UnifiedProfileView';
import { mockStudentProfiles, type StudentProfile } from '../../../mock-data/profiles';
import { Roles } from '../../../mock-data/enums';
import type { StudentStep, StepId, StepStatus } from '../../student/types/progress';

import { 
  ArrowLeft, 
  User, 
  Lock, 
  X, 
  Search, 
  Filter 
} from 'lucide-react';

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

interface CoordinatorStudentRow {
  id: string;
  name: string;
  nim: string;
  title: string;
  status?: string;
  stage: string;
  activeStepId?: StepId | "selesai" | null;
  isCompleted?: boolean;
  programStudi?: string;
  angkatan?: string;
  kelas?: string;
}

const mapStudentToStepId = (student: any): string => {
  if (student.activeStepId) {
    return student.activeStepId;
  }

  if (student.isCompleted || student.stage === "Selesai") {
    return "selesai";
  }

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

const mapLegacyStudent = (student: any): CoordinatorStudentRow => ({
  id: student.id,
  name: student.name,
  nim: student.nim,
  title: student.title,
  status: student.status,
  stage: student.stage || student.tahapan || "",
});

const mapDirectoryStudent = (student: StudentDirectoryItem): CoordinatorStudentRow => ({
  id: student.id,
  name: student.name,
  nim: student.nim || student.identifier,
  title: student.thesisTitle || "Tugas Akhir belum diajukan",
  status: student.isCompleted ? "Lulus" : student.activeStepStatus || "Sedang Berjalan",
  stage: student.activeStepLabel,
  activeStepId: student.isCompleted ? "selesai" : student.activeStepId || "pendaftaran-ta",
  isCompleted: student.isCompleted,
  programStudi: student.programStudi,
  angkatan: student.angkatan,
  kelas: student.kelas,
});

const initialCoordinatorStudents = coordinatorStudentMock.map(mapLegacyStudent);

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

export const CoordinatorAcademicStagePage: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string>('pendaftaran-ta');
  const [isShowingProfile, setIsShowingProfile] = useState<boolean>(false);
  const [apiSteps, setApiSteps] = useState<StudentStep[] | null>(null);
  const [progressToast, setProgressToast] = useState<string | null>(null);
  const [students, setStudents] = useState<CoordinatorStudentRow[]>(initialCoordinatorStudents);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  useEffect(() => {
    const targetStudentId = sessionStorage.getItem('monitor_student_id');
    const targetStepId = sessionStorage.getItem('monitor_step_id');
    if (targetStudentId && targetStepId) {
      setSelectedStudentId(targetStudentId);
      setActiveStepId(targetStepId);
      sessionStorage.removeItem('monitor_student_id');
      sessionStorage.removeItem('monitor_step_id');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    coordinatorWorkflowApi
      .listStudents()
      .then((response) => {
        if (!mounted) return;
        setStudents(response.data.map(mapDirectoryStudent));
        setDirectoryError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setDirectoryError("Directory backend belum tersedia, memakai data demo lokal.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingStudents(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // List View Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');

  const filteredData = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.nim.includes(searchTerm);
    const studentStepId = mapStudentToStepId(student);
    const matchesStage = selectedStage === 'all' || studentStepId === selectedStage;
    return matchesSearch && matchesStage;
  });

  const columns = [
    { key: 'nim', label: 'NIM', sortable: true },
    { key: 'name', label: 'Nama Mahasiswa', sortable: true },
    { key: 'title', label: 'Judul TA', render: (row: any) => (
      <div className="max-w-[240px] truncate font-medium" title={row.title}>{row.title}</div>
    )},
    { key: 'stage', label: 'Tahapan Aktif', render: (row: any) => {
      const stepId = mapStudentToStepId(row);
      const label = STEP_LABELS[stepId] || 'Persyaratan Awal';
      return <span className="font-semibold text-xs text-primary">{label}</span>;
    }},
    { key: 'status', label: 'Status Progres', render: (row: any) => {
      const stepId = mapStudentToStepId(row);
      const status: 'selesai' | 'dijadwalkan' | 'menunggu' | 'perbaikan' = 
        stepId === 'selesai' ? 'selesai' :
        row.status === 'Lulus' ? 'selesai' :
        row.status === 'Siap Sidang' || row.status === 'Siap Sempro' ? 'dijadwalkan' :
        row.status === 'Revisi' || row.status === 'Sedang Mengerjakan Revisi' ? 'perbaikan' :
        'menunggu';
      return <StatusBadge status={status} />;
    }},
    { key: 'actions', label: 'Aksi', render: (row: any) => (
      <button 
        onClick={() => {
          setSelectedStudentId(row.id);
          const currentStep = mapStudentToStepId(row);
          setActiveStepId(currentStep === 'selesai' ? 'revisi-sidang' : currentStep);
        }}
        className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md shadow-xs hover:bg-primary/90 transition-colors"
      >
        Lihat Detail
      </button>
    )},
  ];

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const getStudentProfile = (student: any): StudentProfile => {
    const existing = mockStudentProfiles.find(p => p.nim === student.nim || p.name === student.name);
    if (existing) return existing;

    return {
      id: `s_prof_${student.id}`,
      name: student.name,
      email: `${student.name.toLowerCase().replace(/\s+/g, '')}@student.pharmsita.ac.id`,
      phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`,
      role: Roles.STUDENT,
      status: student.isCompleted || student.stage === 'Selesai' ? 'Lulus' : 'Aktif',
      tanggalLahir: '2002-05-15',
      alamat: 'Jl. Kampus Universitas PharmSita, Tangerang',
      gender: student.name.toLowerCase().includes('sari') || student.name.toLowerCase().includes('lina') || student.name.toLowerCase().includes('lia') || student.name.toLowerCase().includes('aminah') || student.name.toLowerCase().includes('sisca') ? 'Perempuan' : 'Laki-laki',
      nim: student.nim,
      programStudi: student.programStudi || 'S1 Farmasi',
      angkatan: student.angkatan || (student.nim.startsWith('13519') || student.nim === '121212121' ? '2019' : student.nim.startsWith('10123') ? '2021' : '2020'),
      kelas: student.kelas || 'FA-22-01',
      skemaTA: student.nim === '987654321' ? 'Non Skripsi' : 'Skripsi',
      jenisTA: student.nim === '987654321' ? 'MBKM' : 'Penelitian',
      judulTA: student.title,
      pembimbing1: 'Dr. Apt. Rina Marlina, M.Farm.',
      pembimbing2: 'Dr. Apt. Budi Santoso, M.Si.',
      tahapanAktif: student.stage,
      statusPengajuan: 'Disetujui',
      linkBerkas: 'https://drive.google.com/file/d/mock-berkas-dynamic/view'
    };
  };

  useEffect(() => {
    if (!selectedStudentId) {
      setApiSteps(null);
      return;
    }

    let mounted = true;
    coordinatorWorkflowApi
      .getProgress(selectedStudentId)
      .then((response) => {
        if (mounted) {
          setApiSteps(response.data);
        }
      })
      .catch(() => {
        if (mounted) {
          setApiSteps(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedStudentId]);

  const activeSteps = selectedStudent ? apiSteps || getStepsForStudent(selectedStudent) : [];
  const currentStep = activeSteps.find(s => s.id === activeStepId);

  const handleStepClick = (step: StudentStep) => {
    setActiveStepId(step.id);
  };

  const handleCoordinatorProgressUpdate = async (stepId: StepId, status: StepStatus) => {
    if (!selectedStudentId) return;

    const response = await coordinatorWorkflowApi.updateProgressStep(
      selectedStudentId,
      stepId,
      status
    );
    setApiSteps(response.data);
    setProgressToast("Progress mahasiswa berhasil diperbarui oleh koordinator.");
    setTimeout(() => setProgressToast(null), 3000);
  };

  // Helper render content detail read-only
  const renderStepContent = (step: StudentStep) => {
    if (step.isLocked) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed rounded-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Langkah Ini Belum Aktif</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Mahasiswa belum sampai pada tahapan <strong>{step.label}</strong> ini.
          </p>
        </div>
      );
    }

    switch (step.id) {
      case "pendaftaran-ta":
        return <PendaftaranTACombined />;
        
      case "bimbingan-pra-proposal":
        return <BimbinganWorkflow stageId={step.id} role="pembimbing" studentId={selectedStudentId || "1"} useCoordinatorApi />;
        
      case "sidang-proposal":
        return <SidangWorkflow stageId={step.id} role="dosen" studentId={selectedStudentId || "1"} useCoordinatorApi />;
        
      case "revisi-proposal":
        return <RevisiWorkflow stageId={step.id} role="dosen" studentId={selectedStudentId || "1"} useCoordinatorApi />;
        
      case "bimbingan-pra-sidang":
        return <BimbinganWorkflow stageId={step.id} role="pembimbing" studentId={selectedStudentId || "1"} useCoordinatorApi />;
        
      case "sidang":
        return <SidangWorkflow stageId={step.id} role="dosen" studentId={selectedStudentId || "1"} useCoordinatorApi />;
        
      case "revisi-sidang":
        return <RevisiWorkflow stageId={step.id} role="dosen" studentId={selectedStudentId || "1"} useCoordinatorApi />;
        
      default:
        return <div className="p-4 text-center text-muted-foreground">Pilih langkah di sebelah kiri untuk melihat detail.</div>;
    }
  };

  return (
    <RoleLayoutComponent>
      {/* LOCAL CSS TO ENFORCE READ-ONLY FOR COORDINATOR VIEW */}
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
          description={`Pemantauan berkas dan tahapan Tugas Akhir mahasiswa secara real-time.`}
          headerRight={
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsShowingProfile(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5" /> Lihat Profil Lengkap
              </button>
              <button 
                onClick={() => {
                  setSelectedStudentId(null);
                  setIsShowingProfile(false);
                }} 
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 bg-card border rounded-lg shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
              </button>
            </div>
          }
        >
          {/* Student Status Summary Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <span className="text-[10px] block text-muted-foreground uppercase font-bold">Judul Usulan TA</span>
              <p className="text-xs font-bold text-foreground max-w-md line-clamp-1 mt-0.5" title={selectedStudent.title}>
                {selectedStudent.title}
              </p>
            </div>
          </div>

          {/* Stepper Timeline & Stage Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start coordinator-monitor-view">
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
                      {currentStep.status !== "completed" && (
                        <button
                          onClick={() => handleCoordinatorProgressUpdate(currentStep.id, "completed")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-3xs cursor-pointer"
                        >
                          Tandai Selesai
                        </button>
                      )}
                    </div>
                  </div>

                  {progressToast && (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400">
                      {progressToast}
                    </div>
                  )}

                  {/* Step Body */}
                  <div className="min-h-[200px]">
                    {renderStepContent(currentStep)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC VIEW STUDENT PROFILE MODAL */}
          {isShowingProfile && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-background border border-border/70 rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button 
                  onClick={() => setIsShowingProfile(false)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Tutup Profil"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="mb-4 pr-10">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> Profil Lengkap Mahasiswa
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Informasi lengkap status akademik dan usulan Tugas Akhir.</p>
                </div>
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  <UnifiedProfileView initialProfile={getStudentProfile(selectedStudent)} />
                </div>
              </div>
            </div>
          )}

        </ContentWrapper>
      ) : (
        // ================= LIST MONITORING VIEW =================
        <ContentWrapper 
          title="Monitoring Progres Tugas Akhir" 
          description="Lacak dan pantau kelancaran progres tahapan Tugas Akhir seluruh mahasiswa secara real-time."
        >
          {/* Filter Bar with dropdow and search input */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Cari nama mahasiswa atau NIM..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
              />
            </div>

            {/* Step Dropdown Filter */}
            <div className="relative w-full md:w-60">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm appearance-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              >
                <option value="all">Semua Tahapan</option>
                {Object.entries(STEP_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {(isLoadingStudents || directoryError) && (
            <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground">
              {isLoadingStudents ? "Memuat directory mahasiswa..." : directoryError}
            </div>
          )}

          <SectionCard title="Daftar Monitoring Mahasiswa" className="border-border/50">
            <div className="border border-border/50 rounded-lg overflow-hidden bg-card shadow-3xs">
              <DataTable data={filteredData} columns={columns} />
            </div>
          </SectionCard>
        </ContentWrapper>
      )}
    </RoleLayoutComponent>
  );
};

export default CoordinatorAcademicStagePage;
