import React, { useState, useEffect } from "react";
import {
  FileText,
  UploadCloud,
  RotateCcw,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  AlertCircle,
  ChevronRight,
  UserCheck,
  Lock
} from "lucide-react";
import { SectionCard } from "../../../components/ui/SectionCard";
import { mockJenisTA } from "../../../mock-data/thesis-types";
import { cn } from "@/lib/utils";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { adminApi, studentWorkflowApi } from "../../../core/api/domain";
import {
  DEFAULT_THESIS_SUBMISSIONS,
  type ThesisSubmission,
} from "../../student/services/student-workflow-service";

type ThesisTypeOption = {
  id: string;
  name: string;
  skema: "Skripsi" | "Non Skripsi";
  status: "Aktif" | "Nonaktif";
};

type LecturerOption = {
  id: string;
  name: string;
  identifier: string;
  status: "Aktif" | "Nonaktif";
};

const demoThesisTypes = isDemoModeEnabled
  ? (mockJenisTA as ThesisTypeOption[])
  : [];

const FormPendaftaranSection: React.FC = () => {
  // Form State
  const [skema, setSkema] = useState<"Skripsi" | "Non Skripsi">("Skripsi");
  const [thesisTypes, setThesisTypes] = useState<ThesisTypeOption[]>(demoThesisTypes);
  const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
  const [jenisTA, setJenisTA] = useState<string>("");
  const [judulTA, setJudulTA] = useState<string>("");
  const [deskripsiTA, setDeskripsiTA] = useState<string>("");
  const [pembimbing1, setPembimbing1] = useState<string>("");
  const [buktiFileName, setBuktiFileName] = useState<string>("");

  // Submissions History State
  const [submissions, setSubmissions] = useState<ThesisSubmission[]>([]);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // State to track expanded submission details
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Business Rule: Check if student has a pending validation submission
  const hasPendingSubmission = submissions.some((sub) => sub.status === "Sedang Proses Validasi");

  // Simulator State
  const [selectedSimId, setSelectedSimId] = useState<string>("");
  const [simStatus, setSimStatus] = useState<ThesisSubmission["status"]>("Diterima");
  const [simNote, setSimNote] = useState<string>("");

  // Load submissions on mount
  useEffect(() => {
    let mounted = true;

    studentWorkflowApi
      .listThesisSubmissions()
      .then((response) => {
        if (mounted) {
          setSubmissions(response.data);
        }
      })
      .catch(() => {
        if (mounted) {
          setSubmissions(isDemoModeEnabled ? DEFAULT_THESIS_SUBMISSIONS : []);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      adminApi.listPublicThesisTypes().catch(() => ({ data: demoThesisTypes })),
      adminApi.listPublicLecturers().catch(() => ({ data: [] as LecturerOption[] })),
    ]).then(([typesResponse, lecturersResponse]) => {
      if (!mounted) return;
      setThesisTypes(typesResponse.data as ThesisTypeOption[]);
      setLecturers(
        (lecturersResponse.data as LecturerOption[]).filter(
          (lecturer) => lecturer.status === "Aktif"
        )
      );
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Save submissions
  const saveSubmissions = (updatedList: ThesisSubmission[]) => {
    setSubmissions(updatedList);
    studentWorkflowApi
      .replaceThesisSubmissions(updatedList)
      .catch(() => undefined);
  };

  // Toast notifier
  const triggerToast = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => {
      setShowNotification(null);
    }, 4500);
  };

  // Set default jenisTA based on skema
  useEffect(() => {
    const filteredTypes = thesisTypes.filter(
      (item) => item.skema === skema && item.status === "Aktif"
    );
    if (filteredTypes.length > 0) {
      setJenisTA(filteredTypes[0].name);
    } else {
      setJenisTA("");
    }
  }, [skema, thesisTypes]);

  // Handle Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPendingSubmission) {
      alert("Anda tidak dapat mengajukan judul baru karena ada pengajuan yang sedang menunggu validasi.");
      return;
    }

    if (!jenisTA || !judulTA.trim() || !deskripsiTA.trim() || !pembimbing1) {
      alert("Mohon lengkapi seluruh kolom formulir pengajuan judul.");
      return;
    }

    const newSubmission: ThesisSubmission = {
      id: `sub_${Date.now()}`,
      date: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }),
      skema,
      jenisTA,
      judulTA: judulTA.trim(),
      deskripsiTA: deskripsiTA.trim(),
      pembimbing1,
      pembimbing2: "Ditentukan Koordinator",
      status: "Sedang Proses Validasi",
      buktiFile: buktiFileName || "kwitansi_pembayaran_ta.pdf"
    };

    const updated = [newSubmission, ...submissions];
    saveSubmissions(updated);

    // Clear form inputs
    setJudulTA("");
    setDeskripsiTA("");
    setPembimbing1("");
    setBuktiFileName("");
    
    // Set simulator selector to new submission
    setSelectedSimId(newSubmission.id);

    triggerToast("Pengajuan judul baru berhasil dikirim! Status saat ini: Sedang Proses Validasi.");
  };

  // Simulator: Update Validation Status
  const handleUpdateStatusSim = () => {
    if (!selectedSimId) {
      alert("Pilih pengajuan terlebih dahulu pada panel simulator.");
      return;
    }

    const updated = submissions.map((sub) => {
      if (sub.id === selectedSimId) {
        return {
          ...sub,
          status: simStatus,
          catatanKoordinator: simStatus === "Ditolak" && simNote.trim() ? simNote.trim() : undefined
        };
      }
      return sub;
    });

    saveSubmissions(updated);
    triggerToast(`Simulasi Berhasil! Status pengajuan telah diubah menjadi "${simStatus}".`);
  };

  // Simulator: Reset Riwayat
  const handleResetSim = () => {
    saveSubmissions(isDemoModeEnabled ? DEFAULT_THESIS_SUBMISSIONS : []);
    triggerToast("Riwayat pengajuan berhasil direset ke status bawaan.");
  };

  // Quick select simulator update values
  useEffect(() => {
    if (submissions.length > 0) {
      if (!selectedSimId) {
        setSelectedSimId(submissions[0].id);
      }
      const target = submissions.find((s) => s.id === selectedSimId);
      if (target) {
        setSimStatus(target.status);
        setSimNote(target.catatanKoordinator || "");
      }
    }
  }, [selectedSimId, submissions]);

  // File Upload Helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBuktiFileName(e.target.files[0].name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm animate-fade-in border border-slate-800 dark:border-slate-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 stroke-[2.5]" />
          <p className="text-xs font-semibold leading-relaxed">{showNotification}</p>
        </div>
      )}

      {/* ================= MAIN CARD: ONE-PAGE INTEGRATED FORM ================= */}
      <SectionCard title="Formulir Pengajuan Judul & Pembimbing" align="left">
        <div className="space-y-6">
          <div className="border-b border-border/60 pb-3">
            <h3 className="text-base font-bold text-foreground">Pengisian Usulan Judul Tugas Akhir</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Silakan tentukan skema, jenis tugas akhir, judul usulan, beserta usulan dosen pembimbing akademik Anda.
            </p>
          </div>

          {/* Pending Validation Notification Banner */}
          {hasPendingSubmission && (
            <div className="bg-amber-500/[0.08] border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl p-4 flex gap-3 text-xs leading-relaxed animate-fade-in">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 stroke-[2.5]" />
              <div className="space-y-1">
                <p className="font-bold text-amber-700 dark:text-amber-400">Pengajuan Judul Ditangguhkan</p>
                <p className="text-[11px] opacity-90">
                  Anda memiliki satu pengajuan judul aktif yang <strong>sedang dalam proses menunggu validasi</strong> oleh Koordinator. 
                  Sesuai aturan, Anda tidak dapat mengajukan judul baru hingga status pengajuan saat ini berubah menjadi <strong>Ditolak</strong> atau disetujui (<strong>Diterima</strong>).
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* 1. SKEMA SELECTION (INTERACTIVE CARD RADIOS) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Skema Tugas Akhir <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Skema Skripsi Card */}
                <div
                  onClick={() => !hasPendingSubmission && setSkema("Skripsi")}
                  className={cn(
                    "rounded-xl border p-4 flex gap-3.5 items-start transition-all duration-300 select-none",
                    hasPendingSubmission
                      ? "opacity-60 cursor-not-allowed bg-muted/10 border-border/50"
                      : "cursor-pointer hover:bg-muted/30 hover:border-border",
                    skema === "Skripsi" && !hasPendingSubmission
                      ? "bg-primary/[0.02] border-primary ring-2 ring-primary/10 shadow-xs"
                      : "",
                    skema === "Skripsi" && hasPendingSubmission
                      ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                      : ""
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                    skema === "Skripsi"
                      ? hasPendingSubmission ? "border-slate-400 bg-slate-400" : "border-primary bg-primary"
                      : "border-slate-300"
                  )}>
                    {skema === "Skripsi" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="space-y-1">
                    <h5 className={cn("text-xs font-bold transition-colors", skema === "Skripsi" ? "text-primary" : "text-foreground")}>
                      Skema Skripsi
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Jalur riset ilmiah laboratorium, deskriptif, atau eksperimental mandiri yang dibimbing oleh dosen utama.
                    </p>
                  </div>
                </div>

                {/* Skema Non-Skripsi Card */}
                <div
                  onClick={() => !hasPendingSubmission && setSkema("Non Skripsi")}
                  className={cn(
                    "rounded-xl border p-4 flex gap-3.5 items-start transition-all duration-300 select-none",
                    hasPendingSubmission
                      ? "opacity-60 cursor-not-allowed bg-muted/10 border-border/50"
                      : "cursor-pointer hover:bg-muted/30 hover:border-border",
                    skema === "Non Skripsi" && !hasPendingSubmission
                      ? "bg-primary/[0.02] border-primary ring-2 ring-primary/10 shadow-xs"
                      : "",
                    skema === "Non Skripsi" && hasPendingSubmission
                      ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                      : ""
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                    skema === "Non Skripsi"
                      ? hasPendingSubmission ? "border-slate-400 bg-slate-400" : "border-primary bg-primary"
                      : "border-slate-300"
                  )}>
                    {skema === "Non Skripsi" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="space-y-1">
                    <h5 className={cn("text-xs font-bold transition-colors", skema === "Non Skripsi" ? "text-primary" : "text-foreground")}>
                      Skema Non-Skripsi
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Jalur konversi kegiatan MBKM (Magang Industri, KKN Tematik), publikasi ilmiah bereputasi, atau rancang bangun Pharmapreneurship.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. JENIS SKRIPSI (DYNAMICALLY FILTERED RADIOS) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Jenis Tugas Akhir <span className="text-red-500">*</span>
              </label>

              <div className="border rounded-xl p-4 bg-muted/20 border-border/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {thesisTypes
                  .filter((item) => item.skema === (skema === "Skripsi" ? "Skripsi" : "Non Skripsi") && item.status === "Aktif")
                  .map((item) => {
                    const isChecked = jenisTA === item.name;
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg transition select-none text-xs font-medium border border-transparent",
                          hasPendingSubmission
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer hover:bg-muted/50 text-foreground/80",
                          isChecked && !hasPendingSubmission && "bg-card border-border shadow-3xs text-primary font-bold",
                          isChecked && hasPendingSubmission && "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-500 font-bold"
                        )}
                      >
                        <input
                          type="radio"
                          name="jenisTA"
                          value={item.name}
                          checked={isChecked}
                          disabled={hasPendingSubmission}
                          onChange={(e) => setJenisTA(e.target.value)}
                          className="accent-primary w-3.5 h-3.5 shrink-0"
                        />
                        {item.name}
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {/* 3. JUDUL TUGAS AKHIR */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Judul Tugas Akhir / Judul Kegiatan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={judulTA}
                  disabled={hasPendingSubmission}
                  onChange={(e) => setJudulTA(e.target.value)}
                  placeholder={skema === "Skripsi" 
                    ? "Contoh: Formulasi dan Uji Aktivitas Antibakteri Sediaan Gel Ekstrak Etanol Daun Kemangi..." 
                    : "Contoh: Laporan Kegiatan Magang MBKM Bagian Quality Assurance di PT Bio Farma..."
                  }
                  required
                  className={cn(
                    "w-full text-xs border rounded-xl px-3 py-2.5 text-foreground bg-background transition",
                    hasPendingSubmission
                      ? "bg-muted text-muted-foreground/75 cursor-not-allowed border-dashed border-border/80"
                      : "border-border focus:border-primary/50 focus:ring-1 focus:ring-primary"
                  )}
                />
              </div>

              {/* 4. DESKRIPSI TUGAS AKHIR */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Deskripsi / Rangkuman Rencana Penelitian <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={deskripsiTA}
                  disabled={hasPendingSubmission}
                  onChange={(e) => setDeskripsiTA(e.target.value)}
                  placeholder="Deskripsikan latar belakang singkat, tujuan, metodologi penelitian, atau kegiatan konversi MBKM yang akan dilakukan..."
                  required
                  className={cn(
                    "w-full text-xs border rounded-xl px-3 py-2.5 text-foreground bg-background transition",
                    hasPendingSubmission
                      ? "bg-muted text-muted-foreground/75 cursor-not-allowed border-dashed border-border/80"
                      : "border-border focus:border-primary/50 focus:ring-1 focus:ring-primary"
                  )}
                />
              </div>
            </div>

            {/* 5. USULAN DOSEN PEMBIMBING */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Usulan Dewan Pembimbing
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pembimbing 1 */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Usulan Pembimbing 1 <span className="text-red-500">*</span></span>
                  <select
                    value={pembimbing1}
                    onChange={(e) => setPembimbing1(e.target.value)}
                    required
                    disabled={hasPendingSubmission}
                    className={cn(
                      "w-full text-xs border rounded-xl px-3 py-2.5 bg-background text-foreground transition",
                      hasPendingSubmission
                        ? "bg-muted text-muted-foreground/75 cursor-not-allowed border-dashed border-border/80"
                        : "focus:ring-1 focus:ring-primary focus:border-primary/50"
                    )}
                  >
                    <option value="">-- Pilih Usulan Pembimbing 1 --</option>
                    {lecturers.map((dosen) => (
                      <option key={dosen.id} value={dosen.name}>
                        {dosen.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pembimbing 2 */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Pembimbing 2</span>
                  <input
                    type="text"
                    disabled
                    value="Ditentukan Koordinator"
                    className="w-full text-xs border rounded-xl px-3 py-2.5 bg-muted text-muted-foreground/80 cursor-not-allowed border-dashed"
                  />
                </div>
              </div>
            </div>

            {/* 6. UPLOAD BUKTI KWITANSI */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Bukti Kwitansi Registrasi / Pendaftaran <span className="text-red-500">*</span>
              </label>

              <div className={cn(
                "border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-center bg-muted/10 transition relative",
                hasPendingSubmission
                  ? "opacity-60 bg-muted/5 cursor-not-allowed pointer-events-none"
                  : "hover:bg-muted/20 cursor-pointer"
              )}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={hasPendingSubmission}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-primary/70 mb-2" />
                <h6 className="text-xs font-bold text-foreground">
                  {buktiFileName ? `File Terpilih: ${buktiFileName}` : "Pilih File Bukti Pembayaran"}
                </h6>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-xs">
                  Format: PDF, JPG, PNG (Maks 5MB). File ini digunakan untuk mencocokkan validasi awal tata usaha fakultas.
                </p>
              </div>
            </div>

            {/* ACTION BUTTON SUBMIT */}
            <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {hasPendingSubmission && (
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 animate-pulse-slow">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Selesaikan/tunggu proses validasi usulan aktif sebelum mengajukan kembali.
                </p>
              )}
              <button
                type="submit"
                disabled={hasPendingSubmission}
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold shadow-md transition text-xs select-none",
                  hasPendingSubmission
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-dashed border-slate-300 dark:border-slate-700"
                    : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg cursor-pointer"
                )}
              >
                {hasPendingSubmission ? (
                  <>
                    <Lock className="w-4 h-4" /> Pengajuan Terkunci
                  </>
                ) : (
                  <>
                    Kirim Pengajuan Judul <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </SectionCard>

      {/* ================= BOTTOM SECTION: HISTORI / RIWAYAT PENGAJUAN JUDUL ================= */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="border-b border-border/60 pb-3 flex justify-between items-center">
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <BookOpen className="w-4.5 h-4.5 text-primary" /> Riwayat Pengajuan Judul
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Daftar judul tugas akhir yang pernah Anda ajukan sebelumnya</p>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
            {submissions.length} Total Pengajuan
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="py-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
            <BookOpen className="w-9 h-9 text-slate-300 dark:text-slate-700 mb-2" />
            <h6 className="text-xs font-bold text-slate-500">Belum Ada Riwayat Pengajuan</h6>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Anda belum melakukan pengajuan judul tugas akhir. Isi formulir di atas untuk mengirimkan pengajuan pertama Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const isApproved = sub.status === "Diterima";
              const isPending = sub.status === "Sedang Proses Validasi";
              const isRejected = sub.status === "Ditolak";
              const isExpanded = expandedSubId === sub.id;

              return (
                <div
                  key={sub.id}
                  className={cn(
                    "border rounded-xl transition-all duration-300 relative overflow-hidden",
                    isApproved && "bg-emerald-500/[0.01] border-emerald-500/10 hover:border-emerald-500/25",
                    isPending && "bg-amber-500/[0.01] border-amber-500/10 hover:border-amber-500/25",
                    isRejected && "bg-red-500/[0.01] border-red-500/20 hover:border-red-500/35",
                    isExpanded && "shadow-3xs ring-1 ring-primary/10 border-border/80"
                  )}
                >
                  {/* Status Indicator Bar Left */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                    isApproved && "bg-emerald-500",
                    isPending && "bg-amber-500",
                    isRejected && "bg-red-500"
                  )} />

                  {/* Collapsible Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                    className="w-full text-left pl-4.5 pr-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer focus:outline-none select-none"
                  >
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded select-none border",
                          isApproved && "bg-emerald-500/10 border-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                          isPending && "bg-amber-500/10 border-amber-500/10 text-amber-700 dark:text-amber-400",
                          isRejected && "bg-red-500/10 border-red-500/10 text-red-700 dark:text-red-400"
                        )}>
                          {sub.skema} — {sub.jenisTA}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-foreground leading-relaxed">
                        {sub.judulTA}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> Diterima
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400">
                            <Clock className="w-3 h-3" /> Menunggu Validasi
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400">
                            <XCircle className="w-3 h-3" /> Ditolak
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center transition-transform duration-200 text-muted-foreground",
                        isExpanded && "rotate-90"
                      )}>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-4.5 pb-4.5 pt-1 border-t border-border/40 pl-5.5 space-y-4 bg-muted/[0.01] animate-slide-down">
                      
                      {/* 1. Rangkuman/Deskripsi Rencana Penelitian */}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Deskripsi / Rangkuman Rencana Penelitian</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/25 rounded-xl p-3 border border-border/40 font-medium">
                          {sub.deskripsiTA}
                        </p>
                      </div>

                      {/* 2. Rekomendasi/Usulan Dewan Pembimbing */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Rekomendasi Dosen Pendamping</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                          <div className="flex items-center gap-2.5 text-foreground bg-card border border-border/60 rounded-xl p-2.5">
                            <UserCheck className="w-4.5 h-4.5 text-primary shrink-0" />
                            <div>
                              <span className="text-[9px] text-muted-foreground block font-semibold leading-none mb-0.5">Pembimbing Utama (1)</span>
                              <strong>{sub.pembimbing1}</strong>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 text-foreground bg-card border border-border/60 rounded-xl p-2.5">
                            <UserCheck className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                            <div>
                              <span className="text-[9px] text-muted-foreground block font-semibold leading-none mb-0.5">Pembimbing Pendamping (2)</span>
                              <strong className="text-muted-foreground">{sub.pembimbing2}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Informasi Tambahan Lainnya */}
                      <div className="space-y-2.5 pt-2 border-t border-border/40">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Informasi Tambahan Lainnya</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-2 font-medium">
                            <Clock className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                            <span>Tanggal Diajukan: <strong className="text-foreground/80">{sub.date}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 font-medium">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>Dokumen Lampiran: <strong className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{sub.buktiFile}</strong></span>
                          </div>
                        </div>

                        {/* Rejection comment */}
                        {isRejected && sub.catatanKoordinator && (
                          <div className="bg-red-500/[0.03] border border-red-500/20 rounded-xl p-3 text-[11px] text-red-700 dark:text-red-300 leading-relaxed flex items-start gap-2.5 mt-2 animate-slide-down">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold mb-0.5 text-red-800 dark:text-red-400">Catatan Koordinator / Alasan Penolakan:</strong>
                              {sub.catatanKoordinator}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= SIMULATOR FOR COORDINATOR VALIDATION ================= */}
      {isDemoModeEnabled && (
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/80 rounded-2xl p-5 shadow-xs">
        <div className="flex justify-between items-center border-b border-border/40 pb-3 mb-4 flex-wrap gap-2">
          <h6 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" /> Panel Simulasi Koordinator / Dosen (Demo Control)
          </h6>
          <button
            onClick={handleResetSim}
            className="py-1.5 px-3 border border-border hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition flex items-center gap-1 shadow-3xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Riwayat Simulasi
          </button>
        </div>

        {submissions.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-2">
            Silakan submit formulir di atas terlebih dahulu untuk memunculkan opsi simulasi.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Target Submission Selector */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Pilih Pengajuan untuk divalidasi</label>
              <select
                value={selectedSimId}
                onChange={(e) => setSelectedSimId(e.target.value)}
                className="w-full text-xs border rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-primary bg-background text-foreground"
              >
                {submissions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    ({sub.date}) {sub.judulTA.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Status Selector */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Set Status Validasi</label>
              <select
                value={simStatus}
                onChange={(e) => setSimStatus(e.target.value as ThesisSubmission["status"])}
                className="w-full text-xs border rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-primary bg-background text-foreground"
              >
                <option value="Diterima">Setujui (Diterima)</option>
                <option value="Sedang Proses Validasi">Sedang Proses Validasi</option>
                <option value="Ditolak">Tolak (Ditolak)</option>
              </select>
            </div>

            {/* Action */}
            <div className="md:col-span-4">
              <button
                onClick={handleUpdateStatusSim}
                className="w-full py-2 px-3 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold rounded-lg transition shadow-2xs"
              >
                Simulasikan Validasi Koordinator
              </button>
            </div>

            {/* Notes Input (For Rejections) */}
            {simStatus === "Ditolak" && (
              <div className="md:col-span-12 space-y-1.5 mt-2 animate-slide-down">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Alasan Penolakan (Catatan Koordinator)</label>
                <textarea
                  value={simNote}
                  onChange={(e) => setSimNote(e.target.value)}
                  placeholder="Ketik alasan penolakan judul dan instruksi revisi yang spesifik untuk mahasiswa..."
                  rows={2}
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-primary bg-background text-foreground"
                />
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default FormPendaftaranSection;
