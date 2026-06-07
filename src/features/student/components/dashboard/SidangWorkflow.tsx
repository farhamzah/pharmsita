import React, { useEffect, useState } from "react";
import {
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  ExternalLink,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import type { SidangData, SidangResultStatus } from "../../types/sidang";
import { coordinatorWorkflowApi, examApi, lecturerWorkflowApi, progressApi } from "../../../../core/api/domain";

interface SidangWorkflowProps {
  stageId: "sidang-proposal" | "sidang";
  role?: "mahasiswa" | "dosen";
  studentId?: string;
  useLecturerApi?: boolean;
  useCoordinatorApi?: boolean;
  onStatusChange?: () => void;
}

export const SidangWorkflow: React.FC<SidangWorkflowProps> = ({
  stageId,
  role = "mahasiswa",
  studentId = "1",
  useLecturerApi = false,
  useCoordinatorApi = false,
  onStatusChange,
}) => {
  const [data, setData] = useState<SidangData>(() => examApi.getCached(stageId));
  const isLecturerWorkflow = role === "dosen" && useLecturerApi;
  const isCoordinatorWorkflow = role === "dosen" && useCoordinatorApi;

  // Edit Link States
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [docLinkInput, setDocLinkInput] = useState(data.googleDocsLink);

  // Simulator States
  const [inputGrade, setInputGrade] = useState(data.grade || "A-");
  const [inputResult, setInputResult] = useState<SidangResultStatus>(data.resultStatus);
  const [showSimulator, setShowSimulator] = useState(false);

  useEffect(() => {
    let mounted = true;
    const request = isCoordinatorWorkflow
      ? coordinatorWorkflowApi.getExam(studentId, stageId)
      : isLecturerWorkflow
      ? lecturerWorkflowApi.getExam(studentId, stageId)
      : examApi.get(stageId);

    request
      .then((response) => {
        if (!mounted) return;
        setData(response.data);
        setDocLinkInput(response.data.googleDocsLink);
        setInputGrade(response.data.grade || "A-");
        setInputResult(response.data.resultStatus);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [stageId, studentId, isLecturerWorkflow, isCoordinatorWorkflow]);

  const handleSaveDocLink = async () => {
    const response = await examApi.updateDocsLink(stageId, docLinkInput);
    setData(response.data);
    setIsEditingDoc(false);
  };

  const handleSaveAssessmentSimulator = async () => {
    const payload = {
      grade: inputGrade,
      resultStatus: inputResult,
    };
    if (isCoordinatorWorkflow) {
      throw new Error("Coordinator exam view is read-only.");
    }

    const response = isLecturerWorkflow
      ? await lecturerWorkflowApi.updateExamAssessment(studentId, stageId, payload)
      : await examApi.updateAssessment(stageId, payload);
    setData(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const handleResetSimulator = async () => {
    if (isCoordinatorWorkflow) {
      const response = await coordinatorWorkflowApi.getExam(studentId, stageId);
      setData(response.data);
      return;
    }

    if (isLecturerWorkflow) {
      const response = await lecturerWorkflowApi.getExam(studentId, stageId);
      setData(response.data);
      return;
    }

    const response = await examApi.reset(stageId);
    setData(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  // Status mapping colors & labels
  const resultLabels: Record<SidangResultStatus, string> = {
    "belum-dinilai": "Belum Dinilai",
    lulus: "Lulus Murni",
    "lulus-dengan-revisi": "Lulus Dengan Revisi",
    "tidak-lulus": "Tidak Lulus (Sidang Ulang)",
  };

  const resultColors: Record<SidangResultStatus, string> = {
    "belum-dinilai": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    lulus: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
    "lulus-dengan-revisi": "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    "tidak-lulus": "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900",
  };


  return (
    <div className="space-y-6">

      {/* ================= SECTION A: DATA SIDANG (DEWAN SIDANG) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* Dewan Penguji Panel */}
        <div className="md:col-span-8 space-y-3">
          <h5 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3 select-none">
            <User className="w-4 h-4 text-primary" /> Susunan Dewan Sidang
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {data.panelists.map((panel) => {
              const isPenguji = panel.role.startsWith("penguji");
              const isKetua = panel.role === "ketua-sidang";

              return (
                <div
                  key={panel.id}
                  className={cn(
                    "bg-card border border-border/80 rounded-xl p-4 flex gap-4 items-center shadow-xs transition hover:shadow-sm",
                    isKetua && "sm:col-span-2 border-indigo-500/20 bg-indigo-500/[0.01]"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      isKetua
                        ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                        : isPenguji
                          ? "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-[9px] uppercase tracking-wider font-extrabold block",
                        isKetua
                          ? "text-indigo-600 dark:text-indigo-400"
                          : isPenguji
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {panel.roleLabel}
                    </span>
                    <h6 className="text-sm font-semibold text-foreground truncate mt-0.5">{panel.name}</h6>
                    <p className="text-[11px] text-muted-foreground truncate font-medium">NIDN: {panel.nidn}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jadwal Sidang Panel */}
        <div className="md:col-span-4">
          <h5 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3 select-none">
            <Calendar className="w-4 h-4 text-primary" /> Jadwal Sidang
          </h5>

          {data.schedule ? (
            <div className="bg-gradient-to-br from-primary/[0.03] to-indigo-500/[0.03] dark:from-primary/[0.05] dark:to-indigo-950/20 border border-primary/20 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Tanggal Sidang</span>
                  <p className="text-xs font-semibold text-foreground/90 mt-0.5">{data.schedule.tanggal}</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Waktu Sidang</span>
                  <p className="text-xs font-semibold text-foreground/90 mt-0.5">{data.schedule.waktu}</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Ruang & Lokasi</span>
                  <p className="text-xs font-semibold text-foreground/90 truncate mt-0.5">{data.schedule.ruang}</p>
                  <p className="text-[10px] text-muted-foreground/75 truncate mt-0.5">{data.schedule.lokasi}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <Calendar className="w-8 h-8 text-slate-400 mb-2" />
              <h6 className="text-xs font-semibold text-foreground">Jadwal Belum Ditetapkan</h6>
              <p className="text-[11px] text-muted-foreground/80 mt-1 max-w-[220px] leading-relaxed">
                Menunggu koordinator mengalokasikan slot waktu dan ruang sidang Anda.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================= SECTION B: DOKUMEN PROPOSAL ================= */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-3.5 items-center min-w-0">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-sm font-semibold text-foreground">Link Dokumen Utama Sidang</h5>
            {isEditingDoc ? (
              <div className="flex items-center gap-2 mt-2 w-full">
                <input
                  type="text"
                  value={docLinkInput}
                  onChange={(e) => setDocLinkInput(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-primary w-64 md:w-96 text-foreground bg-background outline-none focus:border-primary/50"
                />
                <button
                  onClick={handleSaveDocLink}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 shrink-0 cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setIsEditingDoc(false);
                    setDocLinkInput(data.googleDocsLink);
                  }}
                  className="px-3 py-1.5 border border-border hover:bg-muted text-foreground text-xs font-medium rounded-xl shrink-0 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground hover:underline mt-0.5 truncate font-medium">
                <a href={data.googleDocsLink} target="_blank" rel="noopener noreferrer">
                  {data.googleDocsLink}
                </a>
              </p>
            )}
          </div>
        </div>

        {!isEditingDoc && (
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            {role === "mahasiswa" && (
              <button
                onClick={() => setIsEditingDoc(true)}
                className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Ubah Link
              </button>
            )}
            <a
              href={data.googleDocsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Buka Google Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* ================= SECTION C: STATUS KELULUSAN ================= */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-primary" /> Status Kelulusan Sidang
          </span>
        </div>
        <div>
          <span
            className={cn(
              "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize block text-center sm:inline-block",
              resultColors[data.resultStatus]
            )}
          >
            {resultLabels[data.resultStatus]}
          </span>
          <p className="text-[10px] text-muted-foreground/75 mt-2 leading-relaxed font-medium">
            Ditetapkan dalam rapat dewan sidang akhir pasca presentasi.
          </p>
        </div>
      </div>

      {/* ================= SECTION D: REVISI (JIKA ADA) ================= */}
      {data.revisionNotes.length > 0 && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-border/50 pb-3">
            <div>
              <h5 className="text-sm font-semibold text-foreground">Catatan Revisi dari Dewan Penguji</h5>
              <p className="text-xs text-muted-foreground/90 mt-0.5">
                Daftar butir revisi wajib yang harus diselesaikan pada step berikutnya (non-clickable).
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20 font-mono">
              {data.revisionNotes.length} Catatan
            </span>
          </div>

          <div className="divide-y divide-border/40">
            {data.revisionNotes.map((note, index) => (
              <div key={index} className="py-3 flex gap-3 items-start text-xs text-foreground/90 font-medium">
                <span className="w-5 h-5 rounded bg-muted dark:bg-slate-800 border flex items-center justify-center font-mono font-bold text-[10px] text-slate-550 shrink-0 select-none">
                  {index + 1}
                </span>
                <p className="leading-relaxed flex-1 mt-0.5">{note}</p>
              </div>
            ))}
          </div>

          {/* CTA Banner to next step */}
          <div className="bg-gradient-to-r from-amber-500/10 to-primary/5 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
            <div className="space-y-0.5">
              <h6 className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Siap Melakukan Revisi?
              </h6>
              <p className="text-[10px] text-amber-700/90 dark:text-amber-400/80 leading-relaxed max-w-xl font-medium">
                Sidang Anda selesai dan lulus dengan revisi. Silakan beranjak ke langkah berikutnya untuk berdiskusi, memperbaiki naskah, dan mendapatkan approval penguji.
              </p>
            </div>
            {role === "mahasiswa" && (
              <button
                onClick={async () => {
                  await progressApi.updateStepStatus(stageId, "completed");
                  if (onStatusChange) onStatusChange();
                }}
                className="px-4 py-2 bg-amber-650 hover:bg-amber-750 text-white font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                Lanjut ke Revisi <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= SIMULATOR PANEL ================= */}
      {isDemoModeEnabled && (
      <div className="bg-muted/15 border border-border/80 rounded-2xl p-5 shadow-xs">
        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer select-none bg-none border-none outline-none"
        >
          <Sliders className="w-4 h-4 text-primary" /> Simulator Dosen & Hasil Sidang (Demo Control) {showSimulator ? "▲" : "▼"}
        </button>

        {showSimulator && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mt-4 animate-in slide-in-from-top-2 duration-150">
            {/* Grade Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Masukkan Nilai Akhir</label>
              <input
                type="text"
                value={inputGrade}
                onChange={(e) => setInputGrade(e.target.value)}
                placeholder="Contoh: A, A-, B+"
                className="w-full text-xs border border-border/80 rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50 outline-none"
              />
            </div>

            {/* Status Kelulusan Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Status Kelulusan</label>
              <select
                value={inputResult}
                onChange={(e) => setInputResult(e.target.value as SidangResultStatus)}
                className="w-full text-xs border border-border/80 rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50 outline-none"
              >
                <option value="belum-dinilai">Belum Dinilai</option>
                <option value="lulus">Lulus Murni</option>
                <option value="lulus-dengan-revisi">Lulus Dengan Revisi</option>
                <option value="tidak-lulus">Tidak Lulus</option>
              </select>
            </div>

            {/* Save/Reset Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveAssessmentSimulator}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Simpan Simulasi
              </button>
              <button
                onClick={handleResetSimulator}
                className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                title="Reset ke status bawaan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}

    </div>
  );
};
