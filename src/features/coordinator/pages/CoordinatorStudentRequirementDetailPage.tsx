import React, { useState, useMemo } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';
import ContentWrapper from '../../../components/ContentWrapper';
import { coordinatorWorkflowApi } from '../../../core/api/domain';
import type { RequirementItem } from '../../student/services/student-workflow-service';
import {
  mockStudentValidationList,
  mockExtendedStudentRequirements,
} from '../../../mock-data/requirement-validation-mocks';
import {
  mockMasterRequirements,
  type RequirementStage,
  type RequirementValidationStatus,
} from '../../../mock-data/requirements';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CheckSquare,
  FileText,
  BookOpen,
  GraduationCap,
  Award,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';

// ─── types ───────────────────────────────────────────────────
interface ChecklistState {
  [recordId: string]: {
    isChecked: boolean;
    status: RequirementValidationStatus;
    isDirty: boolean;
  };
}

// ─── helpers ─────────────────────────────────────────────────

const STAGE_ICONS: Record<RequirementStage, React.ReactNode> = {
  'Persyaratan Awal': <BookOpen className="w-4 h-4" />,
  'Seminar Proposal': <FileText className="w-4 h-4" />,
  'Sidang Akhir': <GraduationCap className="w-4 h-4" />,
  'Yudisium': <Award className="w-4 h-4" />,
};

const STAGE_LABELS: Record<RequirementStage, string> = {
  'Persyaratan Awal': 'Persyaratan Awal',
  'Seminar Proposal': 'Bimbingan Pra Proposal',
  'Sidang Akhir': 'Bimbingan Pra Sidang',
  'Yudisium': 'Yudisium',
};

const STAGE_ORDER: RequirementStage[] = [
  'Persyaratan Awal',
  'Seminar Proposal',
  'Sidang Akhir',
];

const stageToWorkflowId = (stage: RequirementStage) => {
  if (stage === 'Seminar Proposal') return 'bimbingan-pra-proposal';
  if (stage === 'Sidang Akhir') return 'bimbingan-pra-sidang';
  return stage.toLowerCase().replace(/\s+/g, '-');
};

const normalizeWorkflowRequirementStatus = (
  status: RequirementValidationStatus
): RequirementItem['status'] =>
  status === 'Ditolak' ? 'Perlu Revisi' : status;

function formatDate(iso?: string) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(iso));
}

// ─── Sub-Components ──────────────────────────────────────────

