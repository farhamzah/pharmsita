import type {
  AcademicPeriod,
  ChairApprovalStatus,
  ExamResultStatus,
  ExamStatus,
  FinalProjectRegistrationStatus,
  GuidanceMaterial,
  GuidanceMaterialStatus,
  GuidanceRequestStatus,
  GuidanceSessionStatus,
  GuidanceType,
  RequirementDefinition,
  RequirementBundle,
  RequirementItem,
  RequirementStatus,
  RevisionItemStatus,
  SupportingDocument,
  ThesisType,
  ThesisSubmission,
  UserAccount,
  UserRole,
  UserStatus,
  StepStatus,
} from "../domain/types";
import { validationError } from "../http/errors";

type Details = Record<string, string[]>;
type UnknownRecord = Record<string, unknown>;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const addError = (details: Details, path: string, message: string) => {
  details[path] ||= [];
  details[path].push(message);
};

const ensureRecord = (value: unknown, path: string, details: Details) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addError(details, path, "Harus berupa object.");
    return {};
  }

  return value as UnknownRecord;
};

const requiredString = (
  record: UnknownRecord,
  key: string,
  path: string,
  details: Details
) => {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    addError(details, `${path}.${key}`, "Wajib diisi.");
    return "";
  }

  return value.trim();
};

const optionalString = (record: UnknownRecord, key: string) => {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
};

const optionalBoolean = (record: UnknownRecord, key: string, fallback = false) => {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
};

const optionalTrimmedString = (record: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value.trim();
    }
  }

  return undefined;
};

const optionalStringArray = (record: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return undefined;
};

const requiredBoolean = (
  record: UnknownRecord,
  key: string,
  path: string,
  details: Details
) => {
  const value = record[key];
  if (typeof value !== "boolean") {
    addError(details, `${path}.${key}`, "Harus bernilai boolean.");
    return false;
  }

  return value;
};

const readEnum = <T extends string>(
  record: UnknownRecord,
  key: string,
  allowed: readonly T[],
  path: string,
  details: Details
) => {
  const value = record[key];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    addError(details, `${path}.${key}`, `Harus salah satu dari: ${allowed.join(", ")}.`);
    return allowed[0];
  }

  return value as T;
};

const assertNoErrors = (details: Details) => {
  if (Object.keys(details).length > 0) {
    throw validationError("Payload tidak valid.", details);
  }
};

const requiredArray = (body: unknown, resourceName: string) => {
  if (!Array.isArray(body)) {
    throw validationError("Payload tidak valid.", {
      body: [`${resourceName} harus berupa array.`],
    });
  }

  return body;
};

const normalizeRole = (value: string): UserRole | null => {
  const normalized = value.toLowerCase().trim();
  const slug = normalized.replace(/[_\s]+/g, "-");
  const map: Record<string, UserRole> = {
    mahasiswa: "mahasiswa",
    dosen: "dosen",
    admin: "admin",
    kordinator: "koordinator",
    koordinator: "koordinator",
    coordinator: "koordinator",
  };

  return map[normalized] || map[slug] || null;
};

const normalizeStatus = (value: string): UserStatus | null => {
  const normalized = value.toLowerCase();
  if (normalized === "aktif") {
    return "Aktif";
  }

  if (["nonaktif", "non aktif", "tidak aktif"].includes(normalized)) {
    return "Nonaktif";
  }

  return null;
};

export const validateLoginRequest = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const identifier = requiredString(record, "identifier", "body", details);
  const password = requiredString(record, "password", "body", details);

  assertNoErrors(details);
  return { identifier, password };
};

export const validateRefreshRequest = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const refreshToken = requiredString(record, "refreshToken", "body", details);

  assertNoErrors(details);
  return { refreshToken };
};

export const validateRoleSelectionRequest = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const loginChallengeId = requiredString(record, "loginChallengeId", "body", details);
  const roleRaw = requiredString(record, "role", "body", details);
  const role = normalizeRole(roleRaw);

  if (!role) {
    addError(details, "body.role", "Role tidak dikenal.");
  }

  assertNoErrors(details);
  return { loginChallengeId, role: role || "mahasiswa" };
};

export const validateFirstLoginRequest = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const loginChallengeId = requiredString(record, "loginChallengeId", "body", details);
  const roleRaw = requiredString(record, "role", "body", details);
  const newPassword = requiredString(record, "newPassword", "body", details);
  const role = normalizeRole(roleRaw);

  if (!role) {
    addError(details, "body.role", "Role tidak dikenal.");
  }

  if (newPassword.length < 8) {
    addError(details, "body.newPassword", "Minimal 8 karakter.");
  }

  assertNoErrors(details);
  return { loginChallengeId, role: role || "mahasiswa", newPassword };
};

