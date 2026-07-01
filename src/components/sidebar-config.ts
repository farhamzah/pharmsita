import type { Role } from "../types/roles";
import {
  Users,
  LayoutDashboard,
  FileText,
  GraduationCap,
  FileEdit,
  CalendarDays,
  Activity,
  Bell,
  Database,
  Info,
  Settings,
  ClipboardCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MenuItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

const coordinatorMenu: MenuItem[] = [
  { label: 'Dashboard', path: 'kordinator', icon: LayoutDashboard },
  { label: 'Validasi Persyaratan', path: 'kordinator/validasi-persyaratan', icon: ClipboardCheck },
  { label: 'Pengajuan', path: 'kordinator/pengajuan', icon: FileText },
  { label: 'Tahapan Akademik', path: 'kordinator/tahapan-akademik', icon: GraduationCap },
  { label: 'Penjadwalan & Penguji', path: 'kordinator/penjadwalan', icon: CalendarDays },
  { label: 'Pembimbing & Kuota', path: 'kordinator/pembimbing-kuota', icon: Users },
  { label: 'Monitoring', path: 'kordinator/monitoring', icon: Activity },
  { label: 'Notifikasi', path: 'kordinator/notifikasi', icon: Bell },
];

export const sidebarConfig: Record<Role, MenuItem[]> = {
  mahasiswa: [
    { label: 'Proses TA', path: 'mahasiswa', icon: GraduationCap },
  ],

  dosen: [
    { label: 'Dashboard', path: 'dosen', icon: LayoutDashboard },
    { label: 'Mahasiswa Bimbingan', path: 'dosen/mahasiswa-bimbingan', icon: Users },
    { label: 'Jadwal & Penilaian', path: 'dosen/jadwal', icon: CalendarDays },
    { label: 'Bimbingan Revisi', path: 'dosen/bimbingan-revisi', icon: FileEdit },
    { label: 'Dokumen', path: 'dosen/dokumen', icon: FileText },
    { label: 'Monitoring', path: 'dosen/monitoring', icon: Activity },
  ],

  admin: [
    { label: 'Dashboard', path: 'admin', icon: LayoutDashboard },
    { label: 'Kelola Akun', path: 'admin/user', icon: Users },
    { label: 'Data Master', path: 'admin/master', icon: Database },
    // --- Menu Akademik (Reuse fitur Koordinator) ---
    { label: 'Validasi Persyaratan', path: 'admin/validasi-persyaratan', icon: ClipboardCheck },
    { label: 'Pengajuan', path: 'admin/pengajuan', icon: FileText },
    { label: 'Tahapan Akademik', path: 'admin/tahapan-akademik', icon: GraduationCap },
    { label: 'Penjadwalan & Penguji', path: 'admin/penjadwalan', icon: CalendarDays },
    { label: 'Pembimbing & Kuota', path: 'admin/pembimbing-kuota', icon: Users },
    // --- Menu Admin ---
    { label: 'Informasi & Panduan', path: 'admin/informasi', icon: Info },
    { label: 'Dokumen Pendukung', path: 'admin/dokumen', icon: FileText },
    { label: 'Pengaturan Sistem', path: 'admin/pengaturan', icon: Settings },
    { label: 'Monitoring', path: 'admin/monitoring', icon: Activity },
  ],

  kordinator: coordinatorMenu,
  kaprodi: coordinatorMenu,
  dekan: coordinatorMenu,
};
