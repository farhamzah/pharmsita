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
import type {
  RevisiData,
  RevisiItem,
  RevisionCompletionGateStatus,
} from "../../types/revisi";
import {
  coordinatorWorkflowApi,
  guidanceApi,
  lecturerWorkflowApi,
  progressApi,
  revisionApi,
  type GuidanceMaterial,
  type GuidanceRequestAggregate,
} from "../../../../core/api/domain";
import { ApiError } from "../../../../core/api/api-types";

interface RevisiWorkflowProps {
  stageId: "revisi-proposal" | "revisi-sidang";
  role?: "mahasiswa" | "dosen";
  studentId?: string;
  useLecturerApi?: boolean;
  useCoordinatorApi?: boolean;
  onStatusChange?: () => void;
}

const formatCompletionGateError = (error: unknown, fallback: string) => {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  const details = error.payload.details as {
    completionGate?: Partial<RevisionCompletionGateStatus>;
    issues?: unknown;
  } | undefined;
  const gateReasons = Array.isArray(details?.completionGate?.blockingReasons)
    ? details.completionGate.blockingReasons.filter((issue): issue is string => typeof issue === "string")
    : [];
  const issues = gateReasons.length > 0
    ? gateReasons
    : Array.isArray(details?.issues)
    ? details.issues.filter((issue): issue is string => typeof issue === "string")
    : [];

  if (issues.length === 0) {
    return error.payload.message || fallback;
  }

  return `${error.payload.message}\n${issues.map((issue) => `- ${issue}`).join("\n")}`;
};

const buildLocalCompletionGateStatus = (workflow: RevisiData): RevisionCompletionGateStatus => {
  const doneCount = workflow.items.filter((item) => item.status === "done").length;
  const blockingReasonByCode: Record<RevisionCompletionGateStatus["checks"][number]["code"], string> = {
    REVISION_ITEMS_AVAILABLE: "Belum ada butir revisi yang bisa divalidasi.",
    REVISION_ITEMS_DONE: "Semua butir revisi harus berstatus selesai.",
    PENGUJI_1_APPROVED: "Approval Penguji 1 belum disetujui.",
    PENGUJI_2_APPROVED: "Approval Penguji 2 belum disetujui.",
    CHAIR_APPROVED: "Approval Ketua Sidang belum disetujui.",
    FINAL_FILE_UPLOADED: "Dokumen final hasil revisi belum diunggah.",
  };
  const checks: RevisionCompletionGateStatus["checks"] = [
    {
      code: "REVISION_ITEMS_AVAILABLE",
      label: "Butir revisi tersedia",
      passed: workflow.items.length > 0,
      detail:
        workflow.items.length > 0
          ? `${workflow.items.length} butir revisi tersedia`
          : "Belum ada butir revisi yang bisa divalidasi.",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "REVISION_ITEMS_DONE",
      label: "Semua butir revisi selesai",
      passed: workflow.items.length > 0 && workflow.items.every((item) => item.status === "done"),
      detail: `${doneCount}/${workflow.items.length} butir selesai`,
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "PENGUJI_1_APPROVED",
      label: "Approval Penguji 1",
      passed: workflow.penguji1Approved,
      detail: workflow.penguji1Approved ? "Disetujui" : "Belum disetujui",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "PENGUJI_2_APPROVED",
      label: "Approval Penguji 2",
      passed: workflow.penguji2Approved,
      detail: workflow.penguji2Approved ? "Disetujui" : "Belum disetujui",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "CHAIR_APPROVED",
      label: "Approval Ketua Sidang",
      passed: workflow.ketuaSidangStatus === "approved",
      detail:
        workflow.ketuaSidangStatus === "approved"
          ? "Disetujui"
          : workflow.ketuaSidangStatus === "rejected"
          ? "Ditolak"
          : "Menunggu",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "FINAL_FILE_UPLOADED",
      label: "Dokumen final hasil revisi",
      passed: Boolean(workflow.finalFile),
      detail: workflow.finalFile || "Belum diunggah",
      requiredFor: ["progress-completion"],
    },
  ];
  const finalUploadBlockingReasons = checks
    .filter((check) => check.requiredFor.includes("final-upload") && !check.passed)
    .map((check) => blockingReasonByCode[check.code]);
  const progressCompletionBlockingReasons = checks
    .filter((check) => check.requiredFor.includes("progress-completion") && !check.passed)
    .map((check) => blockingReasonByCode[check.code]);

  return {
    stageId: workflow.stageId,
    readyForFinalUpload: finalUploadBlockingReasons.length === 0,
    readyForProgressCompletion: progressCompletionBlockingReasons.length === 0,
    finalFile: workflow.finalFile,
    finalUploadBlockingReasons,
    progressCompletionBlockingReasons,
    blockingReasons: progressCompletionBlockingReasons,
    checks,
    evaluatedAt: new Date().toISOString(),
  };
};

export const RevisiWorkflow: React.FC<RevisiWorkflowProps> = ({
  stageId,
  role = "mahasiswa",
  studentId = "1",
  useLecturerApi = false,
  useCoordinatorApi = false,
  onStatusChange,
}) => {
  const isLecturerWorkflow = role === "dosen" && useLecturerApi;
  const isCoordinatorWorkflow = role === "dosen" && useCoordinatorApi;
  const [data, setData] = useState<RevisiData>(() => revisionApi.getCached(stageId));
  const [docsLink, setDocsLink] = useState(() => {
    return guidanceApi.getCached(stageId).googleDocsLink;
  });
  const [guidanceRequest, setGuidanceRequest] = useState<GuidanceRequestAggregate | null>(null);

  // States
  const [uploadFileMock, setUploadFileMock] = useState<string | null>(data.finalFile);
  const [showSimulator, setShowSimulator] = useState(false);
  const [completionGateMessage, setCompletionGateMessage] = useState<string | null>(null);
  const [completionGate, setCompletionGate] = useState<RevisionCompletionGateStatus>(() =>
    buildLocalCompletionGateStatus(data)
  );
  const [isCompletingRevision, setIsCompletingRevision] = useState(false);

  const readGuidanceRequest = () =>
    isCoordinatorWorkflow
      ? coordinatorWorkflowApi.getGuidanceRequestAggregate(studentId, stageId)
      : isLecturerWorkflow
      ? lecturerWorkflowApi.getGuidanceRequestAggregate(studentId, stageId)
      : guidanceApi.getRequestAggregate(stageId);

  const refreshGuidanceRequest = async () => {
    const response = await readGuidanceRequest();
    setGuidanceRequest(response.data);
    setDocsLink(response.data?.googleDocsLink || "");
    return response.data;
  };

  const readCompletionGate = () =>
    isCoordinatorWorkflow
      ? coordinatorWorkflowApi.getRevisionCompletionGate(studentId, stageId)
      : isLecturerWorkflow
      ? lecturerWorkflowApi.getRevisionCompletionGate(studentId, stageId)
      : revisionApi.getCompletionGate(stageId);

  const refreshCompletionGate = async (fallbackData = data) => {
    try {
      const response = await readCompletionGate();
      setCompletionGate(response.data);
      return response.data;
    } catch {
      const localGate = buildLocalCompletionGateStatus(fallbackData);
      setCompletionGate(localGate);
      return localGate;
    }
  };

  useEffect(() => {
    let mounted = true;
    const revisionRequest = isCoordinatorWorkflow
      ? coordinatorWorkflowApi.getRevision(studentId, stageId)
      : isLecturerWorkflow
      ? lecturerWorkflowApi.getRevision(studentId, stageId)
      : revisionApi.get(stageId);
    const guidanceRequestPromise = readGuidanceRequest();
    const completionGateRequest = readCompletionGate();

    Promise.allSettled([revisionRequest, guidanceRequestPromise, completionGateRequest]).then((results) => {
      if (!mounted) return;

      const [revisionResult, guidanceResult, completionGateResult] = results;
      if (revisionResult.status === "fulfilled") {
        setData(revisionResult.value.data);
        setUploadFileMock(revisionResult.value.data.finalFile);
        if (completionGateResult.status !== "fulfilled") {
          setCompletionGate(buildLocalCompletionGateStatus(revisionResult.value.data));
        }
      }
      if (guidanceResult.status === "fulfilled") {
        setGuidanceRequest(guidanceResult.value.data);
        setDocsLink(guidanceResult.value.data?.googleDocsLink || "");
      }
      if (completionGateResult.status === "fulfilled") {
        setCompletionGate(completionGateResult.value.data);
      }
    });

    return () => {
      mounted = false;
    };
  }, [stageId, studentId, isLecturerWorkflow, isCoordinatorWorkflow]);

  const refreshData = async () => {
    const response = isCoordinatorWorkflow
      ? await coordinatorWorkflowApi.getRevision(studentId, stageId)
      : isLecturerWorkflow
      ? await lecturerWorkflowApi.getRevision(studentId, stageId)
      : await revisionApi.get(stageId);
    setData(response.data);
    setUploadFileMock(response.data.finalFile);
    await refreshCompletionGate(response.data);
    await refreshGuidanceRequest().catch(() => undefined);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const getRevisionMaterialsForItem = (item: RevisiItem): GuidanceMaterial[] => {
    const sourceId = item.sourceRevisionItemId;
    return (guidanceRequest?.materials || [])
      .filter(
        (material) =>
          material.materialType === "revision" &&
          Boolean(sourceId) &&
          material.sourceRevisionItemId === sourceId
      )
      .sort((left, right) => {
        if (left.attemptNumber !== right.attemptNumber) {
          return right.attemptNumber - left.attemptNumber;
        }
        const leftTime = left.submittedAt || left.createdAt || "";
        const rightTime = right.submittedAt || right.createdAt || "";
        return rightTime.localeCompare(leftTime);
      });
  };

  const getRevisionMaterialForItem = (item: RevisiItem): GuidanceMaterial | null => {
    return getRevisionMaterialsForItem(item)[0] || null;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";

    return new Date(value).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEffectiveItemStatus = (item: RevisiItem): RevisiItem["status"] => {
    const material = getRevisionMaterialForItem(item);
    if (material?.status === "Valid") return "done";
    if (material?.status === "Diajukan") return "in progress";
    if (material?.status === "Ditolak") return "pending";
    return item.status;
  };

  const handleSubmitGuidanceRequest = async () => {
    const link =
      docsLink ||
      window.prompt("Masukkan link Google Docs bimbingan revisi:", docsLink || "") ||
      "";
    const trimmed = link.trim();

    if (!trimmed) {
      alert("Link Google Docs bimbingan revisi wajib diisi sebelum request dikirim.");
      return;
    }

    const response = await guidanceApi.submitRequest(stageId, {
      googleDocsLink: trimmed,
      studentNote: "Pengajuan bimbingan revisi untuk penyelesaian butir revisi.",
    });
    setDocsLink(response.data.googleDocsLink);
    await refreshGuidanceRequest();
  };

  const handleApproveGuidanceRequest = async () => {
    if (!guidanceRequest?.id || isCoordinatorWorkflow) return;

    const response = await lecturerWorkflowApi.validateGuidanceRequest(guidanceRequest.id, {
      status: "Disetujui",
      catatanDosen: "Bimbingan revisi disetujui.",
    });
    setDocsLink(response.data.googleDocsLink);
    await refreshGuidanceRequest();
  };

  const handleAjukanPenyelesaianDirect = async (item: RevisiItem) => {
    if (guidanceRequest?.status !== "Disetujui" || !guidanceRequest.id) {
      alert("Request bimbingan revisi harus disetujui dosen sebelum penyelesaian dikirim.");
      return;
    }

    if (!item.sourceRevisionItemId) {
      alert("Item revisi belum memiliki UUID sumber. Muat ulang data revisi lalu coba lagi.");
      return;
    }

    const existingMaterial = getRevisionMaterialForItem(item);
    if (existingMaterial?.status === "Diajukan") {
      alert("Penyelesaian revisi ini sudah diajukan dan menunggu validasi dosen.");
      return;
    }

    const penyelesaian =
      item.penyelesaian ||
      `Penyelesaian revisi: ${item.topik}. Mahasiswa telah memperbaiki naskah sesuai catatan penguji.`;
    const response = await revisionApi.submitResolution(stageId, item.id, {
      penyelesaian,
      penyelesaianLink: docsLink || guidanceRequest.googleDocsLink,
    });
    await guidanceApi.submitRevisionMaterial(guidanceRequest.id, item.sourceRevisionItemId, {
      materialType: "revision",
      sourceRevisionItemId: item.sourceRevisionItemId,
      topic: item.topik,
      content: penyelesaian,
    });
    setData(response.data);
    await refreshCompletionGate(response.data);
    await refreshGuidanceRequest();
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const handleApproveItem = async (item: RevisiItem) => {
    if (isCoordinatorWorkflow) {
      throw new Error("Coordinator revision view is read-only.");
    }

    const material = getRevisionMaterialForItem(item);
    if (isLecturerWorkflow && guidanceRequest?.id && material?.id && material.status === "Diajukan") {
      await lecturerWorkflowApi.validateGuidanceMaterial(guidanceRequest.id, material.id, {
        status: "Valid",
        catatanDosen: `Penyelesaian revisi ${item.id} valid.`,
      });
      await refreshData();
      return;
    }

    const itemResponse = isLecturerWorkflow
      ? await lecturerWorkflowApi.updateRevisionItemStatus(studentId, stageId, item.id, "done")
      : await revisionApi.updateItemStatus(stageId, item.id, "done");
    
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

  const handleRejectItem = async (item: RevisiItem) => {
    if (!isLecturerWorkflow || isCoordinatorWorkflow || !guidanceRequest?.id) {
      return;
    }

    const material = getRevisionMaterialForItem(item);
    if (!material?.id || material.status !== "Diajukan") {
      alert("Belum ada material revisi yang menunggu validasi.");
      return;
    }

    const note = window.prompt("Catatan penolakan penyelesaian revisi:", material.lecturerNote || "");
    if (!note?.trim()) return;

    await lecturerWorkflowApi.validateGuidanceMaterial(guidanceRequest.id, material.id, {
      status: "Ditolak",
      catatanDosen: note.trim(),
    });
    await refreshData();
  };

  const handleToggleExaminerApproval = async (num: 1 | 2) => {
    if (isCoordinatorWorkflow) {
      throw new Error("Coordinator revision view is read-only.");
    }

    const currentVal = num === 1 ? data.penguji1Approved : data.penguji2Approved;
    const payload = {
      role: num === 1 ? "penguji1" : "penguji2",
      status: !currentVal,
    } as const;
    const response = isLecturerWorkflow
      ? await lecturerWorkflowApi.updateRevisionApproval(studentId, stageId, payload)
      : await revisionApi.updateApproval(stageId, payload);
    setData(response.data);
    await refreshCompletionGate(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const handleToggleKetuaSidangApproval = async (status: "pending" | "approved" | "rejected") => {
    if (isCoordinatorWorkflow) {
      throw new Error("Coordinator revision view is read-only.");
    }

    const payload = {
      role: "ketua-sidang",
      status,
    } as const;
    const response = isLecturerWorkflow
      ? await lecturerWorkflowApi.updateRevisionApproval(studentId, stageId, payload)
      : await revisionApi.updateApproval(stageId, payload);
    setData(response.data);
    await refreshCompletionGate(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompletionGateMessage(null);

      try {
        const response = await revisionApi.uploadFinalFile(stageId, file.name);
        setUploadFileMock(response.data.finalFile);
        setData(response.data);
        await refreshCompletionGate(response.data);
        if (onStatusChange) {
          onStatusChange();
        }
      } catch (error) {
        const message = formatCompletionGateError(
          error,
          "Dokumen final revisi belum bisa diunggah. Periksa kembali seluruh syarat revisi."
        );
        setCompletionGateMessage(message);
        alert(message);
        await refreshData().catch(() => undefined);
      } finally {
        e.target.value = "";
      }
    }
  };

  const handleCompleteRevisionStage = async () => {
    setCompletionGateMessage(null);
    setIsCompletingRevision(true);

    try {
      await progressApi.updateStepStatus(stageId, "completed");
      await refreshData();
      alert("Tahap revisi berhasil diselesaikan. Anda kini dapat melanjutkan ke tahap berikutnya.");
    } catch (error) {
      const message = formatCompletionGateError(
        error,
        "Tahap revisi belum bisa diselesaikan. Periksa kembali seluruh syarat revisi."
      );
      setCompletionGateMessage(message);
      alert(message);
      await refreshData().catch(() => undefined);
    } finally {
      setIsCompletingRevision(false);
    }
  };

  const handleResetRevisi = async () => {
    if (isCoordinatorWorkflow) {
      await refreshData();
      return;
    }

    if (isLecturerWorkflow) {
      await refreshData();
      return;
    }

    const response = await revisionApi.reset(stageId);
    setUploadFileMock(null);
    setData(response.data);
    await refreshCompletionGate(response.data);
    if (onStatusChange) {
      onStatusChange();
    }
  };

  // Metrik counter
  const totalRevisi = data.items.length;
  const completedRevisiCount = data.items.filter((i) => getEffectiveItemStatus(i) === "done").length;
  const progressPercent = totalRevisi === 0 ? 0 : Math.round((completedRevisiCount / totalRevisi) * 100);
  const isGuidanceRequestApproved = guidanceRequest?.status === "Disetujui";
  const isGuidanceRequestWaiting = guidanceRequest?.status === "Menunggu Validasi Dosen";
  const guidanceRequestLabel = guidanceRequest
    ? guidanceRequest.status
    : "Belum Diajukan";

  // Approval penguji counter
  const approvedReviewersCount = (data.penguji1Approved ? 1 : 0) + (data.penguji2Approved ? 1 : 0);


  const isEligibleForUpload = completionGate.readyForFinalUpload;
  const isCompletionGateReady = completionGate.readyForProgressCompletion;
  const finalFileName = completionGate.finalFile || data.finalFile || uploadFileMock;
  const completionGateChecks = completionGate.checks;
  const completionGateBlockingReasons = completionGate.readyForProgressCompletion
    ? []
    : completionGate.readyForFinalUpload
    ? completionGate.progressCompletionBlockingReasons
    : completionGate.finalUploadBlockingReasons;
  const completionGateStatusLabel = completionGate.readyForProgressCompletion
    ? "Siap Diselesaikan"
    : completionGate.readyForFinalUpload
    ? "Siap Unggah Final"
    : "Belum Lengkap";
  const completionGatePanel = (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
            Sinkronisasi Penyelesaian Revisi
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {role === "mahasiswa"
              ? "Status syarat unggah final dan penyelesaian tahap."
              : "Status syarat unggah final dan completion gate mahasiswa."}
          </p>
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
            isCompletionGateReady
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : completionGate.readyForFinalUpload
              ? "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          )}
        >
          {completionGateStatusLabel}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {completionGateChecks.map((check) => (
          <div
            key={check.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/60 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-foreground truncate">{check.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{check.detail}</p>
            </div>
            <span
              className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                check.passed
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-500/10 border-slate-500/20 text-slate-500 dark:text-slate-400"
              )}
            >
              {check.passed ? "OK" : "Menunggu"}
            </span>
          </div>
        ))}
      </div>
      {completionGateBlockingReasons.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11px] font-medium leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-bold mb-1">Alasan Belum Lengkap</p>
          <ul className="space-y-1 list-disc pl-4">
            {completionGateBlockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      {completionGateMessage && role === "mahasiswa" && (
        <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 text-[11px] font-medium leading-relaxed text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 whitespace-pre-line">
          {completionGateMessage}
        </div>
      )}
    </div>
  );

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
                    await refreshCompletionGate(response.data);
                    await refreshGuidanceRequest().catch(() => undefined);
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
                    await guidanceApi.submitRequest(stageId, {
                      googleDocsLink: trimmed,
                      studentNote: "Pengajuan bimbingan revisi dengan link Google Docs terbaru.",
                    });
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

      <div
        className={cn(
          "bg-card border rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          isGuidanceRequestApproved
            ? "border-emerald-500/20 bg-emerald-500/[0.02]"
            : isGuidanceRequestWaiting
            ? "border-amber-500/25 bg-amber-500/[0.02]"
            : "border-border/80"
        )}
      >
        <div className="space-y-1 min-w-0">
          <h5 className="text-sm font-semibold text-foreground">Status Bimbingan Revisi</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isGuidanceRequestApproved
              ? "Request bimbingan revisi sudah disetujui. Penyelesaian butir revisi akan dikirim sebagai material bimbingan revisi."
              : isGuidanceRequestWaiting
              ? "Request bimbingan revisi sudah dikirim dan menunggu validasi dosen."
              : "Ajukan request bimbingan revisi sebelum mengirim penyelesaian butir revisi."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs select-none",
              isGuidanceRequestApproved &&
                "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
              isGuidanceRequestWaiting &&
                "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
              !guidanceRequest &&
                "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400"
            )}
          >
            {guidanceRequestLabel}
          </span>
          {role === "mahasiswa" && !isGuidanceRequestWaiting && !isGuidanceRequestApproved && (
            <button
              type="button"
              onClick={handleSubmitGuidanceRequest}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Ajukan Bimbingan Revisi
            </button>
          )}
          {role === "dosen" && !isCoordinatorWorkflow && isGuidanceRequestWaiting && (
            <button
              type="button"
              onClick={handleApproveGuidanceRequest}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Setujui Request Revisi
            </button>
          )}
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
            const revisionMaterialAttempts = getRevisionMaterialsForItem(item);
            const revisionMaterial = getRevisionMaterialForItem(item);
            const attemptSummary = revisionMaterial?.attemptSummary;
            const effectiveStatus = getEffectiveItemStatus(item);
            const isDone = effectiveStatus === "done";
            const isInProgress = effectiveStatus === "in progress";
            const isPending = effectiveStatus === "pending";
            const isRejected = revisionMaterial?.status === "Ditolak";

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
                      isPending && !isRejected && "bg-slate-500/10 border-slate-500/20 text-slate-550 dark:text-slate-400 dark:bg-slate-900/40",
                      isRejected && "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 dark:bg-red-950/20"
                    )}
                  >
                    {isDone ? "Selesai" : isInProgress ? "Menunggu Validasi" : isRejected ? "Ditolak" : "Belum Selesai"}
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
                  {revisionMaterial && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                      <span className="text-muted-foreground font-semibold">Material bimbingan terakhir:</span>
                      <span
                        className={cn(
                          "font-semibold px-2 py-0.5 rounded-full border",
                          revisionMaterial.status === "Valid" &&
                            "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                          revisionMaterial.status === "Diajukan" &&
                            "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
                          revisionMaterial.status === "Ditolak" &&
                            "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                        )}
                      >
                        {revisionMaterial.status}
                      </span>
                      <span className="text-muted-foreground">
                        Percobaan {attemptSummary?.latestAttemptNumber || revisionMaterial.attemptNumber}
                        {(attemptSummary?.totalAttempts || revisionMaterialAttempts.length) > 1
                          ? ` dari ${attemptSummary?.totalAttempts || revisionMaterialAttempts.length}`
                          : ""}
                      </span>
                      {revisionMaterial.validatedAt && (
                        <span className="text-muted-foreground">
                          Divalidasi {formatDateTime(revisionMaterial.validatedAt)}
                        </span>
                      )}
                    </div>
                  )}
                  {attemptSummary?.hasRejectedAttempt && attemptSummary.latestRejectedNote && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-medium leading-relaxed">
                      Catatan penolakan terakhir: {attemptSummary.latestRejectedNote}
                    </p>
                  )}
                  {revisionMaterialAttempts.length > 1 && (
                    <div className="mt-2 rounded-lg border border-border/60 bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">
                          Riwayat Attempt Material
                        </span>
                        <span className="text-[9px] text-muted-foreground font-semibold">
                          {revisionMaterialAttempts.length} percobaan
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {revisionMaterialAttempts.map((attempt) => (
                          <div
                            key={attempt.id}
                            className="rounded-md border border-border/50 bg-card/70 px-3 py-2 text-[10px] leading-relaxed"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-foreground">
                                Percobaan {attempt.attemptNumber}
                              </span>
                              <span
                                className={cn(
                                  "font-semibold px-2 py-0.5 rounded-full border",
                                  attempt.status === "Valid" &&
                                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                                  attempt.status === "Diajukan" &&
                                    "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
                                  attempt.status === "Ditolak" &&
                                    "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                                )}
                              >
                                {attempt.status}
                              </span>
                              {attempt.attemptSummary?.isLatestAttempt && (
                                <span className="text-muted-foreground font-semibold">
                                  Attempt terbaru
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              Diajukan {formatDateTime(attempt.submittedAt || attempt.createdAt)}
                              {attempt.validatedAt
                                ? ` - Divalidasi ${formatDateTime(attempt.validatedAt)}`
                                : ""}
                            </div>
                            {attempt.lecturerNote && (
                              <div
                                className={cn(
                                  "mt-1 font-medium",
                                  attempt.status === "Ditolak"
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-muted-foreground"
                                )}
                              >
                                Catatan dosen: {attempt.lecturerNote}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                      onClick={() => handleAjukanPenyelesaianDirect(item)}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isRejected ? "Ajukan Ulang Penyelesaian" : "Ajukan Penyelesaian"}
                    </button>
                  )}

                  {role === "dosen" && !isCoordinatorWorkflow && isInProgress && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApproveItem(item)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[3]" /> Setujui Penyelesaian
                      </button>
                      {revisionMaterial?.status === "Diajukan" && (
                        <button
                          type="button"
                          onClick={() => handleRejectItem(item)}
                          className="px-4 py-2 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50/40 dark:hover:bg-red-950/20 text-xs font-semibold rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Tolak
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {role !== "mahasiswa" && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
          <h5 className="text-sm font-semibold text-foreground mb-1">Gate Penyelesaian Revisi</h5>
          <p className="text-xs text-muted-foreground/95 mb-4">
            Ringkasan kesiapan mahasiswa untuk unggah dokumen final dan menyelesaikan tahap revisi.
          </p>
          {completionGatePanel}
        </div>
      )}

      {/* ================= SECTION E: UPLOAD FINAL REVISI ================= */}
      {role === "mahasiswa" && (
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <h5 className="text-sm font-semibold text-foreground mb-1">Unggah Dokumen Final Hasil Revisi</h5>
        <p className="text-xs text-muted-foreground/95 mb-4">
          Unggah naskah proposal Tugas Akhir yang sudah di-acc secara utuh oleh seluruh penguji & ketua sidang.
        </p>

        <div className="mb-4">{completionGatePanel}</div>

        {isEligibleForUpload ? (
          <div className="space-y-4">
            {finalFileName ? (
              <div className="flex items-center justify-between p-4 border border-emerald-500/25 bg-emerald-50/5 dark:bg-emerald-950/10 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h6 className="text-xs font-semibold text-foreground truncate">{finalFileName}</h6>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Naskah Hasil Revisi Selesai • PDF Document</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <label className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    Ganti Berkas
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleUploadFile} className="hidden" />
                  </label>
                  <button
                    onClick={handleCompleteRevisionStage}
                    disabled={isCompletingRevision || !completionGate.readyForProgressCompletion}
                    className="px-4 py-2 bg-emerald-650 hover:bg-emerald-750 text-white font-semibold text-xs rounded-xl shadow-xs transition hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCompletingRevision ? "Menyelesaikan..." : "Selesaikan Tahap Revisi"}
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
              {completionGateBlockingReasons.length > 0
                ? completionGateBlockingReasons.join(" ")
                : "Tombol unggahan berkas final revisi akan otomatis terbuka jika seluruh syarat revisi sudah terpenuhi."}
            </p>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