export const validateProfileUpdate = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const name = optionalTrimmedString(record, ["name", "nama"]);
  const email = optionalTrimmedString(record, ["email"]);
  const phone = optionalTrimmedString(record, ["phone", "telepon", "noHpWhatsapp"]);
  const address = optionalTrimmedString(record, ["address", "alamat"]);
  const gender = optionalTrimmedString(record, ["gender", "jenisKelamin"]);
  const birthDate = optionalTrimmedString(record, ["birthDate", "tanggalLahir"]);
  const nim = optionalTrimmedString(record, ["nim"]);
  const programStudi = optionalTrimmedString(record, ["programStudi"]);
  const angkatan = optionalTrimmedString(record, ["angkatan"]);
  const kelas = optionalTrimmedString(record, ["kelas"]);
  const skemaTA = optionalTrimmedString(record, ["skemaTA"]);
  const jenisTA = optionalTrimmedString(record, ["jenisTA"]);
  const nidn = optionalTrimmedString(record, ["nidn"]);
  const bidangKeahlian = optionalStringArray(record, ["bidangKeahlian", "expertise"]);
  const jabatanAkademik = optionalTrimmedString(record, ["jabatanAkademik"]);
  const peranSistem = optionalStringArray(record, ["peranSistem"]);
  const jabatan = optionalTrimmedString(record, ["jabatan"]);
  const hakAksesUtama = optionalStringArray(record, ["hakAksesUtama"]);
  const divisi = optionalTrimmedString(record, ["divisi"]);
  const tingkatAkses = optionalTrimmedString(record, ["tingkatAkses"]);
  const cakupanAkses = optionalStringArray(record, ["cakupanAkses"]);

  if (name !== undefined && name.length < 2) {
    addError(details, "body.name", "Nama minimal 2 karakter.");
  }

  if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addError(details, "body.email", "Format email tidak valid.");
  }

  if (gender !== undefined && gender && !["Laki-laki", "Perempuan"].includes(gender)) {
    addError(details, "body.gender", "Jenis kelamin harus Laki-laki atau Perempuan.");
  }

  if (birthDate !== undefined && birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    addError(details, "body.birthDate", "Tanggal lahir harus format YYYY-MM-DD.");
  }

  if (skemaTA !== undefined && skemaTA && !["Skripsi", "Non Skripsi"].includes(skemaTA)) {
    addError(details, "body.skemaTA", "Skema TA harus Skripsi atau Non Skripsi.");
  }

  if (tingkatAkses !== undefined && tingkatAkses && !["Superadmin", "Admin Prodi"].includes(tingkatAkses)) {
    addError(details, "body.tingkatAkses", "Tingkat akses harus Superadmin atau Admin Prodi.");
  }

  assertNoErrors(details);
  return {
    name: name || undefined,
    email: email || undefined,
    phone: phone || undefined,
    address: address || undefined,
    gender: (gender || undefined) as UserAccount["gender"],
    birthDate: birthDate || undefined,
    nim: nim || undefined,
    programStudi: programStudi || undefined,
    angkatan: angkatan || undefined,
    kelas: kelas || undefined,
    skemaTA: (skemaTA || undefined) as UserAccount["skemaTA"],
    jenisTA: jenisTA || undefined,
    nidn: nidn || undefined,
    bidangKeahlian,
    jabatanAkademik: jabatanAkademik || undefined,
    peranSistem,
    jabatan: jabatan || undefined,
    hakAksesUtama,
    divisi: divisi || undefined,
    tingkatAkses: (tingkatAkses || undefined) as UserAccount["tingkatAkses"],
    cakupanAkses,
  };
};

