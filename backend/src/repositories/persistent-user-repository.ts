import crypto from "node:crypto";
import type { DatabaseAdapter } from "../database/schema";
import type {
  FinalProjectRegistration,
  LecturerDirectoryItem,
  StudentDirectoryItem,
  StudentStep,
  UserAccount,
  UserRecord,
  UserRole,
} from "../domain/types";
import { hashPassword } from "../security/password";
import type { UserRepository } from "./contracts";

const toUserAccount = (record: UserRecord): UserAccount => {
  const { passwordHash: _passwordHash, ...account } = record;
  return account;
};

const activeRegistrationStatuses = [
  "Draft",
  "Menunggu Validasi Koordinator",
  "Disetujui",
] as const;

const byNewestRegistration = (
  left: FinalProjectRegistration,
  right: FinalProjectRegistration
) => {
  const leftTime = left.updatedAt || left.submittedAt || left.validatedAt || left.createdAt || left.id;
  const rightTime = right.updatedAt || right.submittedAt || right.validatedAt || right.createdAt || right.id;
  return rightTime.localeCompare(leftTime);
};

const readActiveStep = (steps: StudentStep[]) => {
  const active = steps.find((step) => step.status === "active");
  if (active) {
    return active;
  }

  if (steps.length > 0 && steps.every((step) => step.status === "completed")) {
    return null;
  }

  return steps.find((step) => step.status !== "completed") || steps[0] || null;
};

const applyProfileFields = (
  user: UserRecord,
  input: Partial<UserAccount>
) => {
  if (input.phone !== undefined) user.phone = input.phone || undefined;
  if (input.address !== undefined) user.address = input.address || undefined;
  if (input.gender !== undefined) user.gender = input.gender;
  if (input.birthDate !== undefined) user.birthDate = input.birthDate || undefined;
  if (input.nim !== undefined) user.nim = input.nim || undefined;
  if (input.programStudi !== undefined) user.programStudi = input.programStudi || undefined;
  if (input.angkatan !== undefined) user.angkatan = input.angkatan || undefined;
  if (input.kelas !== undefined) user.kelas = input.kelas || undefined;
  if (input.skemaTA !== undefined) user.skemaTA = input.skemaTA;
  if (input.jenisTA !== undefined) user.jenisTA = input.jenisTA || undefined;
  if (input.nidn !== undefined) user.nidn = input.nidn || undefined;
  if (input.bidangKeahlian !== undefined) user.bidangKeahlian = input.bidangKeahlian;
  if (input.jabatanAkademik !== undefined) user.jabatanAkademik = input.jabatanAkademik || undefined;
  if (input.peranSistem !== undefined) user.peranSistem = input.peranSistem;
  if (input.jabatan !== undefined) user.jabatan = input.jabatan || undefined;
  if (input.hakAksesUtama !== undefined) user.hakAksesUtama = input.hakAksesUtama;
  if (input.divisi !== undefined) user.divisi = input.divisi || undefined;
  if (input.tingkatAkses !== undefined) user.tingkatAkses = input.tingkatAkses;
  if (input.cakupanAkses !== undefined) user.cakupanAkses = input.cakupanAkses;
};

export class PersistentUserRepository implements UserRepository {
  constructor(private readonly database: DatabaseAdapter) {}

  list() {
    return this.database.read().users.map(toUserAccount);
  }

  listLecturerDirectory() {
    const state = this.database.read();
    const activeAssignments = state.finalProjectRegistrations.flatMap((registration) =>
      registration.status === "Disetujui"
        ? registration.supervisorAssignments.filter((assignment) => assignment.status === "Aktif")
        : []
    );

    return state.users
      .filter((user) => user.role === "dosen" && user.status === "Aktif")
      .map((user): LecturerDirectoryItem => {
        const profile = state.lecturerProfiles[user.id];
        return {
          id: user.id,
          name: user.name,
          identifier: user.identifier,
          email: user.email,
          status: user.status,
          nidn: profile?.nidn || user.identifier,
          expertise: profile?.expertise,
          programStudi: "S1 Farmasi",
          jabatan: profile?.expertise
            ? `Dosen ${profile.expertise}`
            : "Dosen Pembimbing",
          quotaLimit: profile?.quotaLimit ?? 8,
          p1Active: activeAssignments.filter(
            (assignment) =>
              assignment.lecturerId === user.id && assignment.supervisorOrder === 1
          ).length,
          p2Active: activeAssignments.filter(
            (assignment) =>
              assignment.lecturerId === user.id && assignment.supervisorOrder === 2
          ).length,
          completedCount: 0,
        };
      });
  }

