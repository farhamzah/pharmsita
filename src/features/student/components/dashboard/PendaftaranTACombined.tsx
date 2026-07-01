import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Link,
  UploadCloud,
  ExternalLink,
  FileText,
  Check,
  Sliders,
  XCircle,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  BookOpen,
  Clock,
  UserCheck,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { mockJenisTA } from "../../../../mock-data/thesis-types";
import {
  adminApi,
  finalProjectRegistrationApi,
  studentWorkflowApi,
  type FinalProjectRegistration,
} from "../../../../core/api/domain";
import {
  DEFAULT_INITIAL_REQUIREMENTS,
  DEFAULT_THESIS_SUBMISSIONS,
  type RequirementItem,
  type ThesisSubmission,
} from "../../services/student-workflow-service";

type ThesisTypeOption = {
  id: string;
  name: string;
  skema: "Skripsi" | "Non Skripsi";
  desc?: string;
  status: "Aktif" | "Nonaktif";
};

type LecturerOption = {
  id: string;
  name: string;
  identifier: string;
  role?: string;
  status: "Aktif" | "Nonaktif";
};

const demoThesisTypes = isDemoModeEnabled
  ? (mockJenisTA as ThesisTypeOption[])
  : [];
const demoLecturers: LecturerOption[] = [];