const readAdminProfileFields = (
  record: UnknownRecord,
  details: Details,
  path: string
) => {
  const phone = optionalTrimmedString(record, ["phone", "telepon", "noHpWhatsapp"]);
  const address = optionalTrimmedString(record, ["address", "alamat"]);
  const gender = optionalTrimmedString(record, ["gender", "jenisKelamin"]);
  const birthDate = optionalTrimmedString(record, ["birthDate", "tanggalLahir"]);
  const nim = optionalTrimmedString(record, ["nim"]);
  const programStudi = optionalTrimmedString(record, ["programStudi"]);
  const angkatan = optionalTrimmedString(record, ["angkatan"]);
  const kelas = optionalTrimmedString(record, ["kelas"]);
  const skemaTA = optionalTrimmedString(record, ["skemaTA"]);
  const jenisTA = optionalTrimmedString(record, ["jenisTA"]);
  const nidn = optionalTrimmedString(record, ["nidn"]);
  const bidangKeahlian = optionalStringArray(record, ["bidangKeahlian", "expertise"]);
  const jabatanAkademik = optionalTrimmedString(record, ["jabatanAkademik"]);
  const peranSistem = optionalStringArray(record, ["peranSistem"]);
  const jabatan = optionalTrimmedString(record, ["jabatan"]);
  const hakAksesUtama = optionalStringArray(record, ["hakAksesUtama"]);
  const divisi = optionalTrimmedString(record, ["divisi"]);
  const tingkatAkses = optionalTrimmedString(record, ["tingkatAkses"]);
  const cakupanAkses = optionalStringArray(record, ["cakupanAkses"]);

  if (gender !== undefined && gender && !["Laki-laki", "Perempuan"].includes(gender)) {
    addError(details, `${path}.gender`, "Jenis kelamin harus Laki-laki atau Perempuan.");
  }

  if (birthDate !== undefined && birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    addError(details, `${path}.birthDate`, "Tanggal lahir harus format YYYY-MM-DD.");
  }

  if (skemaTA !== undefined && skemaTA && !["Skripsi", "Non Skripsi"].includes(skemaTA)) {
    addError(details, `${path}.skemaTA`, "Skema TA harus Skripsi atau Non Skripsi.");
  }

  if (tingkatAkses !== undefined && tingkatAkses && !["Superadmin", "Admin Prodi"].includes(tingkatAkses)) {
    addError(details, `${path}.tingkatAkses`, "Tingkat akses harus Superadmin atau Admin Prodi.");
  }

  return {
    phone: phone || undefined,
    address: address || undefined,
    gender: (gender || undefined) as UserAccount["gender"],
    birthDate: birthDate || undefined,
    nim: nim || undefined,
    programStudi: programStudi || undefined,
    angkatan: angkatan || undefined,
    kelas: kelas || undefined,
    skemaTA: (skemaTA || undefined) as UserAccount["skemaTA"],
    jenisTA: jenisTA || undefined,
    nidn: nidn || undefined,
    bidangKeahlian,
    jabatanAkademik: jabatanAkademik || undefined,
    peranSistem,
    jabatan: jabatan || undefined,
    hakAksesUtama,
    divisi: divisi || undefined,
    tingkatAkses: (tingkatAkses || undefined) as UserAccount["tingkatAkses"],
    cakupanAkses,
  };
};

export const validateAdminUserCreate = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const name = requiredString(record, "name", "body", details);
  const identifier = requiredString(record, "identifier", "body", details);
  const roleRaw = requiredString(record, "role", "body", details);
  const statusRaw = optionalString(record, "status") || "Aktif";
  const email = optionalTrimmedString(record, ["email"]);
  const password = optionalString(record, "password");
  const role = normalizeRole(roleRaw);
  const status = normalizeStatus(statusRaw);
  const profile = readAdminProfileFields(record, details, "body");

  if (name.length < 2) {
    addError(details, "body.name", "Nama minimal 2 karakter.");
  }

  if (!role) {
    addError(details, "body.role", "Role tidak dikenal.");
  }

  if (!status) {
    addError(details, "body.status", "Status harus Aktif atau Nonaktif.");
  }

  if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addError(details, "body.email", "Format email tidak valid.");
  }

  if (password && password.length < 8) {
    addError(details, "body.password", "Password awal minimal 8 karakter.");
  }

  assertNoErrors(details);
  return {
    name,
    identifier,
    role: role || "mahasiswa",
    status: status || "Aktif",
    email: email || undefined,
    password,
    ...profile,
  };
};

export const validateAdminUserUpdate = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const name = optionalTrimmedString(record, ["name"]);
  const identifier = optionalTrimmedString(record, ["identifier"]);
  const roleRaw = optionalTrimmedString(record, ["role"]);
  const statusRaw = optionalTrimmedString(record, ["status"]);
  const email = optionalTrimmedString(record, ["email"]);
  const password = optionalString(record, "password");
  const role = roleRaw ? normalizeRole(roleRaw) : undefined;
  const status = statusRaw ? normalizeStatus(statusRaw) : undefined;
  const profile = readAdminProfileFields(record, details, "body");

  if (name !== undefined && name.length < 2) {
    addError(details, "body.name", "Nama minimal 2 karakter.");
  }

  if (roleRaw && !role) {
    addError(details, "body.role", "Role tidak dikenal.");
  }

  if (statusRaw && !status) {
    addError(details, "body.status", "Status harus Aktif atau Nonaktif.");
  }

  if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addError(details, "body.email", "Format email tidak valid.");
  }

  if (password && password.length < 8) {
    addError(details, "body.password", "Password reset minimal 8 karakter.");
  }

  assertNoErrors(details);
  return {
    name,
    identifier,
    role: role || undefined,
    status: status || undefined,
    email,
    password,
    ...profile,
  };
};

