import React from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { CoordinatorStatCards } from '../components/CoordinatorStatCards';
import { QuickActionList } from '../components/QuickActionList';
import { SectionCard } from '../../../components/ui/SectionCard';
import { AgendaTerdekat } from '../../student/components/dashboard/UpcomingAgenda';
import { FileText, GraduationCap, CalendarDays, Bell } from 'lucide-react';

export const CoordinatorDashboardPage: React.FC = () => {
  const quickActions = [
    { label: 'Validasi Pengajuan Baru', count: 5, path: 'kordinator/pengajuan', icon: <FileText className="w-4 h-4 text-primary" /> },
    { label: 'Validasi Seminar Proposal', count: 2, path: 'kordinator/tahapan-akademik', icon: <GraduationCap className="w-4 h-4 text-purple-600" /> },
    { label: 'Tetapkan Jadwal Sidang', count: 1, path: 'kordinator/penjadwalan', icon: <CalendarDays className="w-4 h-4 text-amber-600" /> },
  ];

  const recentNotifications = [
    { label: 'Budi Santoso merevisi pengajuan TA', path: 'kordinator/pengajuan/detail/sub-1', icon: <Bell className="w-4 h-4 text-primary" /> },
    { label: 'Siti Aminah mengunggah dokumen Sempro', path: 'kordinator/tahapan-akademik', icon: <Bell className="w-4 h-4 text-primary" /> },
    { label: 'Jadwal sidang Andi Wijaya disetujui Penguji', path: 'kordinator/penjadwalan', icon: <Bell className="w-4 h-4 text-primary" /> },
  ];

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
        title="Dashboard Koordinator" 
        description="Ringkasan kondisi sistem manajemen tugas akhir dan tindakan prioritas"
      >
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* Greeting Card */}
          <div className="p-6 bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Selamat Datang, Koordinator</h2>
            <p className="text-muted-foreground">
              Berikut adalah ringkasan status tugas akhir seluruh mahasiswa dan daftar tindakan yang memerlukan perhatian Anda segera.
            </p>
          </div>

          {/* Stats Bar */}
          <CoordinatorStatCards />

          {/* 2 Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Kiri: Action & Notification */}
            <div className="space-y-6">
              <QuickActionList title="Tindakan Diperlukan" actions={quickActions} />
              <QuickActionList title="Notifikasi Terbaru" actions={recentNotifications} />
            </div>

            {/* Kanan: Kuota & Agenda */}
            <div className="space-y-6">
              <SectionCard title="Ringkasan Kuota Dosen">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="font-medium text-muted-foreground">Total Dosen Pembimbing</span>
                    <span className="font-bold text-lg">15</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2 text-rose-600 dark:text-rose-400">
                    <span className="font-medium">Dosen dengan Kuota Penuh</span>
                    <span className="font-bold text-lg">3</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="font-medium">Dosen Tersedia (Ada Sisa Kuota)</span>
                    <span className="font-bold text-lg">12</span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Agenda Terdekat">
                <div className="space-y-4">
                  <AgendaTerdekat
                    agenda="Seminar Proposal - Andi Wijaya"
                    tanggal="Rabu, 08 April 2026"
                    waktu="09.00 - 10.30 WIB"
                    ruang="Ruang Sidang Dosen 203"
                    lokasi="Gedung Teknik Informatika"
                    roleLabel="Koordinator"
                  />
                  <AgendaTerdekat
                    agenda="Sidang Akhir Skripsi - Rina Marlina"
                    tanggal="Kamis, 09 April 2026"
                    waktu="13.30 - 15.00 WIB"
                    ruang="Ruang Sidang Utama 101"
                    lokasi="Gedung Rektorat"
                    roleLabel="Koordinator"
                  />
                </div>
              </SectionCard>
            </div>
            
          </div>

        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorDashboardPage;
