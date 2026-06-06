import React, { useState, useEffect } from "react";
import {
  User,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Clock,
  UploadCloud,
  FileText,
  Lock,
  Check,
  XCircle,
  RotateCcw,
  Sliders,
  Link,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  CalendarDays,
  Sparkles,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { guidanceApi, lecturerWorkflowApi, progressApi, studentWorkflowApi } from "../../../../core/api/domain";
import type { BimbinganData, BimbinganSession } from "../../types/bimbingan";
import {
  type RequirementItem,
} from "../../services/student-workflow-service";

const DEFAULT_SEMINAR_REQ: RequirementItem[] = [
  { id: "req_b1", label: "Lembar Bimbingan Tugas Akhir (Proposal) - Dosen Pembimbing Utama", status: "Valid" },
  { id: "req_b2", label: "Lembar Bimbingan Tugas Akhir (Proposal) - Dosen Pembimbing Pendamping", status: "Valid" },
  { id: "req_b3", label: "Surat Rekomendasi Kelayakan dari Dosen Pembimbing Utama dan Pendamping", status: "Valid" },
  { id: "req_b4", label: "Laporan Proposal Tugas Akhir yang Sudah Ditandatangani Lengkap", status: "Perlu Revisi", catatanKoordinator: "Tanda tangan Dosen Pembimbing Pendamping di lembar pengesahan masih belum terisi. Mohon dilengkapi kembali." },
  { id: "req_b5", label: "Kartu Studi Tetap (Terdapat Mata Kuliah Proposal TA yang Ditandatangani Dosen Wali)", status: "Belum Upload" },
  { id: "req_b6", label: "Link Laporan Proposal yang sudah diupload di Portal TA", status: "Belum Upload" }
];

const DEFAULT_SIDANG_REQ: RequirementItem[] = [
  { id: "req_c1", label: "Surat Ijin Penelitian / Studi Pendahuluan dari Instansi Terkait", status: "Valid" },
  { id: "req_c2", label: "Berkas soft file naskah Tugas Akhir lengkap (Bab 1 s.d Bab 5)", status: "Valid" },
  { id: "req_c3", label: "KST pengambilan matakuliah Tugas Akhir dari SIPT ditandatangani DPA", status: "Valid" },
  { id: "req_c4", label: "Transkrip Nilai lengkap dari SIPT seluruh semester (Minimal 146 SKS)", status: "Perlu Revisi", catatanKoordinator: "Jumlah SKS yang tertera baru 142 SKS, sedangkan batas kelulusan minimal adalah 146 SKS. Silakan hubungi bagian akademik prodi untuk pembetulan transkrip." },
  { id: "req_c5", label: "Lembar pengesahan lulus proposal Tugas Akhir yang telah ditandatangani", status: "Valid" },
  { id: "req_c6", label: "Lembar bimbingan Tugas Akhir (Minimal 8x pertemuan) dan rekomendasi pembimbing", status: "Valid" },
  { id: "req_c7", label: "Logbook harian kegiatan bimbingan & penelitian yang disetujui", status: "Valid" },
  { id: "req_c8", label: "Surat Pernyataan Publikasi Hasil Tugas Akhir bermaterai", status: "Belum Upload" },
  { id: "req_c9", label: "Berstatus eligible Penomoran Ijazah Nasional (PIN) dari Koordinator Prodi", status: "Valid" },
  { id: "req_c10", label: "Report SKPI (Surat Keterangan Pendamping Ijazah) memenuhi minimal 20 poin", status: "Valid" },
  { id: "req_c11", label: "Form Permohonan Pengecekan Turnitin / Bukti Lulus Turnitin maksimal 25%", status: "Valid" },
  { id: "req_c12", label: "Bukti Pelunasan UKT Tahap/Bulan Berjalan Tahun Akademik 2025/2026", status: "Perlu Revisi", catatanKoordinator: "Foto kuitansi pembayaran buram dan nominal transfer tidak terlihat jelas. Tolong upload ulang foto bukti pembayaran dengan resolusi tinggi." },
  { id: "req_c13", label: "Photocopy Kartu Tanda Penduduk (KTP)", status: "Belum Upload" },
  { id: "req_c14", label: "Photocopy Ijazah SMA/Sederajat terlegalisir", status: "Belum Upload" },
  { id: "req_c15", label: "Pas Foto ukuran 4x6 background merah (menggunakan jas almamater)", status: "Belum Upload" }
];

interface BimbinganWorkflowProps {
  stageId: string;
  role?: "mahasiswa" | "pembimbing";
  studentId?: string; // Digunakan jika role = 'pembimbing'
  useLecturerApi?: boolean;
  onStatusChange?: () => void; // Pemicu re-render parent jika status berubah
}

export const BimbinganWorkflow: React.FC<BimbinganWorkflowProps> = ({
  stageId,
  role = "mahasiswa",
  studentId = "1",
  useLecturerApi = false,
  onStatusChange,
}) => {
  const [data, setData] = useState<BimbinganData>(() =>
    guidanceApi.getCached(stageId)
  );

  // States
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [docLinkInput, setDocLinkInput] = useState(data.googleDocsLink);
  const [uploadFileMock, setUploadFileMock] = useState<string | null>(data.finalFile);
  const [showAjukanForm, setShowAjukanForm] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [schedulingSession, setSchedulingSession] = useState<BimbinganSession | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  // ================= GUIDANCE REQUEST FLOW STATE =================
  const [approvalStartDate, setApprovalStartDate] = useState<string>("");
  const [approvalStartTime, setApprovalStartTime] = useState<string>("10:00");
  const [guidanceToast, setGuidanceToast] = useState<string | null>(null);

  const triggerGuidanceToast = (msg: string) => {
    setGuidanceToast(msg);
    setTimeout(() => setGuidanceToast(null), 4000);
  };

  const isLecturerWorkflow = role === "pembimbing" && useLecturerApi;

  const applyGuidanceData = (nextData: BimbinganData) => {
    setData(nextData);
    setDocLinkInput(nextData.googleDocsLink);
    setUploadFileMock(nextData.finalFile);
  };

  const normalizeApprovedSession = (nextData: BimbinganData, sessionId: number): BimbinganData => ({
    ...nextData,
    sessions: nextData.sessions.map((session) =>
      session.id === sessionId
        ? { ...session, status: "approved", sessionStatus: "approved" }
        : session
    ),
  });

  const readGuidanceWorkflow = () =>
    isLecturerWorkflow
      ? lecturerWorkflowApi.getGuidance(studentId, stageId)
      : guidanceApi.get(stageId);

  const approveGuidanceWorkflow = (payload: {
    startDate: string;
    startTime: string;
    approvalNote: string;
  }) =>
    isLecturerWorkflow
      ? lecturerWorkflowApi.approveGuidanceRequest(studentId, stageId, payload)
      : guidanceApi.approveGuidance(stageId, payload);

  const updateSupervisorApproval = (pembimbingNum: 1 | 2, approved: boolean) =>
    isLecturerWorkflow
      ? lecturerWorkflowApi.updateGuidanceApproval(studentId, stageId, {
          pembimbingNum,
          approved,
        })
      : guidanceApi.updateApproval(stageId, pembimbingNum, approved);

  const approveSessionWorkflow = (
    sessionId: number,
    payload: { startDate: string; startTime: string }
  ) =>
    isLecturerWorkflow
      ? lecturerWorkflowApi.approveSessionGuidance(studentId, stageId, sessionId, payload)
      : guidanceApi.approveSessionGuidance(stageId, sessionId, payload);

  useEffect(() => {
    let mounted = true;

    readGuidanceWorkflow()
      .then((response) => {
        if (mounted) {
          applyGuidanceData(response.data);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [stageId, studentId, isLecturerWorkflow]);

  const handleResetGuidance = async () => {
    const response = await guidanceApi.resetGuidance(stageId);
    setData(response.data);
    triggerGuidanceToast("Status pengajuan bimbingan berhasil direset ke awal.");
  };

  const handleSimulateRequestGuidance = async () => {
    const response = await guidanceApi.requestGuidance(stageId, "Saya ingin memulai bimbingan untuk penyusunan proposal Tugas Akhir.");
    setData(response.data);
    triggerGuidanceToast("Simulasi: Pengajuan bimbingan terkirim.");
  };

  const handleSimulateApproveGuidance = async () => {
    const today = new Date();
    const startDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const response = await approveGuidanceWorkflow({
      startDate,
      startTime: "10:00",
      approvalNote: "Silakan mulai bimbingan.",
    });
    setData(response.data);
    triggerGuidanceToast("Simulasi: Bimbingan disetujui oleh pembimbing.");
  };

  const handleSimulateCompleteGuidance = async () => {
    let latest = data;

    for (let i = 1; i <= 8; i++) {
      const response = await guidanceApi.updateSession(stageId, i, {
        title: latest.sessions[i - 1].title.includes("Belum diisi")
          ? `Diskusi Topik Bimbingan ${i}`
          : latest.sessions[i - 1].title,
        status: "approved",
      });
      latest = response.data;
    }

    latest = (await updateSupervisorApproval(1, true)).data;
    latest = (await updateSupervisorApproval(2, true)).data;
    setData(latest);
    if (onStatusChange) onStatusChange();
  };

  // ================= TAHAP 3 STATE: PERSYARATAN SEMINAR / SIDANG =================
  const isProposal = stageId === "bimbingan-pra-proposal";
  const defaultReqs = isProposal ? DEFAULT_SEMINAR_REQ : DEFAULT_SIDANG_REQ;

  const [reqList, setReqList] = useState<RequirementItem[]>([]);
  const [stageDriveLink, setStageDriveLink] = useState<string>("");
  const [stageDriveInput, setStageDriveInput] = useState<string>("");
  const [isEditingStageLink, setIsEditingStageLink] = useState<boolean>(false);
  const [reqToast, setReqToast] = useState<string | null>(null);

  // States for collapsible sections (default: collapsed)
  const [isForumExpanded, setIsForumExpanded] = useState<boolean>(false);
  const [isRequirementsExpanded, setIsRequirementsExpanded] = useState<boolean>(false);

  // Simulator stage state
  const [selectedSubSimId, setSelectedSubSimId] = useState<string>("");
  const [subSimStatus, setSubSimStatus] = useState<RequirementItem["status"]>("Valid");
  const [subSimNote, setSubSimNote] = useState<string>("");

  // Load requirements from the student workflow API boundary on mount or change.
  useEffect(() => {
    let mounted = true;

    studentWorkflowApi
      .getStageRequirements(stageId, defaultReqs)
      .then((response) => {
        if (!mounted) return;

        setReqList(response.data.requirements);
        setStageDriveLink(response.data.driveLink);
        setStageDriveInput(response.data.driveLink);
        setIsEditingStageLink(!response.data.driveLink);
      })
      .catch(() => {
        if (!mounted) return;

        setReqList(defaultReqs);
        setStageDriveLink("");
        setStageDriveInput("");
        setIsEditingStageLink(true);
      });

    return () => {
      mounted = false;
    };
  }, [stageId]);

  // Save requirements through the student workflow API boundary.
  const saveRequirementsState = (updatedReqs: RequirementItem[], link: string) => {
    studentWorkflowApi
      .saveStageRequirements(stageId, { requirements: updatedReqs, driveLink: link })
      .catch(() => undefined);
  };

  const triggerReqToast = (msg: string) => {
    setReqToast(msg);
    setTimeout(() => {
      setReqToast(null);
    }, 4000);
  };

  // Google Drive submit
  const handleStageDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageDriveInput.trim()) {
      alert("Masukkan link Google Drive yang valid.");
      return;
    }

    const trimmed = stageDriveInput.trim();
    setStageDriveLink(trimmed);
    setIsEditingStageLink(false);

    // Update statuses that are Belum Upload or Perlu Revisi to Menunggu Verifikasi
    const updated = reqList.map((req) => {
      if (req.status === "Belum Upload" || req.status === "Perlu Revisi") {
        return {
          ...req,
          status: "Menunggu Verifikasi" as const,
          catatanKoordinator: undefined,
        };
      }
      return req;
    });

    setReqList(updated);
    saveRequirementsState(updated, trimmed);
    triggerReqToast("Link folder Google Drive terkumpul! Berkas persyaratan Anda masuk ke tahap validasi.");
  };

  // Determine sub overall status
  const getSubOverallStatus = () => {
    const allValid = reqList.every((r) => r.status === "Valid");

    if (allValid && reqList.length > 0) {
      return {
        label: "Valid",
        color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20",
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        desc: "Luar biasa! Seluruh persyaratan kelayakan administrasi khusus untuk tahap ini telah lengkap dan divalidasi dengan sukses."
      };
    }

    return {
      label: "Belum Valid",
      color: "bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-400 dark:bg-slate-900/40",
      icon: <XCircle className="w-5 h-5 text-slate-500 shrink-0" />,
      desc: "Beberapa persyaratan kelayakan administrasi belum divalidasi atau masih memerlukan perbaikan. Silakan pastikan link Google Drive terisi dengan benar dan periksa catatan perbaikan dari Koordinator jika ada."
    };
  };

  const subOverall = getSubOverallStatus();

  // Statistics
  const subTotal = reqList.length;
  const subValid = reqList.filter((r) => r.status === "Valid").length;
  const subPercent = subTotal === 0 ? 0 : Math.round((subValid / subTotal) * 100);

  // Simulator
  const handleUpdateSingleReqSubSim = () => {
    const updated = reqList.map((req) => {
      if (req.id === selectedSubSimId) {
        return {
          ...req,
          status: subSimStatus,
          catatanKoordinator: subSimStatus === "Perlu Revisi" && subSimNote.trim() ? subSimNote.trim() : undefined
        };
      }
      return req;
    });

    setReqList(updated);
    saveRequirementsState(updated, stageDriveLink);
    triggerReqToast(`Simulasi berhasil! Berkas "${reqList.find(r => r.id === selectedSubSimId)?.label.substring(0, 30)}..." telah diupdate.`);
  };

  const handleApproveAllReqSubSim = () => {
    const updated = reqList.map((req) => ({
      ...req,
      status: "Valid" as const,
      catatanKoordinator: undefined
    }));

    setReqList(updated);
    saveRequirementsState(updated, stageDriveLink || "https://drive.google.com/drive/folders/simulated-approved-stage-folder");
    if (!stageDriveLink) {
      setStageDriveLink("https://drive.google.com/drive/folders/simulated-approved-stage-folder");
      setStageDriveInput("https://drive.google.com/drive/folders/simulated-approved-stage-folder");
      setIsEditingStageLink(false);
    }
    triggerReqToast("Simulasi berhasil! Semua persyaratan disetujui.");
  };

  const handleResetReqSubSim = () => {
    setReqList(defaultReqs);
    setStageDriveLink("");
    setStageDriveInput("");
    setIsEditingStageLink(true);
    saveRequirementsState(defaultReqs, "");
    triggerReqToast("Persyaratan bimbingan berhasil direset.");
  };

  // Quick select simulator update values
  useEffect(() => {
    if (reqList.length > 0) {
      if (!selectedSubSimId) {
        setSelectedSubSimId(reqList[0].id);
      }
      const target = reqList.find((r) => r.id === selectedSubSimId);
      if (target) {
        setSubSimStatus(target.status);
        setSubSimNote(target.catatanKoordinator || "");
      }
    }
  }, [selectedSubSimId, reqList]);
  // Google Docs Save
  const handleSaveDocLink = async () => {
    const response = await guidanceApi.updateDocsLink(stageId, docLinkInput);
    setData(response.data);
    setIsEditingDoc(false);
  };

  // Approve Sesi Bimbingan (Dosen / Simulator)
  const handleApproveSession = async (sessionId: number) => {
    const session = data.sessions.find(s => s.id === sessionId);
    if (session) {
      if (isLecturerWorkflow) {
        const response = await approveSessionWorkflow(sessionId, {
          startDate: new Date().toISOString().split("T")[0],
          startTime: approvalStartTime,
        });
        setData(normalizeApprovedSession(response.data, sessionId));
      } else {
        const response = await guidanceApi.updateSession(
          stageId,
          sessionId,
          {
            title: session.title.includes("Belum diisi") ? `Diskusi Topik Bimbingan ${sessionId}` : session.title,
            status: "approved",
          }
        );
        setData(response.data);
      }
      triggerGuidanceToast(`Sesi bimbingan Ke-${sessionId} selesai disetujui.`);
    }
  };

  // Toggle Supervisor Approval
  const handleToggleSupervisorApproval = async (num: 1 | 2) => {
    const currentVal = num === 1 ? data.pembimbing1Approved : data.pembimbing2Approved;
    const response = await updateSupervisorApproval(num, !currentVal);
    setData(response.data);
  };

  // Reset Bimbingan
  const handleResetBimbingan = async () => {
    const response = await guidanceApi.reset(stageId);
    setUploadFileMock(null);
    setSchedulingSession(null);
    setShowAjukanForm(false);
    setTopicInput("");
    setData(response.data);
    triggerGuidanceToast("Status pengajuan bimbingan berhasil direset.");
  };

  // Ajukan Materi Bimbingan (Mahasiswa)
  const handleAjukanMateri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;

    const nextSession = data.sessions.find(
      (s) => s.status === "pending" && (s.sessionStatus === "idle" || !s.sessionStatus)
    );

    if (!nextSession) {
      triggerGuidanceToast("Semua sesi bimbingan telah diajukan atau selesai!");
      return;
    }

    await guidanceApi.updateSession(stageId, nextSession.id, {
      title: topicInput,
      status: nextSession.status,
    });
    const response = await guidanceApi.requestSessionGuidance(stageId, nextSession.id);
    setTopicInput("");
    setShowAjukanForm(false);
    setData(response.data);
    triggerGuidanceToast(`Materi bimbingan Sesi ke-${nextSession.id} berhasil diajukan!`);
  };
  // File Upload Simulation
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const response = await guidanceApi.uploadFinalFile(stageId, file.name);
      setUploadFileMock(file.name);
      setData(response.data);
    }
  };

  // Hitung stats
  const totalSessions = data.sessions.length;
  const approvedSessionsCount = data.sessions.filter(
    (s) => s.status === "approved" || s.sessionStatus === "approved"
  ).length;
  const progressPercent = Math.round((approvedSessionsCount / totalSessions) * 100);


  // Helper to format schedule date and time dynamically for each session
  const getSessionSchedule = (session: BimbinganSession) => {
    // Only return schedule if the session is approved (either fully approved or in progress after confirmation)
    if (session.sessionStatus !== 'approved' && session.status !== 'approved') {
      return null;
    }

    // Priority 1: Use session's own custom scheduled date and time if set
    if (session.sessionStartDate && session.sessionStartTime) {
      try {
        const baseDate = new Date(session.sessionStartDate + 'T00:00:00');
        const dateStr = baseDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        const [hours, minutes] = session.sessionStartTime.split(':');
        const startHour = parseInt(hours, 10);
        const endHour = startHour + 1;
        const startStr = `${startHour.toString().padStart(2, '0')}.${minutes}`;
        const endStr = `${endHour.toString().padStart(2, '0')}.${minutes}`;
        const timeStr = `${startStr} – ${endStr}`;
        
        return { date: dateStr, time: timeStr };
      } catch (e) {
        // Fallback
      }
    }

    // Priority 2: Stage-level base date offset (fallback)
    if (!data.guidanceStartDate || !data.guidanceTime) return null;
    try {
      const baseDate = new Date(data.guidanceStartDate + 'T00:00:00');
      // Offset by (session.id - 1) * 7 days
      const sessionDate = new Date(baseDate.getTime() + (session.id - 1) * 7 * 24 * 60 * 60 * 1000);
      
      const dateStr = sessionDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      // Format time: e.g. 10.00 – 11.00
      const [hours, minutes] = data.guidanceTime.split(':');
      const startHour = parseInt(hours, 10);
      const endHour = startHour + 1;
      const startStr = `${startHour.toString().padStart(2, '0')}.${minutes}`;
      const endStr = `${endHour.toString().padStart(2, '0')}.${minutes}`;
      const timeStr = `${startStr} – ${endStr}`;
      
      return { date: dateStr, time: timeStr };
    } catch (e) {
      return { date: '12 Juni 2026', time: '10.00 – 11.00' };
    }
  };

  // Syarat tombol final upload aktif
  const isEligibleForUpload = approvedSessionsCount === 8 && data.pembimbing1Approved && data.pembimbing2Approved;

  return (
    <div className="space-y-6">

      {/* ================= GUIDANCE TOAST ================= */}
      {guidanceToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm animate-fade-in border border-slate-800 dark:border-slate-200">
          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[3]" />
          <p className="text-xs font-semibold leading-relaxed">{guidanceToast}</p>
        </div>
      )}

      {/* ================= APPROVED: INFO BANNER ================= */}
      {data.guidanceStatus === 'approved' && data.guidanceApprovedAt && (
        <div className="bg-gradient-to-r from-emerald-500/[0.05] via-card to-teal-500/[0.03] border border-emerald-500/15 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h6 className="text-xs font-bold text-foreground flex items-center gap-2">
                Bimbingan Aktif
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full">Bimbingan Aktif</span>
              </h6>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Diajukan: {data.guidanceRequestedAt ? new Date(data.guidanceRequestedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Disetujui: {new Date(data.guidanceApprovedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {data.guidanceStartDate && (
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CalendarDays className="w-3 h-3" />
                    Mulai: {new Date(data.guidanceStartDate + 'T' + (data.guidanceTime || '00:00') + ':00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} Pukul {data.guidanceTime || '00:00'} WIB
                  </span>
                )}
              </div>
              {data.guidanceApprovalNote && (
                <p className="text-[10px] text-foreground/70 mt-1 italic">
                  "{data.guidanceApprovalNote}"
                </p>
              )}
            </div>
          </div>
          {isDemoModeEnabled && (
            <button
              onClick={handleResetGuidance}
              className="text-[10px] font-bold px-2.5 py-1 border hover:bg-muted rounded text-foreground transition flex items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Pengajuan
            </button>
          )}
        </div>
      )}
    <>

          {/* ================= SECTION 1: DATA USER ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {role === "mahasiswa" ? (
              <>
                {/* Pembimbing 1 Card */}
                <div className="bg-card border border-border/80 rounded-xl p-4 flex gap-4 items-center shadow-xs">
                  <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/40 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-sky-600 dark:text-sky-400">Pembimbing Utama (1)</span>
                    <h4 className="text-sm font-semibold truncate text-foreground">Dr. Apt. Rina Marlina, M.Farm.</h4>
                    <p className="text-xs text-muted-foreground truncate">NIDN: 0123456789 • Teknologi Sediaan</p>
                  </div>
                </div>

                {/* Pembimbing 2 Card */}
                <div className="bg-card border border-border/80 rounded-xl p-4 flex gap-4 items-center shadow-xs">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">Pembimbing Pendamping (2)</span>
                    <h4 className="text-sm font-semibold truncate text-foreground">Dr. Apt. Budi Santoso, M.Si.</h4>
                    <p className="text-xs text-muted-foreground truncate">NIDN: 0987654321 • Farmakologi Uji</p>
                  </div>
                </div>
              </>
            ) : (
              /* Pembimbing View (Data Mahasiswa) */
              <div className="col-span-2 bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                      <User className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary">Mahasiswa Bimbingan Anda</span>
                      <h4 className="text-base font-semibold truncate text-foreground">Dimas Indra Jaya</h4>
                      <p className="text-xs text-muted-foreground">NIM: 221011400215 • Angkatan 2022 • Skema: Skripsi</p>
                    </div>
                  </div>
                  <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
                    <span className="text-[10px] block text-muted-foreground uppercase font-bold">Judul Tugas Akhir</span>
                    <p className="text-xs font-semibold text-foreground max-w-sm line-clamp-2 mt-0.5 leading-relaxed">
                      Formulasi dan Uji Stabilitas Sediaan Gel Ekstrak Daun Sirih
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= SECTION 2: GOOGLE DOCS LINK ================= */}
          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3 items-center min-w-0">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h5 className="text-sm font-semibold text-foreground">Link Google Docs Bimbingan</h5>
                {isEditingDoc ? (
                  <div className="flex items-center gap-2 mt-1.5 w-full">
                    <input
                      type="text"
                      value={docLinkInput}
                      onChange={(e) => setDocLinkInput(e.target.value)}
                      className="px-2.5 py-1 text-xs border rounded-lg focus:ring-1 focus:ring-primary w-64 md:w-96 text-foreground bg-background"
                    />
                    <button
                      onClick={handleSaveDocLink}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingDoc(false);
                        setDocLinkInput(data.googleDocsLink);
                      }}
                      className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-semibold hover:bg-muted/80 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground font-medium truncate hover:underline mt-0.5">
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
                    <Edit3 className="w-3.5 h-3.5" /> Edit Link
                  </button>
                )}
                <a
                  href={data.googleDocsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Open Docs <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* ================= SECTION 3: STATUS & REQUIREMENT ================= */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
            <h5 className="text-sm font-semibold text-foreground mb-4">Metrik Kelayakan & Status Bimbingan</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Status P1 */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Approval Pembimbing 1</span>
                  <span className="text-xs font-semibold text-foreground">Dr. Apt. Rina Marlina</span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize",
                      data.pembimbing1Approved
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20"
                    )}
                  >
                    {data.pembimbing1Approved ? "Disetujui" : "Tertunda"}
                  </span>
                  {role === "pembimbing" && (
                    <button
                      onClick={() => handleToggleSupervisorApproval(1)}
                      className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Setujui
                    </button>
                  )}
                </div>
              </div>

              {/* Status P2 */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Approval Pembimbing 2</span>
                  <span className="text-xs font-semibold text-foreground">Dr. Apt. Budi Santoso</span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize",
                      data.pembimbing2Approved
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20"
                    )}
                  >
                    {data.pembimbing2Approved ? "Disetujui" : "Tertunda"}
                  </span>
                  {role === "pembimbing" && (
                    <button
                      onClick={() => handleToggleSupervisorApproval(2)}
                      className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Setujui
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bimbingan */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Progress Sesi</span>
                  <span className="text-sm font-bold text-foreground mt-1 block">
                    {approvedSessionsCount} <span className="text-[10px] font-normal text-muted-foreground">dari {totalSessions} Disetujui</span>
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
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Status Tahapan</span>
                  <span className="text-xs font-semibold text-foreground">{isProposal ? "Pra-Proposal" : "Pra-Sidang"}</span>
                </div>
                <div>
                  <span className={cn(
                    "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize block text-center",
                    approvedSessionsCount === 8 && data.pembimbing1Approved && data.pembimbing2Approved
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                      : approvedSessionsCount === 8
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20"
                      : "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
                  )}>
                    {approvedSessionsCount === 8 && data.pembimbing1Approved && data.pembimbing2Approved
                      ? "Selesai"
                      : approvedSessionsCount === 8
                      ? "Menunggu Validasi"
                      : "Aktif"}
                  </span>
                </div>
              </div>

            </div>

            {isDemoModeEnabled && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowSimulator(!showSimulator)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer select-none bg-none border-none outline-none"
              >
                <Sliders className="w-3.5 h-3.5 text-primary" /> Panel Simulasi Dosen / Admin {showSimulator ? "▲" : "▼"}
              </button>

              {showSimulator && (
                <div className="mt-3 p-4 bg-muted/15 border border-border/60 rounded-xl flex flex-wrap justify-between items-center gap-3 animate-in slide-in-from-top-2 duration-150">
                  <p className="text-[10px] text-muted-foreground">
                    Gunakan panel simulasi untuk menguji status kelayakan bimbingan.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {data.guidanceStatus === 'idle' && (
                      <button
                        onClick={handleSimulateRequestGuidance}
                        className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Simulasi: Ajukan
                      </button>
                    )}
                    {data.guidanceStatus === 'requested' && (
                      <button
                        onClick={handleSimulateApproveGuidance}
                        className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Simulasi: Konfirmasi
                      </button>
                    )}
                    <button
                      onClick={handleResetGuidance}
                      className="px-3 py-1.5 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Reset Pengajuan
                    </button>
                    <button
                      onClick={handleSimulateCompleteGuidance}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Luluskan Bimbingan
                    </button>
                    <button
                      onClick={handleResetBimbingan}
                      className="px-3 py-1.5 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50/40 dark:hover:bg-red-950/20 text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Reset Bimbingan
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>

          {/* ================= SECTION 4: RIWAYAT & MATERI BIMBINGAN (COLLAPSIBLE) ================= */}
          {(() => {
            return (
              <div className={cn(
                "bg-card border border-border/80 rounded-2xl transition-all duration-300 relative overflow-hidden",
                isForumExpanded ? "p-5 border-border shadow-xs" : "p-4.5 border-border/80 hover:border-border hover:shadow-xs"
              )}>
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => setIsForumExpanded(!isForumExpanded)}
                  className="w-full text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none select-none"
                >
                  <div className="space-y-1.5 flex-1 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <BookOpen className="w-4.5 h-4.5 text-primary shrink-0" />
                        Riwayat & Materi Bimbingan
                      </span>
                      {!isForumExpanded && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize bg-primary/10 border-primary/20 text-primary">
                            {approvedSessionsCount}/8 Selesai
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground/75 leading-relaxed">
                      {isForumExpanded 
                        ? "Kelola dan pantau seluruh pengajuan topik serta materi bimbingan Tugas Akhir." 
                        : "Akses riwayat topik bimbingan dan status validasi jadwal dari dosen pembimbing."
                      }
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {!isForumExpanded && (
                      <span className={cn(
                        "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize hidden sm:inline-block",
                        approvedSessionsCount === 8 && data.pembimbing1Approved && data.pembimbing2Approved
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                          : approvedSessionsCount === 8
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20"
                          : "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
                      )}>
                        {approvedSessionsCount === 8 && data.pembimbing1Approved && data.pembimbing2Approved
                          ? "Selesai"
                          : approvedSessionsCount === 8
                          ? "Menunggu"
                          : "Aktif"}
                      </span>
                    )}
                    <div className={cn(
                      "w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center transition-transform duration-200 text-muted-foreground",
                      isForumExpanded && "rotate-90"
                    )}>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>

                {isForumExpanded && (
                  <div className="flex flex-col gap-4 mt-5 pt-4 border-t border-border/40 animate-slide-down">
                    
                    {/* Student Submit Form Card */}
                    {role === "mahasiswa" && (() => {
                      const nextPending = data.sessions.find(
                        (s) => s.status === "pending" && (s.sessionStatus === "idle" || !s.sessionStatus)
                      );
                      if (!nextPending) return null;

                      return (
                        <div className="bg-muted/10 border border-border/80 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h6 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <BookOpen className="w-4.5 h-4.5 text-primary shrink-0" />
                              Ajukan Materi Bimbingan Baru (Sesi ke-{nextPending.id})
                            </h6>
                          </div>

                          {!showAjukanForm ? (
                            <button
                              type="button"
                              onClick={() => setShowAjukanForm(true)}
                              className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              Ajukan Materi Bimbingan
                            </button>
                          ) : (
                            <form onSubmit={handleAjukanMateri} className="space-y-3 pt-1.5 animate-slide-down">
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-foreground block">
                                  Topik Bimbingan
                                </label>
                                <textarea
                                  value={topicInput}
                                  onChange={(e) => setTopicInput(e.target.value)}
                                  placeholder="Contoh: Diskusi draf bab 1 pendahuluan..."
                                  required
                                  rows={3}
                                  className="w-full text-xs border border-border/80 rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary outline-none bg-background text-foreground transition-all"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  Kirim Pengajuan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTopicInput("");
                                    setShowAjukanForm(false);
                                  }}
                                  className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })()}

                    {/* Sessions History List */}
                    <div className="space-y-3">
                      {data.sessions.map((session) => {
                        const isApproved = session.status === "approved" || session.sessionStatus === "approved";
                        const isInProgress = session.status === "in progress";
                        const isRequested = session.sessionStatus === "requested";
                        const isIdle = !isApproved && !isInProgress && !isRequested;

                        let statusLabel = "Belum Diajukan";
                        let statusColor = "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40";

                        if (isApproved) {
                          statusLabel = "Selesai";
                          statusColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20";
                        } else if (isInProgress) {
                          statusLabel = "Sedang Proses";
                          statusColor = "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 dark:bg-blue-950/20";
                        } else if (isRequested) {
                          statusLabel = "Menunggu Validasi";
                          statusColor = "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20";
                        }

                        const schedInfo = getSessionSchedule(session);

                        return (
                          <div
                            key={session.id}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 gap-4 min-h-[56px]",
                              isApproved && "bg-emerald-500/[0.01] border-emerald-500/10 hover:border-emerald-500/20",
                              isInProgress && "bg-blue-500/[0.01] border-blue-500/20 shadow-2xs",
                              isRequested && "bg-amber-500/[0.01] border-amber-500/20 shadow-2xs",
                              isIdle && "bg-card border-border/80 hover:bg-muted/10"
                            )}
                          >
                            <div className="flex items-start gap-3.5 min-w-0 pl-1">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0",
                                  isApproved && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-950/30",
                                  isInProgress && "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:bg-blue-950/30 ring-4 ring-blue-100/30 dark:ring-blue-950/15",
                                  isRequested && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/30 ring-4 ring-amber-100/30 dark:ring-amber-950/15",
                                  isIdle && "bg-slate-500/5 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-slate-700"
                                )}
                              >
                                {isApproved ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : session.id}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <h6
                                  className={cn(
                                    "text-xs font-semibold truncate",
                                    isApproved && "text-foreground/85",
                                    isInProgress && "text-blue-600 dark:text-blue-400",
                                    isRequested && "text-amber-600 dark:text-amber-400",
                                    isIdle && "text-slate-400 dark:text-slate-500 font-normal italic"
                                  )}
                                >
                                  {isIdle ? "Belum ada pengajuan materi" : session.title}
                                </h6>
                                <p className="text-[10px] text-muted-foreground">
                                  Sesi Bimbingan Ke-{session.id}
                                </p>

                                {/* Schedule Details */}
                                {(isApproved || isInProgress) && schedInfo && (
                                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground/75 font-medium">
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                                      {schedInfo.date}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                      {schedInfo.time} WIB
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions or Badge */}
                            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                              {/* Lecturer action: Setujui & Jadwalkan */}
                              {role === "pembimbing" && isRequested && (
                                <button
                                  type="button"
                                  onClick={() => setSchedulingSession(session)}
                                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  Setujui & Jadwalkan
                                </button>
                              )}

                              {/* Lecturer action: Tandai Selesai */}
                              {role === "pembimbing" && isInProgress && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveSession(session.id)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  Tandai Selesai
                                </button>
                              )}

                              {/* Normal Status Badge */}
                              {!(role === "pembimbing" && (isRequested || isInProgress)) && (
                                <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize", statusColor)}>
                                  {statusLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}
              </div>
            );
          })()}
                      {/* ================= TAHAP 3: PERSYARATAN KELAYAKAN TAHAPAN (COLLAPSIBLE) ================= */}
          {role === "mahasiswa" && (
            <div className={cn(
              "bg-card border border-border/80 rounded-2xl transition-all duration-300 relative overflow-hidden",
              isRequirementsExpanded ? "p-5 border-border shadow-xs space-y-5" : "p-4.5 border-border/80 hover:border-border hover:shadow-xs space-y-0"
            )}>
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setIsRequirementsExpanded(!isRequirementsExpanded)}
                className="w-full text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none select-none"
              >
                <div className="space-y-1.5 flex-1 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <FileCheck className="w-4.5 h-4.5 text-primary shrink-0" />
                      {isProposal ? "Verifikasi Persyaratan Seminar Proposal" : "Verifikasi Persyaratan Sidang Akhir"}
                    </span>
                    {!isRequirementsExpanded && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20">
                          {subValid}/{subTotal} Berkas Valid
                        </span>
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize bg-primary/10 border-primary/20 text-primary">
                          {subPercent}% Lengkap
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground/75 leading-relaxed">
                    {isRequirementsExpanded 
                      ? (isProposal ? "Lengkapi seluruh dokumen kelayakan di bawah ini sebelum mendaftar Seminar Proposal." : "Lengkapi seluruh berkas kelulusan & administrasi di bawah ini sebelum mendaftar Sidang Akhir.")
                      : "Validasi berkas administrasi akademik wajib untuk pengesahan kelayakan dan pendaftaran ujian."
                    }
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {!isRequirementsExpanded && (
                    <span className={cn(
                      "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize hidden sm:inline-block",
                      subOverall.label === "Valid"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                        : "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
                    )}>
                      {subOverall.label}
                    </span>
                  )}
                  <div className={cn(
                    "w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center transition-transform duration-200 text-muted-foreground",
                    isRequirementsExpanded && "rotate-90"
                  )}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {isRequirementsExpanded && (
                <div className="space-y-5 pt-4 border-t border-border/40 animate-slide-down">
                  {/* Toast inside section */}
                  {reqToast && (
                    <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm animate-fade-in border border-slate-800 dark:border-slate-200">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[3]" />
                      <p className="text-xs font-semibold leading-relaxed">{reqToast}</p>
                    </div>
                  )}

                  {/* Status Banner */}
                  <div className={cn("border rounded-xl p-4 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4", subOverall.color)}>
                    <div className="flex gap-3 items-center">
                      <div className="bg-background/60 backdrop-blur-xs shadow-3xs p-1.5 rounded-lg shrink-0">
                        {subOverall.icon}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground text-xs">
                          {isProposal ? "Verifikasi Persyaratan Seminar Proposal" : "Verifikasi Persyaratan Sidang Akhir"}
                        </p>
                        <p className="text-[11px] opacity-95 mt-0.5">{subOverall.desc}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none shrink-0 capitalize",
                      subOverall.label === "Valid"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                        : "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40"
                    )}>
                      {subOverall.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                    {/* Drive Link Form */}
                    <div className="bg-muted/10 border border-border/60 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                      <div className="space-y-2.5">
                        <h6 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Link className="w-3.5 h-3.5 text-primary" /> Folder Pengumpulan Google Drive
                        </h6>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Unggah berkas-berkas persyaratan khusus untuk tahap ini ke dalam satu folder Google Drive Anda, lalu tempel linknya di bawah.
                        </p>

                        {isEditingStageLink ? (
                          <form onSubmit={handleStageDriveSubmit} className="space-y-2 pt-1">
                            <div className="relative">
                              <input
                                type="url"
                                value={stageDriveInput}
                                onChange={(e) => setStageDriveInput(e.target.value)}
                                placeholder="Paste Google Drive folder link..."
                                required
                                className="w-full text-[11px] border rounded-lg pl-8 pr-2 py-2 text-foreground bg-background focus:ring-1 focus:ring-primary focus:border-primary/50 transition outline-none"
                              />
                              <UploadCloud className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                Kirim Berkas
                              </button>
                              {stageDriveLink && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStageDriveInput(stageDriveLink);
                                    setIsEditingStageLink(false);
                                  }}
                                  className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  Batal
                                </button>
                              )}
                            </div>
                          </form>
                        ) : (
                          <div className="bg-card border border-border/60 rounded-lg p-2.5 space-y-2 mt-1">
                            <div className="min-w-0 flex items-start gap-2">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-none">Drive Terkumpul</span>
                                <a href={stageDriveLink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-blue-600 hover:underline truncate inline-flex items-center gap-0.5 mt-1 leading-tight">
                                  {stageDriveLink} <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={() => setIsEditingStageLink(true)}
                                className="flex-1 px-4 py-1.5 border border-border text-foreground hover:bg-muted text-[10px] font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                Ubah Link
                              </button>
                              <a
                                href={stageDriveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-4 py-1.5 border border-border text-foreground hover:bg-muted text-[10px] font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                Buka Folder <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[9px] text-amber-600 dark:text-amber-400 dark:bg-amber-950/20 leading-relaxed flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          Pastikan folder Google Drive diset ke **"Siapa saja yang memiliki link dapat melihat" (Viewer)**.
                        </span>
                      </div>
                    </div>

                    {/* Statistics & Progress */}
                    <div className="bg-muted/10 border border-border/60 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h6 className="text-xs font-semibold text-foreground">Pemenuhan Persyaratan</h6>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Rasio berkas yang dinyatakan valid</p>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20 rounded-lg px-2.5 py-1 text-right shrink-0">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase block leading-none">Valid</span>
                            <span className="text-xs font-bold font-mono mt-0.5 inline-block">
                              {subValid} / {subTotal}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1.5">
                          <div className="flex justify-between text-[10px] font-medium">
                            <span className="text-muted-foreground">Persentase Kelengkapan</span>
                            <span className="text-primary font-bold font-mono">{subPercent}%</span>
                          </div>
                          <div className="w-full h-3 bg-muted dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${subPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-card border border-border/40 rounded-lg p-2.5 mt-3 select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-slate-550">Valid: <strong>{subValid}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span className="text-slate-550">Sisa: <strong>{subTotal - subValid}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline List (Directly displayed - no modal) */}
                  <div className="space-y-2.5 pt-1.5">
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
                      Daftar Kelengkapan Dokumen ({subTotal} Berkas Wajib)
                    </span>

                    <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2 border border-border/50 rounded-xl p-3 bg-muted/5">
                      {reqList.map((req) => {
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
                              {/* Status Checkbox-style Icon */}
                              <div
                                className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center transition-all select-none shrink-0",
                                  isValid
                                    ? "bg-emerald-500 text-white"
                                    : "bg-muted text-muted-foreground/45 border border-border"
                                )}
                              >
                                {isValid ? (
                                  <Check className="w-3 h-3 stroke-[3px]" />
                                ) : (
                                  <span className="text-[9px] font-bold">✕</span>
                                )}
                              </div>

                              {/* Label */}
                              <p className={cn(
                                "text-xs font-medium transition-all text-left leading-relaxed",
                                isValid ? "text-muted-foreground line-through font-normal" : "text-foreground font-semibold"
                              )}>
                                {req.label}
                              </p>
                            </div>

                            {/* Badge Status */}
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
                  </div>

                  {/* Stage-level Coordinator Note warning box */}
                  {(() => {
                    const stageNote = reqList.find(r => r.catatanKoordinator)?.catatanKoordinator;
                    if (!stageNote) return null;
                    return (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs space-y-1.5 animate-in slide-in-from-bottom-2 duration-200">
                        <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 select-none">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Catatan Koordinator:
                        </span>
                        <p className="text-muted-foreground leading-relaxed font-medium">{stageNote}</p>
                      </div>
                    );
                  })()}

                  {/* Sub Simulator (Interactive testing panel) */}
                  <div className="bg-muted/15 border border-border/80 rounded-2xl p-4 shadow-xs space-y-4">
                    <div className="flex justify-between items-center border-b border-border/40 pb-2 flex-wrap gap-2 text-xs">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 select-none">
                        <Sliders className="w-3.5 h-3.5 text-primary" /> Panel Simulasi Validasi Persyaratan
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleApproveAllReqSubSim}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" /> Setujui Semua
                        </button>
                        <button
                          onClick={handleResetReqSubSim}
                          className="px-3 py-1.5 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-[11px]">
                      {/* Document Selector */}
                      <div className="sm:col-span-5 space-y-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase font-bold block">Pilih Dokumen</label>
                        <select
                          value={selectedSubSimId}
                          onChange={(e) => setSelectedSubSimId(e.target.value)}
                          className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                        >
                          {reqList.map((req) => (
                            <option key={req.id} value={req.id}>
                              ({req.id}) {req.label.substring(0, 40)}...
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Selector */}
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase font-bold block">Status</label>
                        <select
                          value={subSimStatus}
                          onChange={(e) => setSubSimStatus(e.target.value as RequirementItem["status"])}
                          className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                        >
                          <option value="Valid">Diterima (Valid)</option>
                          <option value="Menunggu Verifikasi">Menunggu Validasi</option>
                          <option value="Perlu Revisi">Ditolak / Perlu Revisi</option>
                          <option value="Belum Upload">Belum Dikirim</option>
                        </select>
                      </div>

                      {/* Button */}
                      <div className="sm:col-span-4">
                        <button
                          onClick={handleUpdateSingleReqSubSim}
                          className="w-full px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Update Berkas
                        </button>
                      </div>

                      {/* Rejection comment */}
                      {subSimStatus === "Perlu Revisi" && (
                        <div className="sm:col-span-12 space-y-1.5 animate-slide-down">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold block">Catatan Penolakan</label>
                          <textarea
                            value={subSimNote}
                            onChange={(e) => setSubSimNote(e.target.value)}
                            placeholder="Ketik catatan perbaikan..."
                            rows={2}
                            className="w-full text-xs border rounded-xl px-3 py-2 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION 5: UPLOAD FINAL ================= */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
            <h5 className="text-sm font-semibold text-foreground mb-1">Unggah Berkas Final Bimbingan</h5>
            <p className="text-xs text-muted-foreground/90 mb-4">
              Unggah dokumen proposal Tugas Akhir yang telah dirapikan. Berkas ini hanya bisa disubmit jika seluruh status bimbingan (8/8) dan tanda tangan kelayakan dosen disetujui.
            </p>

            {isEligibleForUpload ? (
              <div className="space-y-4">
                {uploadFileMock ? (
                  <div className="flex items-center justify-between p-4 border border-emerald-500/25 bg-emerald-50/5 dark:bg-emerald-950/10 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h6 className="text-sm font-semibold text-foreground truncate">{uploadFileMock}</h6>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Ready to submit • PDF Document</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <label className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer">
                        Ganti File
                        <input type="file" accept=".pdf,.doc,.docx" onChange={handleUploadFile} className="hidden" />
                      </label>
                      <button
                        onClick={async () => {
                          alert("Berkas proposal berhasil disubmit! Anda sekarang dapat mendaftar ke Sidang Proposal.");
                          // Update stepper progress mahasiswa
                          await progressApi.updateStepStatus("bimbingan-pra-proposal", "completed");
                          if (onStatusChange) onStatusChange();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Ajukan Ke Sidang
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
                    <h6 className="text-sm font-semibold text-foreground">Pilih berkas akhir proposal Anda</h6>
                    <p className="text-xs text-muted-foreground mt-1">Mendukung format PDF, DOC, atau DOCX (Maksimal 10MB)</p>
                  </div>
                )}
              </div>
            ) : (
              /* Lock state overlay */
              <div className="flex flex-col items-center justify-center p-6 bg-muted/20 border border-dashed border-border/60 rounded-xl text-center">
                <Lock className="w-5 h-5 text-slate-450 mb-2" />
                <h6 className="text-xs font-bold text-slate-500">Panel Unggahan Terkunci</h6>
                <p className="text-[11px] text-muted-foreground max-w-sm mt-1 leading-relaxed">
                  Tombol ini akan aktif secara otomatis jika total bimbingan Anda sudah <strong>8/8 approved</strong> dan kedua dosen pembimbing memberikan tanda kelayakan.
                </p>
              </div>
            )}
          </div>

          {/* ================= SCHEDULING MODAL FOR LECTURER ================= */}
          {schedulingSession && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-150">
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-muted/25">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                      Persetujuan Sesi {schedulingSession.id}
                    </span>
                    <h5 className="text-sm font-semibold text-foreground mt-0.5 truncate">
                      Setujui & Jadwalkan Sesi Bimbingan
                    </h5>
                  </div>
                  <button
                    onClick={() => setSchedulingSession(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted font-bold text-xs cursor-pointer animate-in fade-in"
                  >
                    ✕
                  </button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4">
                  <div className="bg-muted/30 p-3 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Materi yang Diajukan</span>
                    <p className="text-xs font-semibold text-foreground leading-normal">
                      {schedulingSession.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Tanggal
                      </label>
                      <input
                        type="date"
                        value={approvalStartDate}
                        onChange={(e) => setApprovalStartDate(e.target.value)}
                        className="w-full text-xs border border-border/80 rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary/50 outline-none bg-background text-foreground transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Jam
                      </label>
                      <input
                        type="time"
                        value={approvalStartTime}
                        onChange={(e) => setApprovalStartTime(e.target.value)}
                        className="w-full text-xs border border-border/80 rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary/50 outline-none bg-background text-foreground transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={async () => {
                        if (!approvalStartDate || !approvalStartTime) {
                          alert("Silakan tentukan tanggal dan jam bimbingan.");
                          return;
                        }
                        const response = await approveSessionWorkflow(schedulingSession.id, {
                          startDate: approvalStartDate,
                          startTime: approvalStartTime,
                        });
                        setApprovalStartDate("");
                        setApprovalStartTime("10:00");
                        setSchedulingSession(null);
                        setData(normalizeApprovedSession(response.data, schedulingSession.id));
                        triggerGuidanceToast(`Sesi ke-${schedulingSession.id} berhasil dijadwalkan & disetujui.`);
                      }}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Konfirmasi Jadwal
                    </button>
                    <button
                      onClick={() => setSchedulingSession(null)}
                      className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
    </div>
  );
};
