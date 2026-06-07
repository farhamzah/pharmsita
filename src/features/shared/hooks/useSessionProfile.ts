import React from "react";
import {
  authApi,
  normalizeApiRole,
  profileApi,
  type AuthUser,
} from "../../../core/api/domain";
import { AcademicStage, Roles } from "../../../mock-data/enums";
import type {
  AdminProfile,
  BaseProfile,
  CoordinatorProfile,
  LecturerProfile,
  StudentProfile,
} from "../../../mock-data/profiles";

type SessionProfileState<T extends BaseProfile> = {
  profile: T;
  isLoading: boolean;
  error: string | null;
  saveProfile: (profile: T) => Promise<T>;
};

const roleLabelForUser = (user: AuthUser): BaseProfile["role"] => {
  switch (normalizeApiRole(user.role)) {
    case "mahasiswa":
      return Roles.STUDENT;
    case "dosen":
      return Roles.LECTURER;
    case "kordinator":
      return Roles.COORDINATOR;
    case "admin":
    default:
      return Roles.ADMIN;
  }
};

const avatarFor = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

const mergeSessionProfile = <T extends BaseProfile>(
  fallback: T,
  user: AuthUser
): T => {
  const role = roleLabelForUser(user);
  const base = {
    ...fallback,
    id: user.id || fallback.id,
    name: user.name || fallback.name,
    email: user.email || fallback.email,
    phone: user.phone || fallback.phone,
    alamat: user.address || fallback.alamat,
    gender: user.gender || fallback.gender,
    tanggalLahir: user.birthDate || fallback.tanggalLahir,
    photo: avatarFor(user.name || fallback.name),
    role,
    status: user.status,
  };

  if (role === Roles.STUDENT) {
    const studentFallback = fallback as unknown as StudentProfile;
    return {
      ...base,
      nim: user.identifier || studentFallback.nim,
      programStudi: user.programStudi || studentFallback.programStudi || "S1 Farmasi",
      angkatan: user.angkatan || studentFallback.angkatan || "-",
      kelas: user.kelas || studentFallback.kelas,
      skemaTA: user.skemaTA || studentFallback.skemaTA || "Skripsi",
      jenisTA: user.jenisTA || studentFallback.jenisTA,
      tahapanAktif:
        studentFallback.tahapanAktif || AcademicStage.PENGAJUAN,
      statusPengajuan: studentFallback.statusPengajuan || "Belum Mengajukan",
    } as T;
  }

  if (role === Roles.LECTURER) {
    const lecturerFallback = fallback as unknown as LecturerProfile;
    return {
      ...base,
      nidn: user.nidn || user.identifier || lecturerFallback.nidn,
      programStudi: user.programStudi || lecturerFallback.programStudi || "S1 Farmasi",
      bidangKeahlian: user.bidangKeahlian || lecturerFallback.bidangKeahlian || [],
      jabatanAkademik: user.jabatanAkademik || lecturerFallback.jabatanAkademik || "-",
      kuotaPembimbing1: lecturerFallback.kuotaPembimbing1 ?? 0,
      kuotaTerpakaiPembimbing1:
        lecturerFallback.kuotaTerpakaiPembimbing1 ?? 0,
      kuotaTersediaPembimbing1:
        lecturerFallback.kuotaTersediaPembimbing1 ?? 0,
      kuotaPembimbing2: lecturerFallback.kuotaPembimbing2 ?? 0,
      kuotaTerpakaiPembimbing2:
        lecturerFallback.kuotaTerpakaiPembimbing2 ?? 0,
      kuotaTersediaPembimbing2:
        lecturerFallback.kuotaTersediaPembimbing2 ?? 0,
      peranSistem: user.peranSistem || lecturerFallback.peranSistem || [],
    } as T;
  }

  if (role === Roles.COORDINATOR) {
    const coordinatorFallback = fallback as unknown as CoordinatorProfile;
    return {
      ...base,
      jabatan: user.jabatan || coordinatorFallback.jabatan || "Koordinator",
      programStudi: user.programStudi || coordinatorFallback.programStudi || "S1 Farmasi",
      hakAksesUtama: user.hakAksesUtama || coordinatorFallback.hakAksesUtama || [],
    } as T;
  }

  const adminFallback = fallback as unknown as AdminProfile;
  return {
    ...base,
    divisi: user.divisi || adminFallback.divisi || "Administrasi",
    tingkatAkses: user.tingkatAkses || adminFallback.tingkatAkses || "Admin Prodi",
    cakupanAkses: user.cakupanAkses || adminFallback.cakupanAkses || [],
  } as T;
};

export const useSessionProfile = <T extends BaseProfile>(
  fallbackProfile: T
): SessionProfileState<T> => {
  const [profile, setProfile] = React.useState<T>(fallbackProfile);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const saveProfile = React.useCallback(
    async (nextProfile: T) => {
      const studentProfile = nextProfile as unknown as Partial<StudentProfile>;
      const academicProfile = nextProfile as unknown as Partial<
        StudentProfile | LecturerProfile | CoordinatorProfile
      >;
      const lecturerProfile = nextProfile as unknown as Partial<LecturerProfile>;
      const coordinatorProfile = nextProfile as unknown as Partial<CoordinatorProfile>;
      const adminProfile = nextProfile as unknown as Partial<AdminProfile>;
      const response = await profileApi.update({
        name: nextProfile.name,
        email: nextProfile.email,
        phone: nextProfile.phone,
        address: nextProfile.alamat,
        gender: nextProfile.gender,
        birthDate: nextProfile.tanggalLahir,
        nim: studentProfile.nim,
        programStudi: academicProfile.programStudi,
        angkatan: studentProfile.angkatan,
        kelas: studentProfile.kelas,
        skemaTA: studentProfile.skemaTA,
        jenisTA: studentProfile.jenisTA,
        nidn: lecturerProfile.nidn,
        bidangKeahlian: lecturerProfile.bidangKeahlian,
        jabatanAkademik: lecturerProfile.jabatanAkademik,
        peranSistem: lecturerProfile.peranSistem,
        jabatan: coordinatorProfile.jabatan,
        hakAksesUtama: coordinatorProfile.hakAksesUtama,
        divisi: adminProfile.divisi,
        tingkatAkses: adminProfile.tingkatAkses,
        cakupanAkses: adminProfile.cakupanAkses,
      });
      const merged = mergeSessionProfile(nextProfile, response.user);
      setProfile(merged);
      return merged;
    },
    []
  );

  React.useEffect(() => {
    let isActive = true;
    setProfile(fallbackProfile);
    setIsLoading(true);
    setError(null);

    authApi
      .me()
      .then((session) => {
        if (!isActive) {
          return;
        }

        setProfile(mergeSessionProfile(fallbackProfile, session.user));
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setError("Profil session belum tersedia. Menampilkan data fallback.");
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fallbackProfile]);

  return { profile, isLoading, error, saveProfile };
};
