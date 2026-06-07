import { storageService } from "../../services/storage-service";
import { apiClient, mockApiAdapter } from "../api-client";
import type { MeResponse } from "./auth-api";

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  alamat?: string;
  gender?: "Laki-laki" | "Perempuan";
  birthDate?: string;
  tanggalLahir?: string;
  nim?: string;
  programStudi?: string;
  angkatan?: string;
  kelas?: string;
  skemaTA?: "Skripsi" | "Non Skripsi";
  jenisTA?: string;
  nidn?: string;
  bidangKeahlian?: string[] | string;
  jabatanAkademik?: string;
  peranSistem?: string[] | string;
  jabatan?: string;
  hakAksesUtama?: string[] | string;
  divisi?: string;
  tingkatAkses?: "Superadmin" | "Admin Prodi";
  cakupanAkses?: string[] | string;
}

const mockProfileKey = "mock_profile_update";

mockApiAdapter.register("GET", "/auth/profile", () => {
  const stored = storageService.get<Partial<MeResponse["user"]>>(mockProfileKey) || {};
  return {
    user: {
      id: "mock-profile-user",
      role: "mahasiswa",
      name: "PharmSITA User",
      identifier: "mock-profile-user",
      email: "user@pharmsita.local",
      status: "Aktif",
      ...stored,
    },
    availableRoles: ["mahasiswa"],
    permissions: ["student.workflow.read", "student.workflow.submit"],
  } satisfies MeResponse;
});

mockApiAdapter.register<ProfileUpdateRequest>("PATCH", "/auth/profile", ({ body }) => {
  const current = storageService.get<Partial<MeResponse["user"]>>(mockProfileKey) || {};
  const updated = {
    ...current,
    name: body?.name || current.name || "PharmSITA User",
    email: body?.email || current.email || "user@pharmsita.local",
    phone: body?.phone || current.phone,
    address: body?.address || body?.alamat || current.address,
    gender: body?.gender || current.gender,
    birthDate: body?.birthDate || body?.tanggalLahir || current.birthDate,
    nim: body?.nim || current.nim,
    programStudi: body?.programStudi || current.programStudi,
    angkatan: body?.angkatan || current.angkatan,
    kelas: body?.kelas || current.kelas,
    skemaTA: body?.skemaTA || current.skemaTA,
    jenisTA: body?.jenisTA || current.jenisTA,
    nidn: body?.nidn || current.nidn,
    bidangKeahlian: Array.isArray(body?.bidangKeahlian)
      ? body?.bidangKeahlian
      : body?.bidangKeahlian
        ? String(body.bidangKeahlian).split(",").map((item) => item.trim()).filter(Boolean)
        : current.bidangKeahlian,
    jabatanAkademik: body?.jabatanAkademik || current.jabatanAkademik,
    peranSistem: Array.isArray(body?.peranSistem)
      ? body?.peranSistem
      : body?.peranSistem
        ? String(body.peranSistem).split(",").map((item) => item.trim()).filter(Boolean)
        : current.peranSistem,
    jabatan: body?.jabatan || current.jabatan,
    hakAksesUtama: Array.isArray(body?.hakAksesUtama)
      ? body?.hakAksesUtama
      : body?.hakAksesUtama
        ? String(body.hakAksesUtama).split(",").map((item) => item.trim()).filter(Boolean)
        : current.hakAksesUtama,
    divisi: body?.divisi || current.divisi,
    tingkatAkses: body?.tingkatAkses || current.tingkatAkses,
    cakupanAkses: Array.isArray(body?.cakupanAkses)
      ? body?.cakupanAkses
      : body?.cakupanAkses
        ? String(body.cakupanAkses).split(",").map((item) => item.trim()).filter(Boolean)
        : current.cakupanAkses,
  };

  storageService.set(mockProfileKey, updated);
  return {
    user: {
      id: "mock-profile-user",
      role: "mahasiswa",
      identifier: "mock-profile-user",
      status: "Aktif",
      ...updated,
    },
    availableRoles: ["mahasiswa"],
    permissions: ["student.workflow.read", "student.workflow.submit"],
  } satisfies MeResponse;
});

export const profileApi = {
  get() {
    return apiClient.get<MeResponse>("/auth/profile");
  },
  update(payload: ProfileUpdateRequest) {
    return apiClient.patch<MeResponse, ProfileUpdateRequest>("/auth/profile", payload);
  },
};
