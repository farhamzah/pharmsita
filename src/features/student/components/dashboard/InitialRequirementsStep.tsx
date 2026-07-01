import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Link,
  UploadCloud,
  ExternalLink,
  FileText,
  Check,
  RotateCcw,
  Sliders,
  XCircle,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { studentWorkflowApi } from "../../../../core/api/domain";
import {
  DEFAULT_INITIAL_REQUIREMENTS,
  type RequirementItem,
} from "../../services/student-workflow-service";

export const InitialRequirementsStep: React.FC = () => {
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [driveLink, setDriveLink] = useState<string>("");
  const [driveLinkInput, setDriveLinkInput] = useState<string>("");
  const [isEditingLink, setIsEditingLink] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Simulator state variables
  const [selectedSimulatorReq, setSelectedSimulatorReq] = useState<string>("req_a3");
  const [simulatorStatus, setSimulatorStatus] = useState<RequirementItem["status"]>("Valid");
  const [simulatorNote, setSimulatorNote] = useState<string>("");

  // Load from workflow API or initialize with defaults.
  useEffect(() => {
    let mounted = true;

    studentWorkflowApi
      .getInitialRequirements()
      .then((response) => {
        if (!mounted) return;

        setRequirements(response.data.requirements);
        setDriveLink(response.data.driveLink);
        setDriveLinkInput(response.data.driveLink);
        setIsEditingLink(!response.data.driveLink);
      })
      .catch(() => {
        if (!mounted) return;

        setRequirements(isDemoModeEnabled ? DEFAULT_INITIAL_REQUIREMENTS : []);
        setDriveLink("");
        setDriveLinkInput("");
        setIsEditingLink(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Save changes through the student workflow API boundary.
  const saveRequirementsState = (updatedReqs: RequirementItem[], link: string) => {
    studentWorkflowApi
      .saveInitialRequirements({ requirements: updatedReqs, driveLink: link })
      .catch(() => undefined);
  };

  // Trigger temporary toast notification
  const triggerToast = (message: string) => {
    setShowNotification(message);
    setTimeout(() => {
      setShowNotification(null);
    }, 4000);
  };

  // Submit Drive Link
  const handleSubmitDriveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveLinkInput.trim()) {
      alert("Tolong masukkan link Google Drive yang valid.");
      return;
    }

    if (!driveLinkInput.includes("drive.google.com")) {
      if (!confirm("Link yang Anda masukkan mungkin bukan link Google Drive. Apakah Anda ingin melanjutkan?")) {
        return;
      }
    }

    const currentLink = driveLinkInput.trim();
    setDriveLink(currentLink);
    setIsEditingLink(false);

    // Update requirements that are not valid to 'Menunggu Verifikasi' (Menunggu Validasi)
    const updated = requirements.map((req) => {
      if (req.status === "Belum Upload" || req.status === "Perlu Revisi") {
        return {
          ...req,
          status: "Menunggu Verifikasi" as const,
          // Keep or clear notes? If they re-submit, we clear coordinator notes so it's fresh for verification
          catatanKoordinator: undefined,
        };
      }
      return req;
    });

    setRequirements(updated);
    saveRequirementsState(updated, currentLink);
    triggerToast("Link Google Drive berhasil diupload! Status berkas Anda kini Menunggu Validasi.");
  };

  // Determine overall status
  const getOverallStatus = () => {
    const allValid = requirements.every((r) => r.status === "Valid");

    if (allValid) {
      return {
        label: "Valid",
        color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20",
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        desc: "Selamat! Seluruh berkas Persyaratan Awal Anda telah berhasil divalidasi dan dinyatakan Valid. Anda dapat melanjutkan ke tahap berikutnya (Pengajuan Judul).",
      };
    }

    return {
      label: "Belum Valid",
      color: "bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-400 dark:bg-slate-900/40",
      icon: <XCircle className="w-5 h-5 text-slate-500 shrink-0" />,
      desc: "Beberapa persyaratan Anda belum divalidasi atau masih belum sesuai ketentuan. Silakan pastikan link Google Drive terisi dengan benar dan periksa catatan perbaikan dari Koordinator jika ada.",
    };
  };

  const overall = getOverallStatus();

  // Statistics
  const totalCount = requirements.length;
  const validCount = requirements.filter((r) => r.status === "Valid").length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((validCount / totalCount) * 100);

  // Simulator: Update single requirement
  const handleUpdateSingleReqSim = () => {
    const updated = requirements.map((req) => {
      if (req.id === selectedSimulatorReq) {
        return {
          ...req,
          status: simulatorStatus,
          catatanKoordinator: simulatorStatus === "Perlu Revisi" && simulatorNote.trim() ? simulatorNote.trim() : undefined,
        };
      }
      return req;
    });

    setRequirements(updated);
    saveRequirementsState(updated, driveLink);
    triggerToast(`Simulasi berhasil! Berkas "${requirements.find(r => r.id === selectedSimulatorReq)?.label.substring(0, 30)}..." telah diubah statusnya.`);
  };

  // Simulator: Approve All Requirements
  const handleApproveAllSim = () => {
    const updated = requirements.map((req) => ({
      ...req,
      status: "Valid" as const,
      catatanKoordinator: undefined,
    }));

    setRequirements(updated);
    saveRequirementsState(updated, driveLink || "https://drive.google.com/drive/folders/simulated-approved-folder");
    if (!driveLink) {
      setDriveLink("https://drive.google.com/drive/folders/simulated-approved-folder");
      setDriveLinkInput("https://drive.google.com/drive/folders/simulated-approved-folder");
      setIsEditingLink(false);
    }
    triggerToast("Simulasi berhasil! Semua berkas persyaratan disetujui (Status Diterima).");
  };

  // Simulator: Reset
  const handleResetSim = () => {
    const resetRequirements = isDemoModeEnabled ? DEFAULT_INITIAL_REQUIREMENTS : [];
    setRequirements(resetRequirements);
    setDriveLink("");
    setDriveLinkInput("");
    setIsEditingLink(true);
    saveRequirementsState(resetRequirements, "");
    triggerToast("Progres simulasi berhasil direset ke status bawaan.");
  };

  // Quick select simulator requirement details
  useEffect(() => {
    const target = requirements.find((r) => r.id === selectedSimulatorReq);
    if (target) {
      setSimulatorStatus(target.status);
      setSimulatorNote(target.catatanKoordinator || "");
    }
  }, [selectedSimulatorReq, requirements]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm animate-fade-in border border-slate-800 dark:border-slate-200">
          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[3]" />
          <p className="text-xs font-semibold leading-relaxed">{showNotification}</p>
        </div>
      )}

      {/* ================= STAGE STATUS & STATISTICS BANNER ================= */}
      <div className={cn("border rounded-2xl p-5 shadow-xs transition-all duration-300", overall.color)}>
        <div className="flex gap-4 items-start">
          <div className="p-2.5 rounded-xl bg-background/60 backdrop-blur-xs shadow-xs shrink-0">
            {overall.icon}
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
                Status Validasi Tahap Awal
              </span>
              <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-full bg-background/80 shadow-3xs uppercase tracking-wider">
                {overall.label}
              </span>
            </div>
            <h4 className="text-base font-extrabold tracking-tight mt-1">
              {overall.label === "Diterima" ? "Tahap Persyaratan Administrasi Selesai 🎉" : "Pemenuhan Dokumen Persyaratan Awal"}
            </h4>
            <p className="text-xs leading-relaxed opacity-90 mt-1.5 max-w-2xl font-medium">
              {overall.desc}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* ================= LEFT COLUMN: UPLOAD GOOGLE DRIVE ================= */}
        <div className="md:col-span-6 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Link className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Link Pengumpulan Berkas</h4>
                <p className="text-[10px] text-muted-foreground">Kumpulkan semua berkas Anda dalam satu folder Google Drive</p>
              </div>
            </div>

            {isEditingLink ? (
              <form onSubmit={handleSubmitDriveLink} className="space-y-3 pt-1">
                <div className="relative">
                  <input
                    type="url"
                    value={driveLinkInput}
                    onChange={(e) => setDriveLinkInput(e.target.value)}
                    placeholder="Tempel link folder Google Drive Anda di sini..."
                    required
                    className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-3 py-2.5 text-foreground bg-background transition"
                  />
                  <UploadCloud className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 text-xs font-bold py-2 px-4 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Kirim Link Persyaratan
                  </button>
                  {driveLink && (
                    <button
                      type="button"
                      onClick={() => {
                        setDriveLinkInput(driveLink);
                        setIsEditingLink(false);
                      }}
                      className="text-xs font-semibold py-2 px-3 border border-border hover:bg-muted rounded-xl text-foreground transition"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/40 border rounded-xl p-3.5 space-y-3.5 mt-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Google Drive Terkumpul</span>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate hover:underline leading-relaxed mt-0.5">
                      <a href={driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                        {driveLink} <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={() => setIsEditingLink(true)}
                    className="flex-1 text-center py-1.5 px-3 border border-border hover:bg-muted rounded-lg text-xs font-semibold text-foreground transition cursor-pointer"
                  >
                    Ubah Link Pengumpulan
                  </button>
                  <a
                    href={driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition shadow-2xs"
                  >
                    Buka Folder <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-3 text-[10px] text-amber-800 dark:text-amber-300/90 leading-relaxed mt-4 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>Penting:</strong> Pastikan Anda telah mengatur akses folder Google Drive menjadi <strong>"Anyone with the link can view"</strong> (Siapa saja dengan link dapat melihat) agar Admin/Dosen dapat melakukan validasi dengan lancar.
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: STATISTICS & PROGRES ================= */}
        <div className="md:col-span-6 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Progres Validasi Persyaratan</h4>
                <p className="text-[10px] text-muted-foreground">Persentase dokumen persyaratan yang sudah divalidasi</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl px-3 py-1.5 text-right shrink-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Dokumen Valid</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {validCount} / {totalCount}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Pemenuhan Persyaratan</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full h-4 bg-muted dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/60 rounded-xl p-3.5 space-y-2 mt-4">
            <div className="flex justify-between text-[11px] font-medium border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2.5 rounded-full bg-emerald-500" /> Valid
              </span>
              <span className="font-bold text-foreground">{validCount} berkas</span>
            </div>
            <div className="flex justify-between text-[11px] font-medium">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2.5 rounded-full bg-slate-400" /> Belum Valid
              </span>
              <span className="font-bold text-foreground">{totalCount - validCount} berkas</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= DETAILED REQUIREMENTS INLINE LIST (NO MODAL) ================= */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="border-b border-border/60 pb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 select-none">
              <FileCheck className="w-4.5 h-4.5 text-primary shrink-0" /> Detail Rincian Persyaratan Awal
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Seluruh persyaratan wajib untuk memulai Tugas Akhir</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded-full font-mono text-muted-foreground select-none">
            {totalCount} Total Persyaratan
          </span>
        </div>

        <div className="space-y-2.5">
          {requirements.map((req) => {
            const isValid = req.status === "Valid";

            return (
              <div
                key={req.id}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200",
                  isValid
                    ? "bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-250/30 dark:border-emerald-800/60 shadow-xs"
                    : "bg-card border-border shadow-2xs"
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Status Checkbox-style Icon */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all select-none",
                      isValid
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-muted-foreground/30 bg-muted/10 text-muted-foreground/45"
                    )}
                  >
                    {isValid ? (
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    ) : (
                      <span className="text-[10px] font-bold">✕</span>
                    )}
                  </div>

                  {/* Label */}
                  <p className={cn(
                    "text-sm font-medium transition-all text-left",
                    isValid ? "text-muted-foreground line-through font-normal" : "text-foreground font-semibold"
                  )}>
                    {req.label}
                  </p>
                </div>

                {/* Badge Status */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0",
                  isValid
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-250 dark:border-emerald-800"
                    : "bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                )}>
                  {isValid ? "Valid" : "Belum Valid"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stage-level Coordinator Note warning box */}
        {(() => {
          const stageNote = requirements.find(r => r.catatanKoordinator)?.catatanKoordinator;
          if (!stageNote) return null;
          return (
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl text-xs space-y-1.5 animate-in slide-in-from-bottom-2 duration-200">
              <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 select-none">
                <AlertTriangle className="w-3.5 h-3.5" /> Catatan Koordinator:
              </span>
              <p className="text-muted-foreground leading-relaxed font-medium">{stageNote}</p>
            </div>
          );
        })()}
      </div>

      {/* ================= COORDINATOR SIMULATOR PANEL (DEMO CONTROL) ================= */}
      {isDemoModeEnabled && (
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/80 rounded-2xl p-5 shadow-xs">
        <div className="flex justify-between items-center border-b border-border/40 pb-3 mb-4">
          <h6 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" /> Panel Simulasi Koordinator / Admin (Demo Control)
          </h6>
          <div className="flex gap-2">
            <button
              onClick={handleApproveAllSim}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Setujui Semua Berkas
            </button>
            <button
              onClick={handleResetSim}
              className="py-1.5 px-2.5 border border-border hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition"
              title="Reset Simulasi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Requirement Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">Pilih Dokumen Persyaratan</label>
            <select
              value={selectedSimulatorReq}
              onChange={(e) => setSelectedSimulatorReq(e.target.value)}
              className="w-full text-xs border rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-primary bg-background text-foreground"
            >
              {requirements.map((req) => (
                <option key={req.id} value={req.id}>
                  ({req.id}) {req.label.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>

          {/* Validation Status Selector */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">Set Status Validasi</label>
            <select
              value={simulatorStatus}
              onChange={(e) => setSimulatorStatus(e.target.value as RequirementItem["status"])}
              className="w-full text-xs border rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-primary bg-background text-foreground"
            >
              <option value="Valid">Diterima (Valid)</option>
              <option value="Menunggu Verifikasi">Menunggu Validasi</option>
              <option value="Perlu Revisi">Ditolak / Belum Sesuai</option>
              <option value="Belum Upload">Belum Dikirim</option>
            </select>
          </div>

          {/* Action Save Single simulator */}
          <div className="md:col-span-4">
            <button
              onClick={handleUpdateSingleReqSim}
              className="w-full py-2 px-3 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold rounded-lg transition shadow-2xs"
            >
              Update Status Berkas
            </button>
          </div>

          {/* Rejection Note Comment (If status is Perlu Revisi) */}
          {simulatorStatus === "Perlu Revisi" && (
            <div className="md:col-span-12 space-y-1.5 mt-2 animate-slide-down">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Catatan Penolakan (Catatan Koordinator)</label>
              <textarea
                value={simulatorNote}
                onChange={(e) => setSimulatorNote(e.target.value)}
                placeholder="Masukkan alasan penolakan berkas dan instruksi perbaikan untuk mahasiswa..."
                rows={2}
                className="w-full text-xs border rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-primary bg-background text-foreground"
              />
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