export const validateAdminUserStatusUpdate = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statusRaw = requiredString(record, "status", "body", details);
  const status = normalizeStatus(statusRaw);

  if (!status) {
    addError(details, "body.status", "Status harus Aktif atau Nonaktif.");
  }

  assertNoErrors(details);
  return { status: status || "Aktif" };
};

export const validateAdminUserPasswordReset = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const password = requiredString(record, "password", "body", details);

  if (password.length < 8) {
    addError(details, "body.password", "Password reset minimal 8 karakter.");
  }

  assertNoErrors(details);
  return { password };
};

export const validateUserAccounts = (body: unknown): UserAccount[] => {
  const details: Details = {};
  const records = requiredArray(body, "Daftar user");

  const validated = records.map((item, index) => {
    const path = `body[${index}]`;
    const record = ensureRecord(item, path, details);
    const id = requiredString(record, "id", path, details);
    const name = requiredString(record, "name", path, details);
    const identifier = requiredString(record, "identifier", path, details);
    const roleRaw = requiredString(record, "role", path, details);
    const statusRaw = requiredString(record, "status", path, details);
    const role = normalizeRole(roleRaw);
    const status = normalizeStatus(statusRaw);

    if (!role) {
      addError(details, `${path}.role`, "Role tidak dikenal.");
    }

    if (!status) {
      addError(details, `${path}.status`, "Status harus Aktif atau Nonaktif.");
    }

    const password = optionalString(record, "password");
    const passwordStatusRaw = optionalString(record, "passwordStatus");
    const passwordStatus =
      passwordStatusRaw === "needs_activation" ||
      passwordStatusRaw === "reset_requested" ||
      passwordStatusRaw === "active"
        ? passwordStatusRaw
        : password
          ? "needs_activation"
          : "active";

    if (password && password.length < 8) {
      addError(details, `${path}.password`, "Password awal/reset minimal 8 karakter.");
    }

    const { password: _password, passwordHash: _passwordHash, ...safeRecord } = record;

    return {
      ...safeRecord,
      id,
      name,
      identifier,
      role: role || "mahasiswa",
      status: status || "Aktif",
      email: optionalString(record, "email"),
      ...(password ? { password } : {}),
      passwordStatus,
      forceChangeOnLogin: password
        ? true
        : optionalBoolean(record, "forceChangeOnLogin", false),
      lastLoginAt: optionalString(record, "lastLoginAt") || null,
      firstLoginCompletedAt: password
        ? null
        : optionalString(record, "firstLoginCompletedAt") || null,
      passwordChangedAt: password
        ? null
        : optionalString(record, "passwordChangedAt") || null,
    } as UserAccount;
  });

  assertNoErrors(details);
  return validated;
};

export const validateAcademicPeriods = (body: unknown): AcademicPeriod[] => {
  const details: Details = {};
  const records = requiredArray(body, "Daftar periode akademik");
  const semesters = ["Ganjil", "Genap"] as const;
  const statuses = ["Aktif", "Selesai", "Nonaktif"] as const;

  const validated = records.map((item, index) => {
    const path = `body[${index}]`;
    const record = ensureRecord(item, path, details);

    return {
      ...record,
      id: requiredString(record, "id", path, details),
      name: requiredString(record, "name", path, details),
      semester: readEnum(record, "semester", semesters, path, details),
      startDate: requiredString(record, "startDate", path, details),
      endDate: requiredString(record, "endDate", path, details),
      status: readEnum(record, "status", statuses, path, details),
    };
  });

  assertNoErrors(details);
  return validated;
};

export const validateThesisTypes = (body: unknown): ThesisType[] => {
  const details: Details = {};
  const records = requiredArray(body, "Daftar jenis TA");
  const schemes = ["Skripsi", "Non Skripsi"] as const;
  const statuses = ["Aktif", "Nonaktif"] as const;

  const validated = records.map((item, index) => {
    const path = `body[${index}]`;
    const record = ensureRecord(item, path, details);

    return {
      ...record,
      id: requiredString(record, "id", path, details),
      name: requiredString(record, "name", path, details),
      skema: readEnum(record, "skema", schemes, path, details),
      desc: optionalString(record, "desc"),
      status: readEnum(record, "status", statuses, path, details),
    };
  });

  assertNoErrors(details);
  return validated;
};