  updateLecturerQuota(
    lecturerId: string,
    input: { quotaLimit: number; actorId: string; timestamp: string }
  ) {
    this.database.update((state) => {
      const user = state.users.find((item) => item.id === lecturerId);
      if (!user) {
        return;
      }

      const profile = state.lecturerProfiles[lecturerId];
      state.lecturerProfiles[lecturerId] = {
        userId: lecturerId,
        nidn: profile?.nidn || user.identifier,
        expertise: profile?.expertise,
        quotaLimit: input.quotaLimit,
        updatedAt: input.timestamp,
        updatedBy: input.actorId,
      };
    });

    return this.listLecturerDirectory().find((item) => item.id === lecturerId) || null;
  }

  listStudentDirectory(options: { lecturerId?: string | null } = {}) {
    const state = this.database.read();

    return state.users
      .filter((user) => user.role === "mahasiswa" && user.status === "Aktif")
      .map((user): StudentDirectoryItem => {
        const workflow =
          state.studentWorkflows[user.id] ||
          state.studentWorkflow;
        const activeStep = readActiveStep(workflow.progressSteps as StudentStep[]);
        const registration = state.finalProjectRegistrations
          .filter(
            (item) =>
              item.studentId === user.id &&
              activeRegistrationStatuses.includes(item.status as typeof activeRegistrationStatuses[number])
          )
          .sort(byNewestRegistration)[0];
        const supervisor1 = registration?.supervisorAssignments.find(
          (assignment) => assignment.supervisorOrder === 1 && assignment.status === "Aktif"
        );
        const supervisor2 = registration?.supervisorAssignments.find(
          (assignment) => assignment.supervisorOrder === 2 && assignment.status === "Aktif"
        );
        const supervisorRole =
          options.lecturerId && supervisor1?.lecturerId === options.lecturerId
            ? "pembimbing-1"
            : options.lecturerId && supervisor2?.lecturerId === options.lecturerId
              ? "pembimbing-2"
              : null;

        return {
          id: user.id,
          name: user.name,
          identifier: user.identifier,
          email: user.email,
          status: user.status,
          nim: user.identifier,
          thesisTitle: registration?.judulTA || "Tugas Akhir belum diajukan",
          activeStepId: activeStep?.id || null,
          activeStepLabel: activeStep?.label || "Selesai",
          activeStepStatus: activeStep?.status || null,
          isCompleted: !activeStep,
          supervisor1Id: supervisor1?.lecturerId || null,
          supervisor1Name: supervisor1?.lecturerName,
          supervisor2Id: supervisor2?.lecturerId || null,
          supervisor2Name: supervisor2?.lecturerName,
          supervisorRole,
        };
      });
  }

  replaceAll(records: UserAccount[]) {
    return this.database.update((state) => {
      state.users = records.map((record) => {
        const existing = state.users.find((user) => user.id === record.id);
        const plainPassword =
          typeof record.password === "string" && record.password.trim().length > 0
            ? record.password.trim()
            : null;
        const passwordChangedAt = plainPassword
          ? null
          : record.passwordChangedAt ?? existing?.passwordChangedAt ?? null;
        const firstLoginCompletedAt = plainPassword
          ? null
          : record.firstLoginCompletedAt ?? existing?.firstLoginCompletedAt ?? null;

        return {
          ...record,
          password: undefined,
          passwordHash: plainPassword
            ? hashPassword(plainPassword)
            : existing?.passwordHash || hashPassword("demo"),
          passwordStatus: plainPassword
            ? "needs_activation"
            : record.passwordStatus || existing?.passwordStatus || "active",
          forceChangeOnLogin:
            plainPassword ? true : record.forceChangeOnLogin ?? existing?.forceChangeOnLogin ?? false,
          lastLoginAt: record.lastLoginAt ?? existing?.lastLoginAt ?? null,
          firstLoginCompletedAt,
          passwordChangedAt,
        };
      });
      const userIds = new Set(state.users.map((user) => user.id));
      state.userRoles = [
        ...state.userRoles.filter((assignment) => userIds.has(assignment.userId)),
      ];
      state.users.forEach((user) => {
        if (
          !state.userRoles.some(
            (assignment) => assignment.userId === user.id && assignment.role === user.role
          )
        ) {
          state.userRoles.push({
            userId: user.id,
            role: user.role,
            status: user.status,
            createdAt: new Date().toISOString(),
            createdBy: null,
          });
        }
      });
    }).users.map(toUserAccount);
  }

