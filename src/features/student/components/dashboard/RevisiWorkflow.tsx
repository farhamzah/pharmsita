import React, { useEffect, useState } from "react";
import {
  User,
  UploadCloud,
  FileText,
  Lock,
  Sliders,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import type { RevisiData } from "../../types/revisi";
import { guidanceApi, lecturerWorkflowApi, progressApi, revisionApi } from "../../../../core/api/domain";

interface RevisiWorkflowProps {
  stageId: "revisi-proposal" | "revisi-sidang";
  role?: "mahasiswa" | "dosen";
  studentId?: string;
  useLecturerApi?: boolean;
  onStatusChange?: () => void;
}

export const RevisiWorkflow: React.FC<RevisiWorkflowProps> = ({
  stageId,
  role = "mahasiswa",
  studentId = "1",
  useLecturerApi = false,
  onStatusChange,
}) => {
  const isLecturerWorkflow = role === "dosen" && useLecturerApi;
  const [data, setData] = useState<RevisiData>(() => revisionApi.getCached(stageId));
  const [docsLink, setDocsLink] = useState(() => {
    const prevStageId = stageId === "revisi-proposal" ? "bimbingan-pra-proposal" : "bimbingan-pra-sidang";
    return guidanceApi.getCached(prevStageId).googleDocsLink;
  });

  // States
  const [uploadFileMock, setUploadFileMock] = useState<string | null>(data.finalFile);
  const [showSimulator, setShowSimulator] = useState(false);

  useEffect(() => {
    let mounted = true;
    const prevStageId = stageId === "revisi-proposal" ? "bimbingan-pra-proposal" : "bimbingan-pra-sidang";
    const revisionRequest = isLecturerWorkflow
      ? lecturerWorkflowApi.getRevision(studentId, stageId)
      : revisionApi.get(stageId);
    const guidanceRequest = isLecturerWorkflow
      ? lecturerWorkflowApi.getGuidance(studentId, prevStageId)
      : guidanceApi.get(prevStageId);

    Promise.allSettled([revisionRequest, guidanceRequest]).then((results) => {
      if (!mounted) return;

      const [revisionResult, guidanceResult] = results;
      if (revisionResult.status === "fulfilled") {
        setData(revisionResult.value.data);
        setUploadFileMock(revisionResult.value.data.finalFile);
      }
      if (guidanceResult.status === "fulfilled") {
        setDocsLink(guidanceResult.value.data.googleDocsLink);
      }
    });

    return () => {
      mounted = false;
    };
  }, [stageId, studentId, isLecturerWorkflow]);

  const refreshData = async () => {
    const response = isLecturerWorkflow
      ? await lecturerWorkflowApi.getRevision(studentId, stageId)
      : await revisionApi.get(stageId);
    setData(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const handleAjukanPenyelesaianDirect = async (itemId: number) => {
    const response = await revisionApi.submitResolution(stageId, itemId, {
      penyelesaian: "",
      penyelesaianLink: "",
    });
    setData(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const handleApproveItem = async (itemId: number) => {
    const itemResponse = isLecturerWorkflow
      ? await lecturerWorkflowApi.updateRevisionItemStatus(studentId, stageId, itemId, "done")
      : await revisionApi.updateItemStatus(stageId, itemId, "done");
    
    // Auto toggle reviewer approvals if all items of a reviewer are done!
    const freshData = itemResponse.data;
    const examiner1Name = "Dr. Budi Harto, M.Farm.";
    const examiner2Name = "Dr. Andi Wijaya, M.Si.";
    
    const ex1Items = freshData.items.filter(i => i.assignedTo === examiner1Name);
    const ex2Items = freshData.items.filter(i => i.assignedTo === examiner2Name);
    
    const ex1AllDone = ex1Items.length > 0 && ex1Items.every(i => i.status === "done");
    const ex2AllDone = ex2Items.length > 0 && ex2Items.every(i => i.status === "done");
    
    if (ex1AllDone) {
      if (isLecturerWorkflow) {
        await lecturerWorkflowApi.updateRevisionApproval(studentId, stageId, { role: "penguji1", status: true });
      } else {
        await revisionApi.updateApproval(stageId, { role: "penguji1", status: true });
      }
    }
    if (ex2AllDone) {
      if (isLecturerWorkflow) {
        await lecturerWorkflowApi.updateRevisionApproval(studentId, stageId, { role: "penguji2", status: true });
      } else {
        await revisionApi.updateApproval(stageId, { role: "penguji2", status: true });
      }
    }
    if (ex1AllDone && ex2AllDone) {
      if (isLecturerWorkflow) {
        await lecturerWorkflowApi.updateRevisionApproval(studentId, stageId, { role: "ketua-sidang", status: "approved" });
      } else {
        await revisionApi.updateApproval(stageId, { role: "ketua-sidang", status: "approved" });
      }
    }

    await refreshData();
  };

  const handleToggleExaminerApproval = async (num: 1 | 2) => {
    const currentVal = num === 1 ? data.penguji1Approved : data.penguji2Approved;
    const payload = {
      role: num === 1 ? "penguji1" : "penguji2",
      status: !currentVal,
    } as const;
    const response = isLecturerWorkflow
      ? await lecturerWorkflowApi.updateRevisionApproval(studentId, stageId, payload)
      : await revisionApi.updateApproval(stageId, payload);
    setData(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const handleToggleKetuaSidangApproval = async (status: "pending" | "approved" | "rejected") => {
    const payload = {
      role: "ketua-sidang",
      status,
    } as const;
    const response = isLecturerWorkflow
      ? await lecturerWorkflowApi.updateRevisionApproval(studentId, stageId, payload)
      : await revisionApi.updateApproval(stageId, payload);
    setData(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const response = await revisionApi.uploadFinalFile(stageId, file.name);
      setUploadFileMock(file.name);
      setData(response.data);
      if (onStatusChange) {
        onStatusChange();
      }
    }
  };

  const handleResetRevisi = async () => {
    if (isLecturerWorkflow) {
      await refreshData();
      return;
    }

    const response = await revisionApi.reset(stageId);
    setUploadFileMock(null);
    setData(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  // Metrik counter
  const totalRevisi = data.items.length;
  const completedRevisiCount = data.items.filter((i) => i.status === "done").length;
  const progressPercent = Math.round((completedRevisiCount / totalRevisi) * 100);

  // Approval penguji counter
  const approvedReviewersCount = (data.penguji1Approved ? 1 : 0) + (data.penguji2Approved ? 1 : 0);


  // Tombol final upload aktif jika semua revisi dan approval disetujui
  const isEligibleForUpload =
    completedRevisiCount === totalRevisi &&
    data.penguji1Approved &&
    data.penguji2Approved &&
    data.ketuaSidangStatus === "approved";

  return (
    <div className="space-y-6">
      
      {/* ================= SECTION A: DATA PENGUJI & KETUA SIDANG ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Penguji 1 */}
        <div className="bg-card border border-border/80 rounded-xl p-4 flex gap-4 items-center shadow-xs">
          <div className="w-11 h-11 bg-sky-50 dark:bg-sky-950/40 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-sky-600 dark:text-sky-400">Penguji Utama (1)</span>
            <h4 className="text-sm font-semibold truncate text-foreground">Dr. Budi Harto, M.Farm.</h4>
            <p className="text-[11px] text-muted-foreground truncate font-medium">NIDN: 221011401065</p>
          </div>
        </div>

        {/* Penguji 2 */}
        <div className="bg-card border border-border/80 rounded-xl p-4 flex gap-4 items-center shadow-xs">
          <div className="w-11 h-11 bg-teal-50 dark:bg-teal-950/40 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-teal-600 dark:text-teal-400">Penguji Pendamping (2)</span>
            <h4 className="text-sm font-semibold truncate text-foreground">Dr. Andi Wijaya, M.Si.</h4>
            <p className="text-[11px] text-muted-foreground truncate font-medium">NIDN: 221011401077</p>
          </div>
        </div>

        {/* Ketua Sidang */}
        <div className="bg-card border border-border/80 rounded-xl p-4 flex gap-4 items-center shadow-xs">
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400">Ketua Sidang</span>
            <h4 className="text-sm font-semibold truncate text-foreground">Prof. Dr. Hj. Siti Rahayu</h4>
            <p className="text-[11px] text-muted-foreground truncate font-medium">NIDN: 111022501001</p>
          </div>
        </div>
      </div>

      {/* ================= SECTION B: APPROVAL SECTION & METRICS ================= */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <h5 className="text-sm font-semibold text-foreground mb-4">Persetujuan & Metrik Progres Revisi</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Approval Penguji */}
          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Approval Dewan Penguji</span>
              <span className="text-sm font-bold text-foreground mt-1 block">
                {approvedReviewersCount} <span className="text-[10px] font-normal text-muted-foreground">dari 2 Setuju</span>
              </span>
            </div>
            <div className="flex justify-between items-center gap-1.5">
              <button
                onClick={() => handleToggleExaminerApproval(1)}
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize transition hover:opacity-85 cursor-pointer shadow-2xs select-none",
                  data.penguji1Approved 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20"
                )}
              >
                P1: {data.penguji1Approved ? "Setuju" : "Antrean"}
              </button>
              <button
                onClick={() => handleToggleExaminerApproval(2)}
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize transition hover:opacity-85 cursor-pointer shadow-2xs select-none",
                  data.penguji2Approved 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20"
                )}
              >
                P2: {data.penguji2Approved ? "Setuju" : "Antrean"}
              </button>
            </div>
          </div>

          {/* Approval Ketua Sidang */}
          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Approval Ketua Sidang</span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block font-medium">Tinjauan Naskah Final</span>
            </div>
            <button
              onClick={() => {
                const nextStatus = data.ketuaSidangStatus === "pending" ? "approved" : data.ketuaSidangStatus === "approved" ? "rejected" : "pending";
                handleToggleKetuaSidangApproval(nextStatus);
              }}
              className={cn(
                "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border text-center capitalize transition hover:opacity-85 cursor-pointer shadow-2xs select-none",
                data.ketuaSidangStatus === "approved" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
                data.ketuaSidangStatus === "pending" && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20",
                data.ketuaSidangStatus === "rejected" && "bg-red-500/10 border-red-500/20 text-red-655 dark:text-red-400 dark:bg-red-950/20"
              )}
            >
              {data.ketuaSidangStatus === "approved" ? "disetujui" : data.ketuaSidangStatus === "pending" ? "menunggu" : "ditolak"}
            </button>
          </div>

          {/* Progress Revisi */}
          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Butir Revisi Disetujui</span>
              <span className="text-sm font-bold text-foreground mt-1 block">
                {completedRevisiCount} <span className="text-[10px] font-normal text-muted-foreground">dari {totalRevisi} Selesai</span>
              </span>
            </div>
            <div className="w-full">
              <div className="w-full h-1.5 bg-muted dark:bg-slate-800 border rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status Tahap */}
          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Status Tahapan</span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block font-medium">Fase Penyelesaian Revisi</span>
            </div>
            <span className={cn(
              "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize block text-center",
              completedRevisiCount === totalRevisi && data.penguji1Approved && data.penguji2Approved && data.ketuaSidangStatus === "approved"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                : completedRevisiCount === totalRevisi
                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20"
                : "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-450 dark:bg-sky-950/20"
            )}>
              {completedRevisiCount === totalRevisi && data.penguji1Approved && data.penguji2Approved && data.ketuaSidangStatus === "approved"
                ? "Selesai"
                : completedRevisiCount === totalRevisi
                ? "Menunggu Approval"
                : "Revisi Berjalan"}
            </span>
          </div>

        </div>

        {isDemoModeEnabled && (
        <div className="mt-4 pt-3 border-t border-border/40">
          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer select-none bg-none border-none outline-none"
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            Simulator Control Panel {showSimulator ? "▲" : "▼"}
          </button>
          
          {showSimulator && (
            <div className="mt-3 p-4 bg-muted/15 border border-border/60 rounded-xl flex flex-wrap justify-between items-center gap-3 animate-in slide-in-from-top-2 duration-150">
              <p className="text-[10px] text-muted-foreground">
                Ubah kelayakan revisi secara instan untuk verifikasi integrasi.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const response = await revisionApi.simulateAllApproved(stageId);
                    setData(response.data);
                    if (onStatusChange) {
                      onStatusChange();
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Simulasi Semua Disetujui (100% Ok)
                </button>
                <button
                  onClick={handleResetRevisi}
                  className="px-3 py-1.5 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50/40 dark:hover:bg-red-950/20 text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Reset Data Revisi
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ================= SECTION C: LINK GOOGLE DOCS REVISI ================= */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          Link Google Docs Revisi
        </h5>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-border/80">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">URL Google Docs Bimbingan & Revisi</span>
            <a 
              href={docsLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs font-bold text-primary hover:underline break-all block leading-relaxed"
            >
              {docsLink}
            </a>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href={docsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Buka Docs
            </a>
            {role === "mahasiswa" && (
              <button
                onClick={async () => {
                  const newUrl = prompt("Ubah link Google Docs bimbingan/revisi Anda:", docsLink || "");
                  if (newUrl !== null && newUrl.trim() !== "") {
                    const trimmed = newUrl.trim();
                    const prevStageId = stageId === "revisi-proposal" ? "bimbingan-pra-proposal" : "bimbingan-pra-sidang";
                    await guidanceApi.updateDocsLink(prevStageId, trimmed);
                    setDocsLink(trimmed);
                    await refreshData();
                  }
                }}
                className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Ubah Link
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= SECTION D: BUTIR REVISI & PENYELESAIAN ================= */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h5 className="text-sm font-semibold text-foreground">Butir Revisi & Penyelesaian</h5>
            <p className="text-xs text-muted-foreground/90 mt-0.5">
              Daftar topik revisi yang diberikan oleh dewan penguji beserta progres penyelesaiannya.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{completedRevisiCount}/{totalRevisi} Selesai</span>
        </div>

        <div className="flex flex-col gap-4">
          {data.items.map((item) => {
            const isDone = item.status === "done";
            const isInProgress = item.status === "in progress";
            const isPending = item.status === "pending";

            return (
              <div
                key={item.id}
                className={cn(
                  "p-5 rounded-xl border text-left transition-all duration-200 bg-card space-y-4 shadow-2xs",
                  isDone && "border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.01]",
                  isInProgress && "border-amber-500/35 hover:border-amber-500/50 bg-amber-500/[0.01] ring-1 ring-amber-100/40 dark:ring-amber-950/20",
                  isPending && "border-border/50 hover:border-border bg-slate-50/20 dark:bg-slate-800/5"
                )}
              >
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center text-xs font-extrabold shrink-0",
                        isDone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-950/30" : 
                        isInProgress ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:bg-amber-950/30 ring-4 ring-amber-100/30 dark:ring-amber-950/15" :
                        "bg-slate-500/5 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-slate-700"
                      )}
                    >
                      {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : item.id}
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Topik Revisi</span>
                      <h6 className="text-xs font-semibold text-foreground leading-snug">{item.topik}</h6>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border self-start sm:self-center capitalize select-none shrink-0 shadow-2xs",
                      isDone && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
                      isInProgress && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20",
                      isPending && "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
                    )}
                  >
                    {isDone ? "Selesai" : isInProgress ? "Menunggu Validasi" : "Belum Selesai"}
                  </span>
                </div>

                {/* Materi Revisi */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold block">Materi Revisi</span>
                  <p className="text-xs text-foreground/90 leading-relaxed font-medium bg-muted/20 dark:bg-slate-800/20 p-3 rounded-lg border border-border/40">
                    {item.materi || item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    DIBERIKAN OLEH: <span className="text-foreground font-semibold">{item.assignedTo}</span>
                  </p>
                </div>

                {/* Tanggapan/Penyelesaian Section */}
                {(isInProgress || isDone) && item.submittedAt && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-border/80 space-y-2">
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground font-bold uppercase">
                      <span>Progres Penyelesaian</span>
                      <span className="font-semibold text-[8px] lowercase">
                        Diajukan pada: {new Date(item.submittedAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      Penyelesaian telah diajukan kepada dosen penguji untuk divalidasi.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {role === "mahasiswa" && isPending && (
                    <button
                      type="button"
                      onClick={() => handleAjukanPenyelesaianDirect(item.id)}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Ajukan Penyelesaian
                    </button>
                  )}

                  {role === "dosen" && isInProgress && (
                    <button
                      type="button"
                      onClick={() => handleApproveItem(item.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" /> Setujui Penyelesaian
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= SECTION E: UPLOAD FINAL REVISI ================= */}
      {role === "mahasiswa" && (
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <h5 className="text-sm font-semibold text-foreground mb-1">Unggah Dokumen Final Hasil Revisi</h5>
        <p className="text-xs text-muted-foreground/95 mb-4">
          Unggah naskah proposal Tugas Akhir yang sudah di-acc secara utuh oleh seluruh penguji & ketua sidang.
        </p>

        {isEligibleForUpload ? (
          <div className="space-y-4">
            {uploadFileMock ? (
              <div className="flex items-center justify-between p-4 border border-emerald-500/25 bg-emerald-50/5 dark:bg-emerald-950/10 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h6 className="text-xs font-semibold text-foreground truncate">{uploadFileMock}</h6>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Naskah Hasil Revisi Selesai • PDF Document</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <label className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    Ganti Berkas
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleUploadFile} className="hidden" />
                  </label>
                  <button
                    onClick={async () => {
                      alert("Berkas revisi proposal sukses diunggah dan diverifikasi! Anda kini dapat melanjutkan bimbingan pra sidang.");
                      await progressApi.updateStepStatus(stageId, "completed");
                      if (onStatusChange) onStatusChange();
                    }}
                    className="px-4 py-2 bg-emerald-650 hover:bg-emerald-750 text-white font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    Selesaikan Tahap Revisi
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border/80 hover:border-primary/50 transition bg-muted/10 dark:bg-slate-800/10 rounded-xl p-8 flex flex-col items-center justify-center text-center relative group">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleUploadFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition mb-3" />
                <h6 className="text-xs font-bold text-foreground">Pilih naskah final proposal hasil revisi</h6>
                <p className="text-[10px] text-muted-foreground mt-1">Mendukung format PDF, DOC, atau DOCX (Maksimal 10MB)</p>
              </div>
            )}
          </div>
        ) : (
          /* Locked overlay panel */
          <div className="flex flex-col items-center justify-center p-6 bg-muted/20 border border-dashed border-border/60 rounded-xl text-center">
            <Lock className="w-5 h-5 text-slate-450 mb-2" />
            <h6 className="text-xs font-bold text-slate-500">Panel Unggahan Terkunci</h6>
            <p className="text-[11px] text-muted-foreground max-w-sm mt-1 leading-relaxed">
              Tombol unggahan berkas final revisi akan otomatis terbuka jika semua butir diskusi revisi sudah status <strong>Done</strong> dan kelayakan dewan penguji disetujui (Approved).
            </p>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