const readAllowedTypes = (record: UnknownRecord, path: string, details: Details) => {
  const value = record.allowedTypes;

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  addError(details, `${path}.allowedTypes`, "Harus berupa array string atau teks dipisah koma.");
  return [];
};

export const validateSupportingDocuments = (body: unknown): SupportingDocument[] => {
  const details: Details = {};
  const records = requiredArray(body, "Daftar dokumen pendukung");
  const requiredOptions = ["Wajib", "Opsional"] as const;
  const statuses = ["Aktif", "Nonaktif"] as const;

  const validated = records.map((item, index) => {
    const path = `body[${index}]`;
    const record = ensureRecord(item, path, details);

    return {
      ...record,
      id: requiredString(record, "id", path, details),
      name: requiredString(record, "name", path, details),
      description: optionalString(record, "description"),
      allowedTypes: readAllowedTypes(record, path, details),
      isRequired: readEnum(record, "isRequired", requiredOptions, path, details),
      status: readEnum(record, "status", statuses, path, details),
    };
  });

  assertNoErrors(details);
  return validated;
};

export const validateRequirementDefinitions = (
  body: unknown
): RequirementDefinition[] => {
  const details: Details = {};
  const records = requiredArray(body, "Daftar definisi persyaratan");
  const stages = ["Persyaratan Awal", "Seminar Proposal", "Sidang Akhir", "Yudisium"] as const;
  const statuses = ["Aktif", "Nonaktif"] as const;

  const validated = records.map((item, index) => {
    const path = `body[${index}]`;
    const record = ensureRecord(item, path, details);

    return {
      ...record,
      id: requiredString(record, "id", path, details),
      tahap: readEnum(record, "tahap", stages, path, details),
      namaPersyaratan: requiredString(record, "namaPersyaratan", path, details),
      deskripsiAturan: optionalString(record, "deskripsiAturan"),
      wajib: requiredBoolean(record, "wajib", path, details),
      status: readEnum(record, "status", statuses, path, details),
    };
  });

  assertNoErrors(details);
  return validated;
};

export const validateProgressUpdate = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statuses = ["pending", "active", "completed"] as const;
  const status = readEnum(record, "status", statuses, "body", details) as StepStatus;

  assertNoErrors(details);
  return { status };
};

export const validateRequirementBundle = (body: unknown): RequirementBundle => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const rawRequirements = record.requirements;
  const statuses: RequirementStatus[] = [
    "Valid",
    "Menunggu Verifikasi",
    "Perlu Revisi",
    "Belum Upload",
    "Ditolak",
  ];

  if (!Array.isArray(rawRequirements)) {
    addError(details, "body.requirements", "Harus berupa array.");
  }

  const requirements: RequirementItem[] = Array.isArray(rawRequirements)
    ? rawRequirements.map((item, index) => {
        const path = `body.requirements[${index}]`;
        const requirement = ensureRecord(item, path, details);
        return {
          id: requiredString(requirement, "id", path, details),
          label: requiredString(requirement, "label", path, details),
          status: readEnum(requirement, "status", statuses, path, details),
          wajib:
            typeof requirement.wajib === "boolean" ? requirement.wajib : undefined,
          catatanKoordinator: optionalString(requirement, "catatanKoordinator"),
        };
      })
    : [];

  assertNoErrors(details);
  return {
    requirements,
    driveLink: typeof record.driveLink === "string" ? record.driveLink : "",
  };
};

export const validateThesisSubmissions = (body: unknown): ThesisSubmission[] => {
  const details: Details = {};
  const records = requiredArray(body, "Daftar pengajuan tugas akhir");
  const schemes = ["Skripsi", "Non Skripsi"] as const;
  const statuses = ["Sedang Proses Validasi", "Diterima", "Ditolak"] as const;

  const validated = records.map((item, index) => {
    const path = `body[${index}]`;
    const record = ensureRecord(item, path, details);
    return {
      id: requiredString(record, "id", path, details),
      date: requiredString(record, "date", path, details),
      skema: readEnum(record, "skema", schemes, path, details),
      jenisTA: requiredString(record, "jenisTA", path, details),
      judulTA: requiredString(record, "judulTA", path, details),
      deskripsiTA: requiredString(record, "deskripsiTA", path, details),
      pembimbing1: requiredString(record, "pembimbing1", path, details),
      pembimbing2: requiredString(record, "pembimbing2", path, details),
      status: readEnum(record, "status", statuses, path, details),
      catatanKoordinator: optionalString(record, "catatanKoordinator"),
      buktiFile: optionalString(record, "buktiFile"),
    };
  });

  assertNoErrors(details);
  return validated;
};