  createUser(
    input: Omit<UserAccount, "id"> & {
      id?: string;
      password?: string;
      actorId: string;
      timestamp: string;
    }
  ) {
    const plainPassword =
      typeof input.password === "string" && input.password.trim().length > 0
        ? input.password.trim()
        : "demo";
    let created: UserRecord | null = null;

    this.database.update((state) => {
      const id = input.id || crypto.randomUUID();
      created = {
        id,
        role: input.role,
        identifier: input.identifier,
        name: input.name,
        email: input.email,
        status: input.status || "Aktif",
        passwordHash: hashPassword(plainPassword),
        passwordStatus: "needs_activation",
        forceChangeOnLogin: true,
        lastLoginAt: null,
        firstLoginCompletedAt: null,
        passwordChangedAt: null,
      };
      applyProfileFields(created, input);
      state.users.unshift(created);
      state.userRoles.push({
        userId: id,
        role: input.role,
        status: input.status || "Aktif",
        createdAt: input.timestamp,
        createdBy: input.actorId,
      });
    });

    if (!created) {
      throw new Error("User gagal dibuat.");
    }

    return toUserAccount(created);
  }

  updateUser(
    userId: string,
    input: Partial<Omit<UserAccount, "id">> & {
      password?: string;
      actorId: string;
      timestamp: string;
    }
  ) {
    let updated: UserRecord | null = null;

    this.database.update((state) => {
      updated = state.users.find((user) => user.id === userId) || null;
      if (!updated) {
        return;
      }

      if (input.name !== undefined) updated.name = input.name;
      if (input.identifier !== undefined) updated.identifier = input.identifier;
      if (input.email !== undefined) updated.email = input.email || undefined;
      if (input.role !== undefined) updated.role = input.role;
      if (input.status !== undefined) updated.status = input.status;
      applyProfileFields(updated, input);

      const plainPassword =
        typeof input.password === "string" && input.password.trim().length > 0
          ? input.password.trim()
          : null;
      if (plainPassword) {
        updated.passwordHash = hashPassword(plainPassword);
        updated.passwordStatus = "needs_activation";
        updated.forceChangeOnLogin = true;
        updated.firstLoginCompletedAt = null;
        updated.passwordChangedAt = null;
      }

      if (input.role || input.status) {
        const role = input.role || updated.role;
        const status = input.status || updated.status;
        const existingAssignment = state.userRoles.find(
          (assignment) => assignment.userId === userId && assignment.role === role
        );
        if (existingAssignment) {
          existingAssignment.status = status;
        } else {
          state.userRoles.push({
            userId,
            role,
            status,
            createdAt: input.timestamp,
            createdBy: input.actorId,
          });
        }
      }
    });

    return updated ? toUserAccount(updated) : null;
  }

  updateStatus(
    userId: string,
    input: {
      status: UserAccount["status"];
      actorId: string;
      timestamp: string;
    }
  ) {
    return this.updateUser(userId, input);
  }

  resetPassword(
    userId: string,
    input: {
      password: string;
      actorId: string;
      timestamp: string;
    }
  ) {
    return this.updateUser(userId, {
      password: input.password,
      actorId: input.actorId,
      timestamp: input.timestamp,
    });
  }

  findById(id: string) {
    const record = this.database.read().users.find((user) => user.id === id);
    return record ? toUserAccount(record) : null;
  }

  findByIdentifier(identifier: string) {
    const record = this.findAuthRecordByIdentifier(identifier);
    return record ? toUserAccount(record) : null;
  }

  findAuthRecordById(id: string) {
    return this.database.read().users.find((user) => user.id === id) || null;
  }

  findAuthRecordByIdentifier(identifier: string) {
    const normalized = identifier.toLowerCase();

    return (
      this.database
        .read()
        .users.find(
          (user) =>
            user.identifier.toLowerCase() === normalized ||
            user.role.toLowerCase() === normalized
        ) || null
    );
  }