const formatRegistrationDate = (value?: string | null) => {
  if (!value) {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const mapRegistrationToSubmission = (
  registration: FinalProjectRegistration
): ThesisSubmission | null => {
  if (registration.status === "Draft") {
    return null;
  }

  const supervisor2 = registration.supervisorAssignments.find(
    (assignment) => assignment.supervisorOrder === 2
  );

  return {
    id: registration.id,
    date: formatRegistrationDate(
      registration.submittedAt || registration.createdAt || registration.updatedAt
    ),
    skema: registration.skema || "Skripsi",
    jenisTA: registration.thesisTypeName || "-",
    judulTA: registration.judulTA || "Judul belum diisi",
    deskripsiTA: registration.deskripsiTA || "Deskripsi belum diisi",
    pembimbing1:
      registration.requestedSupervisor1Name ||
      registration.supervisorAssignments.find(
        (assignment) => assignment.supervisorOrder === 1
      )?.lecturerName ||
      "-",
    pembimbing2: supervisor2?.lecturerName || "Ditentukan Koordinator",
    status:
      registration.status === "Disetujui"
        ? "Diterima"
        : registration.status === "Ditolak"
          ? "Ditolak"
          : "Sedang Proses Validasi",
    catatanKoordinator: registration.coordinatorNote,
    buktiFile:
      registration.paymentProofFileRef ||
      registration.paymentProofLink ||
      "kwitansi_pembayaran_ta.pdf",
  };
};

export const PendaftaranTACombined: React.FC = () => {
  // Stepper / View control
  const [showForm, setShowForm] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Requirements State
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [driveLink, setDriveLink] = useState<string>("");

  // Submissions State
  const [submissions, setSubmissions] = useState<ThesisSubmission[]>([]);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Form State
  const [driveLinkInput, setDriveLinkInput] = useState<string>("");
  const [skema, setSkema] = useState<"Skripsi" | "Non Skripsi">("Skripsi");
  const [thesisTypes, setThesisTypes] = useState<ThesisTypeOption[]>(demoThesisTypes);
  const [thesisTypeId, setThesisTypeId] = useState<string>("");
  const [jenisTA, setJenisTA] = useState<string>("");
  const [judulTA, setJudulTA] = useState<string>("");
  const [deskripsiTA, setDeskripsiTA] = useState<string>("");
  const [lecturers, setLecturers] = useState<LecturerOption[]>(demoLecturers);
  const [pembimbing1Id, setPembimbing1Id] = useState<string>("");
  const [pembimbing1, setPembimbing1] = useState<string>("");
  const [buktiFileName, setBuktiFileName] = useState<string>("");

  // Simulator State - Requirements
  const [selectedSimulatorReq, setSelectedSimulatorReq] = useState<string>("req_a3");
  const [simulatorStatus, setSimulatorStatus] = useState<RequirementItem["status"]>("Valid");
  const [simulatorNote, setSimulatorNote] = useState<string>("");
  const [showSimulator, setShowSimulator] = useState(false);

  // Simulator State - Submissions
  const [selectedSimId, setSelectedSimId] = useState<string>("");
  const [simStatus, setSimStatus] = useState<ThesisSubmission["status"]>("Diterima");
  const [simNote, setSimNote] = useState<string>("");

  // Load state on mount
  useEffect(() => {
    let mounted = true;

    Promise.all([
      studentWorkflowApi
        .getInitialRequirements()
        .catch(() => ({ data: null })),
      finalProjectRegistrationApi
        .getMine()
        .catch(() => ({ data: null })),
      adminApi
        .listPublicThesisTypes()
        .catch(() => ({ data: demoThesisTypes })),
      adminApi
        .listPublicLecturers()
        .catch(() => ({ data: demoLecturers })),
    ])
      .then(([reqResponse, registrationResponse, thesisTypesResponse, lecturersResponse]) => {
        if (!mounted) return;

        const registration = registrationResponse.data;
        const registrationSubmission = registration
          ? mapRegistrationToSubmission(registration)
          : null;
        const activeDriveLink =
          registration?.requirementDriveLink || reqResponse.data?.driveLink || "";

        setRequirements(
          reqResponse.data?.requirements ||
          (isDemoModeEnabled ? DEFAULT_INITIAL_REQUIREMENTS : [])
        );
        setDriveLink(activeDriveLink);
        setDriveLinkInput(activeDriveLink);
        setSubmissions(registrationSubmission ? [registrationSubmission] : []);
        setThesisTypes(thesisTypesResponse.data as ThesisTypeOption[]);
        setLecturers((lecturersResponse.data as LecturerOption[]).filter(
          (lecturer) => lecturer.status === "Aktif"
        ));
      })
      .catch(() => {
        if (!mounted) return;

        setRequirements(isDemoModeEnabled ? DEFAULT_INITIAL_REQUIREMENTS : []);
        setDriveLink("");
        setDriveLinkInput("");
        setSubmissions(isDemoModeEnabled ? DEFAULT_THESIS_SUBMISSIONS : []);
        setThesisTypes(demoThesisTypes);
        setLecturers(demoLecturers);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const persistInitialRequirements = (updatedReqs: RequirementItem[], link: string) => {
    studentWorkflowApi
      .saveInitialRequirements({ requirements: updatedReqs, driveLink: link })
      .catch(() => undefined);
  };

  const persistThesisSubmissions = (updatedSubmissions: ThesisSubmission[]) => {
    studentWorkflowApi
      .replaceThesisSubmissions(updatedSubmissions)
      .catch(() => undefined);
  };

  // Set default jenisTA based on active master data and skema.
  useEffect(() => {
    const filteredTypes = thesisTypes.filter(
      (item) => item.skema === skema && item.status === "Aktif"
    );

    if (filteredTypes.some((item) => item.id === thesisTypeId)) {
      return;
    }

    const nextType = filteredTypes[0];
    setThesisTypeId(nextType?.id || "");
    setJenisTA(nextType?.name || "");
  }, [skema, thesisTypeId, thesisTypes]);

  // Set default pembimbing based on active lecturer directory.
  useEffect(() => {
    if (lecturers.some((lecturer) => lecturer.id === pembimbing1Id)) {
      return;
    }

    const nextLecturer = lecturers[0];
    setPembimbing1Id(nextLecturer?.id || "");
    setPembimbing1(nextLecturer?.name || "");
  }, [lecturers, pembimbing1Id]);

  // Quick select simulator update values
  useEffect(() => {
    const target = requirements.find((r) => r.id === selectedSimulatorReq);
    if (target) {
      setSimulatorStatus(target.status);
      setSimulatorNote(target.catatanKoordinator || "");
    }
  }, [selectedSimulatorReq, requirements]);

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

  // Rules: only one active final project registration can be processed.
  const lockedSubmission = submissions.find((sub) => sub.status !== "Ditolak");
  const hasLockedSubmission = Boolean(lockedSubmission);

  const triggerToast = (message: string) => {
    setShowNotification(message);
    setTimeout(() => {
      setShowNotification(null);
    }, 4500);
  };

  // Submit Pendaftaran TA (Combined Form)
  const handleCombinedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasLockedSubmission) {
      alert(
        lockedSubmission?.status === "Diterima"
          ? "Pendaftaran TA Anda sudah disetujui dan tidak bisa diajukan ulang."
          : "Anda tidak dapat mengajukan pendaftaran baru karena ada pengajuan yang sedang menunggu validasi."
      );
      return;
    }

    if (!driveLinkInput.trim()) {
      alert("Tolong masukkan link Google Drive yang valid.");
      return;
    }

    if (!driveLinkInput.includes("drive.google.com")) {
      if (!confirm("Link yang Anda masukkan mungkin bukan link Google Drive. Apakah Anda ingin melanjutkan?")) {
        return;
      }
    }

    if (!thesisTypeId || !jenisTA || !judulTA.trim() || !deskripsiTA.trim() || !pembimbing1Id || !pembimbing1) {
      alert("Mohon lengkapi seluruh kolom formulir pengajuan judul.");
      return;
    }

    const currentDriveLink = driveLinkInput.trim();
    setDriveLink(currentDriveLink);

    // 1. Update Requirements to 'Menunggu Verifikasi'
    const updatedRequirements = requirements.map((req) => {
      if (req.status === "Belum Upload" || req.status === "Perlu Revisi") {
        return {
          ...req,
          status: "Menunggu Verifikasi" as const,
          catatanKoordinator: undefined,
        };
      }
      return req;
    });
    setRequirements(updatedRequirements);
    persistInitialRequirements(updatedRequirements, currentDriveLink);

    try {
      const response = await finalProjectRegistrationApi.saveMine({
        requirementDriveLink: currentDriveLink,
        paymentProofFileRef: buktiFileName || "kwitansi_pembayaran_ta.pdf",
        skema,
        thesisTypeId,
        thesisTypeName: jenisTA,
        judulTA: judulTA.trim(),
        deskripsiTA: deskripsiTA.trim(),
        requestedSupervisor1Id: pembimbing1Id,
        requestedSupervisor1Name: pembimbing1,
        submit: true,
      });
      const newSubmission = mapRegistrationToSubmission(response.data);

      if (newSubmission) {
        const updatedSubmissions = [
          newSubmission,
          ...submissions.filter((submission) => submission.id !== newSubmission.id),
        ];
        setSubmissions(updatedSubmissions);
        persistThesisSubmissions(updatedSubmissions);
        setSelectedSimId(newSubmission.id);
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Pendaftaran TA belum berhasil dikirim. Silakan coba lagi."
      );
      return;
    }

    // Clear form
    setJudulTA("");
    setDeskripsiTA("");
    setPembimbing1Id("");
    setPembimbing1("");
    setBuktiFileName("");
    setShowForm(false);

    triggerToast("Pendaftaran TA berhasil diajukan! Berkas persyaratan dan usulan judul Anda kini Menunggu Validasi.");
  };

  // Requirement overall validation status
  const getOverallStatus = () => {
    const allValid = requirements.every((r) => r.status === "Valid");
    if (allValid) {
      return {
        label: "Valid",
        color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        desc: "Selamat! Seluruh berkas Persyaratan Awal Anda dinyatakan Valid.",
      };
    }
    return {
      label: "Belum Valid",
      color: "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40",
      icon: <XCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />,
      desc: "Beberapa berkas persyaratan Anda belum divalidasi atau belum lengkap.",
    };
  };

  const overall = getOverallStatus();
  const totalCount = requirements.length;
  const validCount = requirements.filter((r) => r.status === "Valid").length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((validCount / totalCount) * 100);

  // Simulator requirements check update
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
    persistInitialRequirements(updated, driveLink);
    triggerToast(`Simulasi berhasil! Berkas persyaratan diperbarui.`);
  };

  const handleApproveAllSim = () => {
    const updated = requirements.map((req) => ({
      ...req,
      status: "Valid" as const,
      catatanKoordinator: undefined,
    }));
    setRequirements(updated);
    const newLink = driveLink || "https://drive.google.com/drive/folders/simulated-approved-folder";
    setDriveLink(newLink);
    setDriveLinkInput(newLink);
    persistInitialRequirements(updated, newLink);
    triggerToast("Simulasi berhasil! Semua berkas persyaratan dinyatakan Valid.");
  };

  const handleResetReqSim = () => {
    const resetRequirements = isDemoModeEnabled ? DEFAULT_INITIAL_REQUIREMENTS : [];
    setRequirements(resetRequirements);
    setDriveLink("");
    setDriveLinkInput("");
    persistInitialRequirements(resetRequirements, "");
    triggerToast("Progres persyaratan direset.");
  };

  // Simulator submissions status update
  const handleUpdateSubStatusSim = () => {
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
    setSubmissions(updated);
    persistThesisSubmissions(updated);
    triggerToast(`Simulasi berhasil! Status pengajuan judul diperbarui.`);
  };

  const handleResetSubSim = () => {
    const resetSubmissions = isDemoModeEnabled ? DEFAULT_THESIS_SUBMISSIONS : [];
    setSubmissions(resetSubmissions);
    persistThesisSubmissions(resetSubmissions);
    triggerToast("Riwayat pengajuan direset.");
  };

  // File Upload kwitansi
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
          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[3]" />
          <p className="text-xs font-semibold leading-relaxed">{showNotification}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INITIAL MAIN VIEW: STEPS & HISTORY */}
      {/* ========================================================================= */}
      {!showForm ? (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className={cn("border rounded-2xl p-5 shadow-xs transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4", overall.color)}>
            <div className="flex gap-4 items-center">
              <div className="p-2 rounded-xl bg-background/60 backdrop-blur-xs shadow-xs shrink-0">
                {overall.icon}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Status Validasi Pendaftaran TA
                </h4>
                <p className="text-xs text-muted-foreground max-w-2xl font-medium">
                  {overall.desc}
                </p>
              </div>
            </div>
            <span className={cn(
              "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize",
              requirements.every((r) => r.status === "Valid")
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                : "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
            )}>
              {overall.label}
            </span>
          </div>

          {/* Checklist & Statistics Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Google Drive Link (If submitted) */}
            <div className="md:col-span-6 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Link className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Folder Berkas Persyaratan</h4>
                    <p className="text-[10px] text-muted-foreground">Lokasi pengunggahan berkas pendaftaran</p>
                  </div>
                </div>

                {driveLink ? (
                  <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 space-y-3 mt-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Link Folder Aktif</span>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate hover:underline leading-relaxed mt-0.5">
                          <a href={driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                            {driveLink} <ExternalLink className="w-3 h-3" />
                          </a>
                        </p>
                      </div>
                    </div>
                    <a
                      href={driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Buka Folder <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="bg-muted/20 border border-dashed rounded-xl p-6 text-center text-muted-foreground text-xs select-none">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    Belum ada folder Google Drive yang dikirimkan.
                  </div>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-600 dark:text-amber-400 dark:bg-amber-950/20 mt-4 flex items-start gap-2 select-none">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <p className="font-medium">
                  <strong>Akses Folder:</strong> Pastikan status berbagi folder diset ke <strong>"Siapa saja yang memiliki link dapat melihat" (Viewer)</strong>.
                </p>
              </div>
            </div>

            {/* Right: Requirements Progress Graph */}
            <div className="md:col-span-6 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Progres Validasi</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Persentase dokumen yang valid</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20 rounded-xl px-3 py-1.5 text-right shrink-0">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold block select-none">Berkas Valid</span>
                    <span className="text-xs font-bold font-mono">
                      {validCount} / {totalCount}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Pemenuhan Persyaratan</span>
                    <span className="text-primary font-bold font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-muted dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-muted/20 border border-border/60 rounded-xl p-3.5 space-y-2 mt-4">
                <div className="flex justify-between text-[11px] font-medium border-b border-border/40 pb-1.5 select-none">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Valid
                  </span>
                  <span className="font-semibold text-foreground">{validCount} berkas</span>
                </div>
                <div className="flex justify-between text-[11px] font-medium select-none">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> Belum Valid / Proses
                  </span>
                  <span className="font-semibold text-foreground">{totalCount - validCount} berkas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist Details */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-border/60 pb-3 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 select-none">
                  <FileCheck className="w-4.5 h-4.5 text-primary shrink-0" /> Daftar Persyaratan Pendaftaran TA
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Seluruh kriteria kelayakan untuk mengajukan Tugas Akhir</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded-full font-mono text-muted-foreground select-none">
                {totalCount} Total Persyaratan
              </span>
            </div>

            <div className="space-y-2.5">
              {requirements.map((req) => {
                const isValid = req.status === "Valid";
                const isPending = req.status === "Menunggu Verifikasi";
                const isRevision = req.status === "Perlu Revisi";
                const isUnsubmitted = req.status === "Belum Upload";
                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/10 transition-all duration-200 min-h-[56px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center transition-all select-none shrink-0",
                          isValid
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground/45 border border-border"
                        )}
                      >
                        {isValid ? <Check className="w-3 h-3 stroke-[3px]" /> : <span className="text-[9px] font-bold">✕</span>}
                      </div>
                      <p className={cn(
                        "text-xs font-medium transition-all text-left leading-relaxed",
                        isValid ? "text-muted-foreground line-through font-normal" : "text-foreground font-semibold"
                      )}>
                        {req.label}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize",
                      isValid && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
                      isPending && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20",
                      isRevision && "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 dark:bg-red-950/20",
                      isUnsubmitted && "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
                    )}>
                      {req.status === "Valid" ? "Valid" : req.status === "Menunggu Verifikasi" ? "Menunggu Validasi" : req.status === "Perlu Revisi" ? "Revisi" : "Belum Upload"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Coordinator note if any requirement needs revision */}
            {(() => {
              const stageNote = requirements.find(r => r.catatanKoordinator)?.catatanKoordinator;
              if (!stageNote) return null;
              return (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-1.5 animate-in slide-in-from-bottom-2 duration-200">
                  <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 select-none">
                    <AlertTriangle className="w-3.5 h-3.5" /> Catatan Koreksi Berkas Koordinator:
                  </span>
                  <p className="text-muted-foreground leading-relaxed font-medium">{stageNote}</p>
                </div>
              );
            })()}
          </div>

          {/* ========================================================================= */}
          {/* "AJUKAN PENDAFTARAN" DYNAMIC CTA BOX */}
          {/* ========================================================================= */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Ajukan Pendaftaran</h4>
              <p className="text-xs text-muted-foreground">Kirimkan usulan judul Tugas Akhir dan tautan folder persyaratan awal Anda.</p>
            </div>
            <div className="shrink-0">
              {hasLockedSubmission ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20 rounded-xl p-3 flex gap-2 text-[10px] leading-relaxed max-w-sm select-none">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="font-medium">
                    <strong>Pendaftaran Terkunci:</strong> Pengajuan Anda sedang aktif atau sudah disetujui.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                >
                  Ajukan Pendaftaran <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIWAYAT PENGAJUAN PENDAFTARAN TA */}
          {/* ========================================================================= */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-border/60 pb-3 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-4.5 h-4.5 text-primary" /> Riwayat Pengajuan Pendaftaran TA
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Daftar riwayat judul Tugas Akhir yang telah Anda ajukan</p>
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
                  Anda belum mengajukan pendaftaran tugas akhir. Klik tombol 'Ajukan Pendaftaran' di atas untuk memulai.
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
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                        isApproved && "bg-emerald-500",
                        isPending && "bg-amber-500",
                        isRejected && "bg-red-500"
                      )} />

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

                      {isExpanded && (
                        <div className="px-4.5 pb-4.5 pt-1 border-t border-border/40 pl-5.5 space-y-4 bg-muted/[0.01] animate-slide-down">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Deskripsi / Rangkuman Rencana Penelitian</span>
                            <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/25 rounded-xl p-3 border border-border/40 font-medium">
                              {sub.deskripsiTA}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Dewan Pembimbing Akademik</span>
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

                          <div className="space-y-2.5 pt-2 border-t border-border/40">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Informasi Tambahan Lainnya</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-2 font-medium">
                                <Clock className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                <span>Tanggal Diajukan: <strong className="text-foreground/80">{sub.date}</strong></span>
                              </div>
                              <div className="flex items-center gap-2 font-medium">
                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                <span>Bukti Kwitansi: <strong className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{sub.buktiFile}</strong></span>
                              </div>
                            </div>

                            {isRejected && sub.catatanKoordinator && (
                              <div className="bg-red-500/[0.03] border border-red-500/20 rounded-xl p-3 text-[11px] text-red-700 dark:text-red-300 leading-relaxed flex items-start gap-2.5 mt-2 animate-slide-down">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="block font-bold mb-0.5 text-red-800 dark:text-red-400">Catatan Koordinator / Alasan Penolakan Judul:</strong>
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
        </div>
      ) : (
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-6">
          {/* Form Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Formulir Pengajuan Pendaftaran TA</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Lengkapi folder persyaratan Google Drive dan usulkan detail judul Tugas Akhir Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </button>
          </div>

          <form onSubmit={handleCombinedSubmit} className="space-y-5">
            {/* 1. INPUT LINK PERSYARATAN (GOOGLE DRIVE) */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-foreground block">
                Link Google Drive Berkas Persyaratan <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={driveLinkInput}
                onChange={(e) => setDriveLinkInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                required
                className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-foreground bg-background transition"
              />
              <span className="text-[10px] text-muted-foreground/75 block">
                Buat folder Google Drive, upload berkas persyaratan awal Anda, dan tempel link folder di sini.
              </span>
            </div>

            {/* 2. SKEMA SELECTION */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-foreground block">
                Skema Tugas Akhir <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setSkema("Skripsi")}
                  className={cn(
                    "rounded-xl border p-4 flex gap-3.5 items-start cursor-pointer hover:bg-muted/30 hover:border-border transition-all duration-300 select-none",
                    skema === "Skripsi" && "bg-primary/[0.02] border-primary ring-1 ring-primary/10 shadow-xs"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                    skema === "Skripsi" ? "border-primary bg-primary" : "border-slate-350"
                  )}>
                    {skema === "Skripsi" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="space-y-1">
                    <h5 className={cn("text-xs font-semibold transition-colors", skema === "Skripsi" ? "text-primary" : "text-foreground")}>
                      Skema Skripsi
                    </h5>
                    <p className="text-[10px] text-muted-foreground/75 leading-relaxed">
                      Jalur riset ilmiah laboratorium, deskriptif, atau eksperimental mandiri yang dibimbing oleh dosen utama.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setSkema("Non Skripsi")}
                  className={cn(
                    "rounded-xl border p-4 flex gap-3.5 items-start cursor-pointer hover:bg-muted/30 hover:border-border transition-all duration-300 select-none",
                    skema === "Non Skripsi" && "bg-primary/[0.02] border-primary ring-1 ring-primary/10 shadow-xs"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                    skema === "Non Skripsi" ? "border-primary bg-primary" : "border-slate-350"
                  )}>
                    {skema === "Non Skripsi" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="space-y-1">
                    <h5 className={cn("text-xs font-semibold transition-colors", skema === "Non Skripsi" ? "text-primary" : "text-foreground")}>
                      Skema Non-Skripsi
                    </h5>
                    <p className="text-[10px] text-muted-foreground/75 leading-relaxed">
                      Jalur konversi MBKM (Magang Industri, KKN Tematik), publikasi ilmiah bereputasi, atau rancang bangun Pharmapreneurship.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. JENIS TAHAPAN */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-foreground block">
                Jenis Tugas Akhir <span className="text-red-500">*</span>
              </label>
              <div className="border border-border rounded-xl p-3 bg-muted/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {thesisTypes
                  .filter((item) => item.skema === (skema === "Skripsi" ? "Skripsi" : "Non Skripsi") && item.status === "Aktif")
                  .map((item) => {
                    const isChecked = thesisTypeId === item.id;
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg transition select-none text-xs font-medium border border-transparent cursor-pointer hover:bg-muted/50 text-foreground/80",
                          isChecked && "bg-card border-border shadow-3xs text-primary font-bold"
                        )}
                      >
                        <input
                          type="radio"
                          name="jenisTA"
                          value={item.id}
                          checked={isChecked}
                          onChange={() => {
                            setThesisTypeId(item.id);
                            setJenisTA(item.name);
                          }}
                          className="accent-primary w-3.5 h-3.5 shrink-0"
                        />
                        {item.name}
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* 4. DETAILS (JUDUL & DESKRIPSI) */}
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-foreground block">
                  Judul Tugas Akhir <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={judulTA}
                  onChange={(e) => setJudulTA(e.target.value)}
                  placeholder={skema === "Skripsi"
                    ? "Contoh: Formulasi dan Uji Aktivitas Antibakteri Sediaan Gel Ekstrak Etanol Daun Kemangi..."
                    : "Contoh: Laporan Kegiatan Magang MBKM Bagian Quality Assurance di PT Bio Farma..."
                  }
                  required
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-foreground bg-background transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-foreground block">
                  Rangkuman Rencana Penelitian <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={deskripsiTA}
                  onChange={(e) => setDeskripsiTA(e.target.value)}
                  placeholder="Jelaskan secara singkat latar belakang, tujuan, metode penelitian yang akan dilakukan..."
                  required
                  className="w-full text-xs border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-foreground bg-background transition"
                />
              </div>
            </div>

            {/* 5. PEMBIMBING */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-foreground block">
                Usulan Dewan Pembimbing
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Usulan Pembimbing 1 <span className="text-red-500">*</span></span>
                  <select
                    value={pembimbing1Id}
                    onChange={(e) => {
                      const lecturer = lecturers.find((item) => item.id === e.target.value);
                      setPembimbing1Id(lecturer?.id || "");
                      setPembimbing1(lecturer?.name || "");
                    }}
                    required
                    className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground transition focus:ring-1 focus:ring-primary focus:border-primary/50"
                  >
                    <option value="">-- Pilih Usulan Pembimbing 1 --</option>
                    {lecturers.map((dosen) => (
                      <option key={dosen.id} value={dosen.id}>
                        {dosen.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Pembimbing 2</span>
                  <input
                    type="text"
                    disabled
                    value="Ditentukan Koordinator"
                    className="w-full text-xs border border-dashed rounded-xl px-3 py-2 bg-muted text-muted-foreground/80 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* 6. UPLOAD BUKTI */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-foreground block">
                Bukti Kwitansi Registrasi <span className="text-red-500">*</span>
              </label>
              <div className="border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-center bg-muted/10 transition relative hover:bg-muted/20 cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-primary/70 mb-2" />
                <h6 className="text-xs font-semibold text-foreground">
                  {buktiFileName ? `Terpilih: ${buktiFileName}` : "Pilih File Bukti Pembayaran"}
                </h6>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-xs font-medium">
                  Format: PDF, JPG, PNG (Maks 5MB)
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Kirim Pendaftaran TA <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIMULATOR: REQUIREMENTS & SUBMISSIONS (HIDDEN IN COORDINATOR/LECTURER VIEW) */}
      {/* ========================================================================= */}
      {isDemoModeEnabled && (
      <div className="bg-muted/15 border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="w-full flex items-center justify-between text-foreground/80 hover:text-foreground cursor-pointer transition select-none"
        >
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 select-none">
            <Sliders className="w-3.5 h-3.5 text-primary" /> Panel Simulasi Koordinator / Admin
          </span>
          <span className="text-xs font-semibold">{showSimulator ? "Sembunyikan" : "Tampilkan"}</span>
        </button>

        {showSimulator && (
          <div className="space-y-4 pt-2 border-t border-border/40 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={handleApproveAllSim}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" /> Setujui Semua Berkas
              </button>
              <button
                onClick={handleResetReqSim}
                className="px-3 py-1.5 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Reset Persyaratan
              </button>
              <button
                onClick={handleResetSubSim}
                className="px-3 py-1.5 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Reset Riwayat
              </button>
            </div>

            {/* Part A: Requirement Status Editor */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-2">
              <div className="md:col-span-12">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Simulasi Validasi Berkas Persyaratan</span>
              </div>
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Pilih Dokumen</label>
                <select
                  value={selectedSimulatorReq}
                  onChange={(e) => setSelectedSimulatorReq(e.target.value)}
                  className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                >
                  {requirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      ({req.id}) {req.label.substring(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Status Validasi</label>
                <select
                  value={simulatorStatus}
                  onChange={(e) => setSimulatorStatus(e.target.value as RequirementItem["status"])}
                  className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                >
                  <option value="Valid">Diterima (Valid)</option>
                  <option value="Menunggu Verifikasi">Menunggu Validasi</option>
                  <option value="Perlu Revisi">Ditolak / Perlu Revisi</option>
                  <option value="Belum Upload">Belum Dikirim</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <button
                  onClick={handleUpdateSingleReqSim}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Update Berkas
                </button>
              </div>

              {simulatorStatus === "Perlu Revisi" && (
                <div className="md:col-span-12 space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Catatan Koreksi (Feedback)</label>
                  <textarea
                    value={simulatorNote}
                    onChange={(e) => setSimulatorNote(e.target.value)}
                    placeholder="Ketik catatan perbaikan berkas..."
                    rows={2}
                    className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                  />
                </div>
              )}
            </div>

            {/* Part B: Title Submission Status Editor */}
            {submissions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-4 border-t border-border/40">
                <div className="md:col-span-12">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Simulasi Validasi Pengajuan Judul</span>
                </div>
                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Pilih Pengajuan Judul</label>
                  <select
                    value={selectedSimId}
                    onChange={(e) => setSelectedSimId(e.target.value)}
                    className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                  >
                    {submissions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        ({sub.date}) {sub.judulTA.substring(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Status Pengajuan</label>
                  <select
                    value={simStatus}
                    onChange={(e) => setSimStatus(e.target.value as ThesisSubmission["status"])}
                    className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                  >
                    <option value="Diterima">Disetujui (Diterima)</option>
                    <option value="Sedang Proses Validasi">Sedang Proses Validasi</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <button
                    onClick={handleUpdateSubStatusSim}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Update Judul
                  </button>
                </div>

                {simStatus === "Ditolak" && (
                  <div className="md:col-span-12 space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Catatan Penolakan Judul (Feedback)</label>
                    <textarea
                      value={simNote}
                      onChange={(e) => setSimNote(e.target.value)}
                      placeholder="Ketik alasan penolakan judul..."
                      rows={2}
                      className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