export const validateFinalProjectRegistrationSubmission = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const schemes = ["Skripsi", "Non Skripsi"] as const;
  const submit = optionalBoolean(record, "submit", false);
  const skema =
    typeof record.skema === "string"
      ? readEnum(record, "skema", schemes, "body", details)
      : undefined;

  const payload = {
    academicPeriodId: optionalString(record, "academicPeriodId") || null,
    requirementDriveLink:
      typeof record.requirementDriveLink === "string"
        ? record.requirementDriveLink.trim()
        : "",
    paymentProofFileRef: optionalString(record, "paymentProofFileRef"),
    paymentProofLink: optionalString(record, "paymentProofLink"),
    skema,
    thesisTypeId: optionalString(record, "thesisTypeId") || null,
    thesisTypeName: optionalString(record, "thesisTypeName"),
    judulTA: optionalString(record, "judulTA"),
    deskripsiTA: optionalString(record, "deskripsiTA"),
    requestedSupervisor1Id: optionalString(record, "requestedSupervisor1Id") || null,
    requestedSupervisor1Name: optionalString(record, "requestedSupervisor1Name"),
    submit,
  };

  if (submit) {
    if (!payload.requirementDriveLink) {
      addError(details, "body.requirementDriveLink", "Wajib diisi saat submit.");
    }

    if (!payload.paymentProofFileRef && !payload.paymentProofLink) {
      addError(
        details,
        "body.paymentProofLink",
        "Bukti kuitansi wajib diisi saat submit."
      );
    }

    if (!payload.skema) {
      addError(details, "body.skema", "Wajib diisi saat submit.");
    }

    if (!payload.thesisTypeId && !payload.thesisTypeName) {
      addError(details, "body.thesisTypeId", "Jenis TA wajib diisi saat submit.");
    }

    if (!payload.judulTA) {
      addError(details, "body.judulTA", "Wajib diisi saat submit.");
    }

    if (!payload.deskripsiTA) {
      addError(details, "body.deskripsiTA", "Wajib diisi saat submit.");
    }

    if (!payload.requestedSupervisor1Id && !payload.requestedSupervisor1Name) {
      addError(
        details,
        "body.requestedSupervisor1Id",
        "Rekomendasi pembimbing 1 wajib diisi saat submit."
      );
    }
  }

  assertNoErrors(details);
  return payload;
};

export const validateFinalProjectRegistrationValidation = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statuses = ["Disetujui", "Ditolak"] as const;
  const status = readEnum(
    record,
    "status",
    statuses,
    "body",
    details
  ) as Extract<FinalProjectRegistrationStatus, "Disetujui" | "Ditolak">;
  const coordinatorNote = optionalString(record, "catatanKoordinator");
  const pembimbing1Id = optionalString(record, "pembimbing1Id");
  const pembimbing2Id = optionalString(record, "pembimbing2Id");

  if (status === "Disetujui") {
    if (!pembimbing1Id) {
      addError(details, "body.pembimbing1Id", "Pembimbing 1 wajib diisi.");
    }

    if (!pembimbing2Id) {
      addError(details, "body.pembimbing2Id", "Pembimbing 2 wajib diisi.");
    }

    if (pembimbing1Id && pembimbing2Id && pembimbing1Id === pembimbing2Id) {
      addError(details, "body.pembimbing2Id", "Pembimbing 1 dan 2 harus berbeda.");
    }
  }

  if (status === "Ditolak" && !coordinatorNote) {
    addError(details, "body.catatanKoordinator", "Catatan wajib diisi saat ditolak.");
  }

  assertNoErrors(details);
  return {
    status,
    coordinatorNote,
    pembimbing1Id,
    pembimbing2Id,
  };
};

export const validateSupervisorAssignmentUpdate = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const pembimbing1Id = optionalString(record, "pembimbing1Id");
  const pembimbing2Id = optionalString(record, "pembimbing2Id");
  const coordinatorNote =
    optionalString(record, "coordinatorNote") ||
    optionalString(record, "catatanKoordinator");

  if (!pembimbing1Id) {
    addError(details, "body.pembimbing1Id", "Pembimbing 1 wajib diisi.");
  }

  if (!pembimbing2Id) {
    addError(details, "body.pembimbing2Id", "Pembimbing 2 wajib diisi.");
  }

  if (pembimbing1Id && pembimbing2Id && pembimbing1Id === pembimbing2Id) {
    addError(details, "body.pembimbing2Id", "Pembimbing 1 dan 2 tidak boleh sama.");
  }

  assertNoErrors(details);
  return {
    pembimbing1Id: pembimbing1Id || "",
    pembimbing2Id: pembimbing2Id || "",
    coordinatorNote,
  };
};