/** Single requirement checklist row */
function RequirementRow({
  master,
  studentReq,
  isChecked,
  onToggle,
}: {
  master: typeof mockMasterRequirements[0];
  studentReq: typeof mockExtendedStudentRequirements[0] | undefined;
  isChecked: boolean;
  onToggle: () => void;
}) {
  const hasUpload = !!studentReq?.linkBerkas;

  return (
    <div
      onClick={() => {
        if (hasUpload) onToggle();
      }}
      className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${!hasUpload
        ? 'bg-muted/30 border-border/50 opacity-60'
        : isChecked
          ? 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-200 dark:border-emerald-800/60 shadow-xs'
          : 'bg-card border-border hover:border-primary/40 cursor-pointer shadow-2xs'
        }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Checkbox */}
        <div
          className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isChecked
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : hasUpload
              ? 'border-muted-foreground/40 group-hover:border-primary'
              : 'border-muted/30 bg-muted/10'
            }`}
        >
          {isChecked && <CheckCircle2 className="w-4 h-4 stroke-[3px]" />}
        </div>

        {/* Name and upload date */}
        <div className="min-w-0">
          <p className={`text-sm font-medium transition-all ${isChecked ? 'text-muted-foreground line-through font-normal' : 'text-foreground font-semibold'}`}>
            {master.namaPersyaratan}
            {master.wajib && <span className="ml-1 text-rose-500 font-bold">*</span>}
          </p>
          {studentReq?.tanggalUpload && (
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
              Diunggah: {formatDate(studentReq.tanggalUpload)}
            </p>
          )}
        </div>
      </div>

      {/* Action / Link */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasUpload ? (
          <span className="text-xs text-muted-foreground/60 italic font-medium">Diunggah</span>

        ) : (
          <span className="text-xs text-muted-foreground/60 italic font-medium">Belum Diunggah</span>
        )}
      </div>
    </div>
  );
}

/** Section per tahap with collapsed summary */
function StageSection({
  stage,
  studentId,
  checklistState,
  onChange,
  onApproveAll,
  linkBerkasDrive,
  stageNote,
  onNoteChange,
}: {
  stage: RequirementStage;
  studentId: string;
  checklistState: ChecklistState;
  onChange: (key: string, field: 'isChecked' | 'status', value: boolean | string) => void;
  onApproveAll: () => void;
  linkBerkasDrive?: string;
  stageNote: string;
  onNoteChange: (value: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const masters = mockMasterRequirements.filter(m => m.tahap === stage);
  const studentReqs = mockExtendedStudentRequirements.filter(r => r.studentId === studentId);

  // Stats for this stage
  let checkedCount = 0;
  const totalCount = masters.length;

  masters.forEach(m => {
    const sr = studentReqs.find(r => r.masterRequirementId === m.id);
    const recordKey = sr?.id ?? `new_${m.id}`;
    const state = checklistState[recordKey];
    const isChecked = state?.isChecked ?? sr?.isChecked ?? false;
    if (isChecked) checkedCount++;
  });

  const isComplete = checkedCount === totalCount;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-200 ${isComplete
      ? 'border-emerald-200 dark:border-emerald-800/50 shadow-xs'
      : 'border-border'
      }`}>
      {/* Stage header */}
      <div
        className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors border-b border-border/10 ${isComplete ? 'bg-emerald-50/60 dark:bg-emerald-950/10' : 'bg-muted/40'
          }`}
      >
        <div className="flex items-center gap-3">
          <span className={`p-1.5 rounded-lg ${isComplete ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-muted text-muted-foreground'
            }`}>
            {STAGE_ICONS[stage]}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-foreground">{STAGE_LABELS[stage] || stage}</h3>
              {linkBerkasDrive && (
                <a
                  href={linkBerkasDrive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 text-[10px] font-bold rounded-lg border border-sky-200 dark:border-sky-800 transition-colors shadow-2xs"
                  title={`Buka folder Google Drive untuk ${STAGE_LABELS[stage] || stage}`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-sky-500" /> Buka Link
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{checkedCount} dari {totalCount} item diceklis</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs select-none ${isComplete
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}>
            {isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {isComplete ? 'Valid' : 'Belum Valid'}
          </span>

          {!isComplete && (
            <button
              type="button"
              onClick={onApproveAll}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-all duration-150 shadow-sm cursor-pointer"
              title="Ceklis semua persyaratan dalam kategori ini"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Ceklis Semua
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Requirement rows & Notes */}
      {!collapsed && (
        <div className="p-4 space-y-4 bg-card">
          <div className="space-y-2.5">
            {masters.map(m => {
              const sr = studentReqs.find(r => r.masterRequirementId === m.id);
              const recordKey = sr?.id ?? `new_${m.id}`;
              const isChecked = checklistState[recordKey]?.isChecked ?? sr?.isChecked ?? false;
              return (
                <RequirementRow
                  key={m.id}
                  master={m}
                  studentReq={sr}
                  isChecked={isChecked}
                  onToggle={() => {
                    const newChecked = !isChecked;
                    onChange(recordKey, 'isChecked', newChecked);
                    onChange(recordKey, 'status', newChecked ? 'Valid' : 'Belum Upload');
                  }}
                />
              );
            })}
          </div>

          {/* Catatan Kategori */}
          <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
            <label htmlFor={`catatan-${stage}`} className="text-xs font-semibold text-foreground/85 flex items-center gap-1.5 select-none">
              Catatan {STAGE_LABELS[stage] || stage} <span className="text-[10px] font-normal text-muted-foreground">(Opsional)</span>
            </label>
            <textarea
              id={`catatan-${stage}`}
              rows={3}
              value={stageNote}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={`Beri catatan revisi, kekurangan berkas, atau arahan tambahan untuk ${STAGE_LABELS[stage] || stage}...`}
              className="w-full px-3.5 py-2.5 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none text-foreground placeholder:text-muted-foreground/60 shadow-2xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────

export const CoordinatorStudentRequirementDetailPage: React.FC = () => {
  // Extract studentId from hash: #/kordinator/validasi-persyaratan/detail/s_prof_1
  const hash = window.location.hash;
  const idMatch = hash.match(/validasi-persyaratan\/detail\/([^/]+)$/);
  const studentId = idMatch ? idMatch[1] : 's_prof_1';

  const student = mockStudentValidationList.find(s => s.studentId === studentId) ?? mockStudentValidationList[0];

  // Build initial checklist state from mock data
  const initialState = useMemo<ChecklistState>(() => {
    const state: ChecklistState = {};
    const studentReqs = mockExtendedStudentRequirements.filter(r => r.studentId === studentId);
    studentReqs.forEach(sr => {
      state[sr.id] = {
        isChecked: sr.isChecked,
        status: sr.status,
        isDirty: false,
      };
    });
    return state;
  }, [studentId]);

  const [checklistState, setChecklistState] = useState<ChecklistState>(initialState);

  // Build initial category notes from mock data (find first existing coordinator note in the stage)
  const initialCategoryNotes = useMemo<Record<string, { value: string; isDirty: boolean }>>(() => {
    const notes: Record<string, { value: string; isDirty: boolean }> = {};
    STAGE_ORDER.forEach(stage => {
      const stageMasterIds = mockMasterRequirements
        .filter(m => m.tahap === stage)
        .map(m => m.id);

      const studentStageReqs = mockExtendedStudentRequirements.filter(
        r => r.studentId === studentId && stageMasterIds.includes(r.masterRequirementId)
      );

      const existingNote = studentStageReqs.find(r => r.catatanKoordinator)?.catatanKoordinator || '';

      notes[stage] = {
        value: existingNote,
        isDirty: false,
      };
    });
    return notes;
  }, [studentId]);

  const [categoryNotes, setCategoryNotes] = useState(initialCategoryNotes);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (
    key: string,
    field: 'isChecked' | 'status',
    value: boolean | string,
  ) => {
    setChecklistState(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
        isDirty: true,
      } as ChecklistState[string],
    }));
    setSaveSuccess(false);
  };

  const handleNoteChange = (stage: string, value: string) => {
    setCategoryNotes(prev => ({
      ...prev,
      [stage]: {
        value,
        isDirty: value !== initialCategoryNotes[stage].value,
      },
    }));
    setSaveSuccess(false);
  };

  const handleReset = () => {
    setChecklistState(initialState);
    setCategoryNotes(initialCategoryNotes);
    setSaveSuccess(false);
  };

  const buildRequirementBundle = (stage: RequirementStage) => {
    const masters = mockMasterRequirements.filter(m => m.tahap === stage);
    const studentReqs = mockExtendedStudentRequirements.filter(r => r.studentId === studentId);
    const note = categoryNotes[stage]?.value || '';

    return {
      driveLink: student.linkBerkasDrive || '',
      requirements: masters.map((master) => {
        const sr = studentReqs.find(r => r.masterRequirementId === master.id);
        const recordKey = sr?.id ?? `new_${master.id}`;
        const state = checklistState[recordKey];
        const status = normalizeWorkflowRequirementStatus(
          (state?.status || sr?.status || 'Belum Upload') as RequirementValidationStatus
        );

        return {
          id: master.id,
          label: master.namaPersyaratan,
          status,
          wajib: master.wajib,
          catatanKoordinator: note || sr?.catatanKoordinator,
        };
      }),
    };
  };

  const handleSave = async () => {
    const dirtyStages = STAGE_ORDER.filter((stage) => {
      const masters = mockMasterRequirements.filter(m => m.tahap === stage);
      const stageMasterIds = masters.map(m => m.id);
      const stageDirty = mockExtendedStudentRequirements.some((req) => {
        if (req.studentId !== studentId || !stageMasterIds.includes(req.masterRequirementId)) {
          return false;
        }
        return checklistState[req.id]?.isDirty;
      });

      return stageDirty || categoryNotes[stage]?.isDirty;
    });

    const stagesToSave = dirtyStages.length > 0 ? dirtyStages : STAGE_ORDER;

    await Promise.all(stagesToSave.map((stage) => {
      const payload = buildRequirementBundle(stage);

      if (stage === 'Persyaratan Awal') {
        return coordinatorWorkflowApi.saveInitialRequirements(studentId, payload);
      }

      return coordinatorWorkflowApi.saveStageRequirements(
        studentId,
        stageToWorkflowId(stage),
        payload
      );
    }));

    // Mark checklist as clean
    setChecklistState(prev => {
      const next: ChecklistState = {};
      Object.keys(prev).forEach(k => {
        next[k] = { ...prev[k], isDirty: false };
      });
      return next;
    });

    // Mark category notes as clean
    setCategoryNotes(prev => {
      const next: typeof categoryNotes = {};
      Object.keys(prev).forEach(k => {
        next[k] = { ...prev[k], isDirty: false };
      });
      return next;
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleApproveAllInStage = (stage: RequirementStage) => {
    const masters = mockMasterRequirements.filter(m => m.tahap === stage);
    const studentReqs = mockExtendedStudentRequirements.filter(r => r.studentId === studentId);

    setChecklistState(prev => {
      const next = { ...prev };
      masters.forEach(m => {
        const sr = studentReqs.find(r => r.masterRequirementId === m.id);
        if (sr?.linkBerkas) {
          const recordKey = sr.id;
          next[recordKey] = {
            isChecked: true,
            status: 'Valid',
            isDirty: true,
          };
        }
      });
      return next;
    });
    setSaveSuccess(false);
  };

  const hasDirty =
    Object.values(checklistState).some(s => s.isDirty) ||
    Object.values(categoryNotes).some(n => n.isDirty);

  // Overall progress (excl. Yudisium)
  const allMasters = mockMasterRequirements.filter(m => m.tahap !== 'Yudisium');
  const studentReqs = mockExtendedStudentRequirements.filter(r => r.studentId === studentId);
  let totalValid = 0;
  allMasters.forEach(m => {
    const sr = studentReqs.find(r => r.masterRequirementId === m.id);
    const recordKey = sr?.id ?? `new_${m.id}`;
    const state = checklistState[recordKey];
    const isChecked = state?.isChecked ?? sr?.isChecked ?? false;
    if (isChecked) totalValid++;
  });
  const progressPercent = Math.round((totalValid / allMasters.length) * 100);

  // Wajib awal complete check
  const awalMasters = allMasters.filter(m => m.tahap === 'Persyaratan Awal' && m.wajib);
  const awalValid = awalMasters.every(m => {
    const sr = studentReqs.find(r => r.masterRequirementId === m.id);
    const recordKey = sr?.id ?? `new_${m.id}`;
    const state = checklistState[recordKey];
    return state?.isChecked ?? sr?.isChecked ?? false;
  });

  return (
    <RoleLayoutComponent>
      <ContentWrapper
        headerRight={
          <button
            onClick={() => { window.location.hash = `#/${getCurrentRolePath()}/validasi-persyaratan`; }}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 bg-card border rounded-md shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        }
      >
        <div className="space-y-6 animate-in fade-in duration-500">

          {/* Student Info Header */}
          <div className="p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl select-none flex-shrink-0">
                  {student.nama.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{student.nama}</h2>
                  <p className="text-sm text-muted-foreground">{student.nim} · {student.programStudi} · Angkatan {student.angkatan}</p>
                  <p className="text-sm text-muted-foreground">
                    Tahap Aktif: <span className="font-semibold text-foreground">{student.tahapanAktif}</span>
                  </p>
                </div>
              </div>

              {/* Progress ring area */}
              <div className="flex flex-col items-center gap-1 bg-card border border-border px-5 py-3 rounded-xl shadow-sm">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.8" className="text-muted/30" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={progressPercent === 100 ? '#10b981' : progressPercent >= 60 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="2.8"
                      strokeDasharray={`${progressPercent} ${100 - progressPercent}`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                    {progressPercent}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground text-center">{totalValid}/{allMasters.length} persyaratan valid</span>
              </div>
            </div>

            {/* Layak Lanjut Banner */}
            {awalValid ? (
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-4 h-4" />
                Persyaratan Awal TERPENUHI — Mahasiswa layak mendaftar Tugas Akhir
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 px-4 py-2.5 rounded-lg border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-4 h-4" />
                Persyaratan Awal BELUM TERPENUHI — Mahasiswa belum dapat mendaftar Tugas Akhir
              </div>
            )}
          </div>

          {/* Save / Reset Toolbar */}
          {hasDirty && (
            <div className="flex items-center justify-between gap-3 p-3 bg-primary/5 border border-primary/30 rounded-xl animate-in slide-in-from-top-2 duration-200">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Ada perubahan yang belum disimpan.</span> Simpan untuk memperbarui status mahasiswa.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Simpan Validasi
                </button>
              </div>
            </div>
          )}

          {/* Success toast */}
          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm font-medium animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4" />
              Validasi berhasil disimpan! Status mahasiswa telah diperbarui.
            </div>
          )}

          {/* Checklist per Tahap */}
          <div className="space-y-4">
            {STAGE_ORDER.map(stage => (
              <StageSection
                key={stage}
                stage={stage}
                studentId={studentId}
                checklistState={checklistState}
                onChange={handleChange}
                onApproveAll={() => handleApproveAllInStage(stage)}
                linkBerkasDrive={student.linkBerkasDrive}
                stageNote={categoryNotes[stage]?.value || ''}
                onNoteChange={value => handleNoteChange(stage, value)}
              />
            ))}
          </div>

          {/* Bottom save bar */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground flex-1">
              <span className="text-rose-500">*</span> = Persyaratan wajib · Ceklis berkas untuk memvalidasi · Gunakan catatan per kategori untuk feedback mahasiswa
            </p>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasDirty}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan Semua Perubahan
            </button>
          </div>

        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorStudentRequirementDetailPage;
