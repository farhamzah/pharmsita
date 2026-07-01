import type {
  FinalProjectRegistration,
  FinalProjectRegistrationStatus,
} from "../../../core/api/domain";
import type {
  NonThesisType,
  SubmissionData,
  SubmissionStatus,
  ThesisScheme,
  ThesisType,
} from "../types/coordinator";

const studentProfilesById: Record<
  string,
  Pick<SubmissionData, "studentName" | "nim" | "email" | "phone" | "birthDate" | "batch">
> = {
  usr_mhs_01: {
    studentName: "Mahasiswa",
    nim: "mahasiswa",
    email: "mahasiswa@pharmsita.local",
    phone: "-",
    birthDate: "-",
    batch: "-",
  },
  mock_mahasiswa: {
    studentName: "Mahasiswa Demo",
    nim: "mahasiswa",
    email: "mahasiswa@pharmsita.local",
    phone: "-",
    birthDate: "2002-01-01",
    batch: "2022",
  },
  mock_student_budi: {
    studentName: "Mahasiswa",
    nim: "mahasiswa",
    email: "mahasiswa@pharmsita.local",
    phone: "-",
    birthDate: "-",
    batch: "-",
  },
};

const statusMap: Record<FinalProjectRegistrationStatus, SubmissionStatus> = {
  Draft: "perbaikan",
  "Menunggu Validasi Koordinator": "menunggu",
  Disetujui: "disetujui",
  Ditolak: "ditolak",
};

const toDateOnly = (value?: string | null) => {
  if (!value) return "-";
  return value.includes("T") ? value.slice(0, 10) : value;
};

const toScheme = (skema?: FinalProjectRegistration["skema"]): ThesisScheme =>
  skema === "Non Skripsi" ? "non-skripsi" : "skripsi";

const toThesisType = (name?: string): ThesisType | NonThesisType =>
  (name || "Penelitian") as ThesisType | NonThesisType;

const findSupervisor = (registration: FinalProjectRegistration, order: 1 | 2) =>
  registration.supervisorAssignments.find(
    (assignment) => assignment.supervisorOrder === order
  );

export const mapRegistrationToSubmissionData = (
  registration: FinalProjectRegistration
): SubmissionData => {
  const student = studentProfilesById[registration.studentId] || {
    studentName: registration.studentId,
    nim: registration.studentId,
    email: "-",
    phone: "-",
    birthDate: "-",
    batch: "-",
  };
  const supervisor1 = findSupervisor(registration, 1);
  const supervisor2 = findSupervisor(registration, 2);
  const validationHistory =
    registration.coordinatorNote || registration.validatedAt
      ? [
          {
            date: registration.validatedAt || registration.updatedAt || "",
            action: statusMap[registration.status],
            note: registration.coordinatorNote || "-",
            by: registration.validatedBy || "Koordinator TA",
          },
        ]
      : undefined;

  return {
    id: registration.id,
    studentId: registration.studentId,
    ...student,
    scheme: toScheme(registration.skema),
    receiptFile:
      registration.paymentProofFileRef ||
      registration.paymentProofLink ||
      "Bukti pembayaran belum tersedia",
    paymentProofLink: registration.paymentProofLink,
    requirementDriveLink: registration.requirementDriveLink,
    thesisType: toThesisType(registration.thesisTypeName),
    title: registration.judulTA || "Judul belum diisi",
    description: registration.deskripsiTA || "Deskripsi belum diisi",
    suggestedSupervisor1:
      registration.requestedSupervisor1Name || "Belum ada usulan pembimbing",
    suggestedSupervisor1Id: registration.requestedSupervisor1Id,
    status: statusMap[registration.status],
    submittedAt: toDateOnly(
      registration.submittedAt || registration.createdAt || registration.updatedAt
    ),
    validationNote: registration.coordinatorNote,
    assignedSupervisor1: supervisor1?.lecturerName,
    assignedSupervisor1Id: supervisor1?.lecturerId,
    assignedSupervisor2: supervisor2?.lecturerName,
    assignedSupervisor2Id: supervisor2?.lecturerId,
    validatedAt: toDateOnly(registration.validatedAt),
    validatedBy: registration.validatedBy || undefined,
    validationHistory,
  };
};