export const validateLecturerQuotaUpdate = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const rawQuota = record.quotaLimit ?? record.kuotaMaksimal;
  const quotaLimit =
    typeof rawQuota === "number" && Number.isFinite(rawQuota)
      ? rawQuota
      : typeof rawQuota === "string" && rawQuota.trim() !== ""
        ? Number(rawQuota)
        : Number.NaN;

  if (!Number.isInteger(quotaLimit)) {
    addError(details, "body.quotaLimit", "Kuota harus berupa bilangan bulat.");
  } else if (quotaLimit < 0) {
    addError(details, "body.quotaLimit", "Kuota tidak boleh negatif.");
  }

  assertNoErrors(details);
  return { quotaLimit };
};

export const validateDocsLink = (body: unknown, fieldName = "link") => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const link = requiredString(record, fieldName, "body", details);

  assertNoErrors(details);
  return { link };
};

export const validateFinalFile = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const fileName =
    optionalString(record, "fileName") || optionalString(record, "link") || "";

  if (!fileName) {
    addError(details, "body.fileName", "Nama file wajib diisi.");
  }

  assertNoErrors(details);
  return { fileName };
};

export const validateGuidanceApproval = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const pembimbingNum = record.pembimbingNum;

  if (pembimbingNum !== 1 && pembimbingNum !== 2) {
    addError(details, "body.pembimbingNum", "Harus bernilai 1 atau 2.");
  }

  const approved = requiredBoolean(record, "approved", "body", details);
  assertNoErrors(details);
  return { pembimbingNum: pembimbingNum as 1 | 2, approved };
};

export const validateGuidanceSessionUpdate = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statuses = ["pending", "in progress", "approved"] as const;
  const title = requiredString(record, "title", "body", details);
  const status = readEnum(record, "status", statuses, "body", details) as GuidanceSessionStatus;

  assertNoErrors(details);
  return { title, status };
};

export const validateChatMessage = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const roles = ["mahasiswa", "dosen"] as const;
  const senderName = requiredString(record, "senderName", "body", details);
  const senderRole = readEnum(record, "senderRole", roles, "body", details);
  const message = requiredString(record, "message", "body", details);

  assertNoErrors(details);
  return { senderName, senderRole, message };
};

export const validateGuidanceRequest = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const note = typeof record.note === "string" ? record.note : "";
  assertNoErrors(details);
  return { note };
};

export const validateGuidanceRequestSubmission = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const guidanceTypes = [
    "seminar-proposal",
    "sidang-akhir",
    "revisi-seminar-proposal",
    "revisi-sidang-akhir",
  ] as const;
  const guidanceType = readEnum(
    record,
    "guidanceType",
    guidanceTypes,
    "body",
    details
  ) as GuidanceType;
  const googleDocsLink =
    typeof record.googleDocsLink === "string" && record.googleDocsLink.trim() !== ""
      ? record.googleDocsLink.trim()
      : typeof record.link === "string" && record.link.trim() !== ""
        ? record.link.trim()
        : "";
  const studentNote =
    optionalString(record, "studentNote") ||
    optionalString(record, "note") ||
    optionalString(record, "catatanMahasiswa");

  if (!googleDocsLink) {
    addError(details, "body.googleDocsLink", "Link Google Docs wajib diisi.");
  }

  assertNoErrors(details);
  return { guidanceType, googleDocsLink, studentNote };
};

export const validateGuidanceRequestValidation = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statuses = ["Disetujui", "Ditolak"] as const;
  const status = readEnum(
    record,
    "status",
    statuses,
    "body",
    details
  ) as Extract<GuidanceRequestStatus, "Disetujui" | "Ditolak">;
  const lecturerNote =
    optionalString(record, "lecturerNote") ||
    optionalString(record, "catatanDosen") ||
    optionalString(record, "approvalNote");

  if (status === "Ditolak" && !lecturerNote) {
    addError(details, "body.catatanDosen", "Catatan wajib diisi saat ditolak.");
  }

  assertNoErrors(details);
  return { status, lecturerNote };
};