  touchLastLogin(userId: string, timestamp: string) {
    let updated: UserRecord | null = null;

    this.database.update((state) => {
      updated = state.users.find((user) => user.id === userId) || null;
      if (updated) {
        updated.lastLoginAt = timestamp;
      }
    });

    return updated ? toUserAccount(updated) : null;
  }

  updateProfile(
    userId: string,
    input: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      gender?: UserAccount["gender"];
      birthDate?: string;
      nim?: string;
      programStudi?: string;
      angkatan?: string;
      kelas?: string;
      skemaTA?: UserAccount["skemaTA"];
      jenisTA?: string;
      nidn?: string;
      bidangKeahlian?: string[];
      jabatanAkademik?: string;
      peranSistem?: string[];
      jabatan?: string;
      hakAksesUtama?: string[];
      divisi?: string;
      tingkatAkses?: UserAccount["tingkatAkses"];
      cakupanAkses?: string[];
      actorId: string;
      timestamp: string;
    }
  ) {
    let updated: UserRecord | null = null;

    this.database.update((state) => {
      updated = state.users.find((user) => user.id === userId) || null;
      if (!updated) {
        return;
      }

      if (input.name) {
        updated.name = input.name;
      }
      if (input.email !== undefined) {
        updated.email = input.email || undefined;
      }
      if (input.phone !== undefined) {
        updated.phone = input.phone || undefined;
      }
      if (input.address !== undefined) {
        updated.address = input.address || undefined;
      }
      if (input.gender !== undefined) {
        updated.gender = input.gender;
      }
      if (input.birthDate !== undefined) {
        updated.birthDate = input.birthDate || undefined;
      }
      if (input.nim !== undefined) updated.nim = input.nim || undefined;
      if (input.programStudi !== undefined) updated.programStudi = input.programStudi || undefined;
      if (input.angkatan !== undefined) updated.angkatan = input.angkatan || undefined;
      if (input.kelas !== undefined) updated.kelas = input.kelas || undefined;
      if (input.skemaTA !== undefined) updated.skemaTA = input.skemaTA;
      if (input.jenisTA !== undefined) updated.jenisTA = input.jenisTA || undefined;
      if (input.nidn !== undefined) updated.nidn = input.nidn || undefined;
      if (input.bidangKeahlian !== undefined) updated.bidangKeahlian = input.bidangKeahlian;
      if (input.jabatanAkademik !== undefined) updated.jabatanAkademik = input.jabatanAkademik || undefined;
      if (input.peranSistem !== undefined) updated.peranSistem = input.peranSistem;
      if (input.jabatan !== undefined) updated.jabatan = input.jabatan || undefined;
      if (input.hakAksesUtama !== undefined) updated.hakAksesUtama = input.hakAksesUtama;
      if (input.divisi !== undefined) updated.divisi = input.divisi || undefined;
      if (input.tingkatAkses !== undefined) updated.tingkatAkses = input.tingkatAkses;
      if (input.cakupanAkses !== undefined) updated.cakupanAkses = input.cakupanAkses;
    });

    return updated ? toUserAccount(updated) : null;
  }

  getRoles(userId: string) {
    const state = this.database.read();
    const activeRoles = state.userRoles
      .filter((assignment) => assignment.userId === userId && assignment.status === "Aktif")
      .map((assignment) => assignment.role);
    const user = state.users.find((record) => record.id === userId);

    if (activeRoles.length > 0) {
      return Array.from(new Set(activeRoles));
    }

    return user && user.status === "Aktif" ? [user.role] : [];
  }

  completeFirstLogin(userId: string, passwordHash: string, completedAt: string) {
    let updated: UserRecord | null = null;

    this.database.update((state) => {
      updated = state.users.find((user) => user.id === userId) || null;
      if (updated) {
        updated.passwordHash = passwordHash;
        updated.passwordStatus = "active";
        updated.forceChangeOnLogin = false;
        updated.firstLoginCompletedAt = completedAt;
        updated.passwordChangedAt = completedAt;
      }
    });

    return updated ? toUserAccount(updated) : null;
  }

  getPermissions(role: UserRole) {
    return this.database.read().permissionsByRole[role];
  }
}