export const validateGuidanceMaterialSubmission = (
  body: unknown,
  sourceRevisionItemId?: string | null
) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const materialTypes = ["normal", "revision"] as const;
  const materialType = (
    sourceRevisionItemId
      ? "revision"
      : typeof record.materialType === "string"
        ? readEnum(record, "materialType", materialTypes, "body", details)
        : "normal"
  ) as GuidanceMaterial["materialType"];
  const resolvedSourceRevisionItemId =
    sourceRevisionItemId ||
    optionalString(record, "sourceRevisionItemId") ||
    null;
  const topic =
    optionalString(record, "topic") ||
    optionalString(record, "title") ||
    optionalString(record, "topik") ||
    "";
  const content =
    optionalString(record, "content") ||
    optionalString(record, "materi") ||
    optionalString(record, "penyelesaian");

  if (materialType === "normal" && !topic) {
    addError(details, "body.topic", "Topik materi wajib diisi.");
  }

  if (materialType === "revision" && !resolvedSourceRevisionItemId) {
    addError(details, "body.sourceRevisionItemId", "Item revisi wajib diisi.");
  }

  if (
    materialType === "revision" &&
    resolvedSourceRevisionItemId &&
    !uuidPattern.test(resolvedSourceRevisionItemId)
  ) {
    addError(details, "body.sourceRevisionItemId", "Item revisi harus berupa UUID.");
  }

  assertNoErrors(details);
  return {
    materialType,
    sourceRevisionItemId: resolvedSourceRevisionItemId,
    topic:
      topic ||
      (resolvedSourceRevisionItemId
        ? `Materi revisi ${resolvedSourceRevisionItemId}`
        : "Materi bimbingan"),
    content,
  };
};

export const validateGuidanceMaterialValidation = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statuses = ["Valid", "Ditolak"] as const;
  const status = readEnum(
    record,
    "status",
    statuses,
    "body",
    details
  ) as Extract<GuidanceMaterialStatus, "Valid" | "Ditolak">;
  const lecturerNote =
    optionalString(record, "lecturerNote") ||
    optionalString(record, "catatanDosen") ||
    optionalString(record, "catatan");

  if (status === "Ditolak" && !lecturerNote) {
    addError(details, "body.catatanDosen", "Catatan wajib diisi saat ditolak.");
  }

  assertNoErrors(details);
  return { status, lecturerNote };
};

export const validateGuidanceRequestApproval = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const startDate = requiredString(record, "startDate", "body", details);
  const startTime = requiredString(record, "startTime", "body", details);
  const approvalNote =
    typeof record.approvalNote === "string" ? record.approvalNote : "";

  assertNoErrors(details);
  return { startDate, startTime, approvalNote };
};

export const validateScheduleApproval = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const startDate = requiredString(record, "startDate", "body", details);
  const startTime = requiredString(record, "startTime", "body", details);

  assertNoErrors(details);
  return { startDate, startTime };
};

export const validateExamStatus = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statuses = ["belum-daftar", "menunggu-jadwal", "terjadwal", "selesai"] as const;
  const status = readEnum(record, "status", statuses, "body", details) as ExamStatus;

  assertNoErrors(details);
  return { status };
};

export const validateExamAssessment = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statuses = ["belum-dinilai", "lulus", "lulus-dengan-revisi", "tidak-lulus"] as const;
  const grade = typeof record.grade === "string" ? record.grade : null;
  const resultStatus = readEnum(record, "resultStatus", statuses, "body", details) as ExamResultStatus;

  assertNoErrors(details);
  return { grade, resultStatus };
};

export const validateStringIdBody = (body: unknown, key: string) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const value = requiredString(record, key, "body", details);

  assertNoErrors(details);
  return value;
};

export const validateRevisionItemStatus = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const statuses = ["pending", "in progress", "done"] as const;
  const status = readEnum(record, "status", statuses, "body", details) as RevisionItemStatus;

  assertNoErrors(details);
  return { status };
};

export const validateRevisionResolution = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const penyelesaian = typeof record.penyelesaian === "string" ? record.penyelesaian : "";
  const penyelesaianLink =
    typeof record.penyelesaianLink === "string" ? record.penyelesaianLink : "";

  assertNoErrors(details);
  return { penyelesaian, penyelesaianLink };
};

export const validateRevisionApproval = (body: unknown) => {
  const details: Details = {};
  const record = ensureRecord(body, "body", details);
  const roles = ["penguji1", "penguji2", "ketua-sidang"] as const;
  const chairStatuses = ["pending", "approved", "rejected"] as const;
  const role = readEnum(record, "role", roles, "body", details);
  const rawStatus = record.status;

  if (role === "ketua-sidang") {
    const status = readEnum(record, "status", chairStatuses, "body", details) as ChairApprovalStatus;
    assertNoErrors(details);
    return { role, status };
  }

  if (typeof rawStatus !== "boolean") {
    addError(details, "body.status", "Harus boolean untuk penguji.");
  }

  assertNoErrors(details);
  return { role, status: rawStatus as boolean };
};
