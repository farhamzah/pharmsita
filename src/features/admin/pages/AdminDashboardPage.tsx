import React from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import { SectionCard } from '../../../components/ui/SectionCard';
import Button from '../../../components/ui/Button';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  FileText, 
  UserPlus, 
  CheckCircle,
  Database,
  FileCheck,
  UploadCloud,
  Monitor,
  Calendar,
  Info,
  Clock
} from 'lucide-react';

const mockStats = [
  { label: 'Total Mahasiswa', value: '142', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: 'Total Dosen', value: '24', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Koordinator', value: '2', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { label: 'Akun Baru (Bulan Ini)', value: '18', icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'Dokumen & Panduan', value: '12', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100' },
];

const mockActivities = [
  { id: 1, action: 'Menambahkan User Baru', detail: 'Dr. Apt. Andi Setiawan (Dosen) berhasil ditambahkan.', time: '2 jam yang lalu', type: 'user' },
  { id: 2, action: 'Upload Dokumen', detail: 'Template Proposal TA v2.0 telah diperbarui.', time: 'Kemarin, 14:30', type: 'doc' },
  { id: 3, action: 'Update Syarat & Ketentuan', detail: 'Menambahkan syarat "Bukti Bebas Lab" pada Sidang Akhir.', time: 'Kemarin, 09:15', type: 'terms' },
  { id: 4, action: 'Import Data Mahasiswa', detail: '15 data mahasiswa angkatan 2022 berhasil di-import.', time: '2 hari yang lalu', type: 'user' },
];

const mockOperationalStatus = [
  { label: 'Periode Berjalan', value: 'Genap 2025/2026', icon: Calendar, active: true },
  { label: 'Tahapan Aktif', value: 'Pendaftaran & Seminar', icon: CheckCircle, active: true },
  { label: 'Total Dokumen', value: '12 File Template', icon: FileCheck, active: false },
  { label: 'Total Panduan/Info', value: '8 Pengumuman', icon: Info, active: false },
];

const AdminDashboardPage: React.FC = () => {
  return (
    <MainLayout>
      <ContentWrapper
        title="Dashboard Administrator"
        description="Ringkasan operasional sistem PharmSITA (Tugas Akhir Prodi Farmasi)."
        headerRight={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shadow-sm text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Periode: Genap 2025/2026
          </div>
        }
      >
        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          {mockStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex items-center gap-4 hover:border-primary/20 transition-all">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none mb-1">{stat.value}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KIRI: Aktivitas Terkini */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title="Aktivitas Admin Terbaru" className="h-full shadow-sm border border-border/50">
              <div className="space-y-4">
                {mockActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                    <div className="mt-0.5">
                      {activity.type === 'user' && <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Users size={16} /></div>}
                      {activity.type === 'doc' && <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full"><FileText size={16} /></div>}
                      {activity.type === 'terms' && <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><CheckCircle size={16} /></div>}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-0.5">{activity.action}</p>
                      <p className="text-sm text-muted-foreground mb-2">{activity.detail}</p>
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock size={12} /> {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* KANAN: Status & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Status Operasional */}
            <SectionCard title="Status Operasional" className="shadow-sm border border-border/50 bg-card">
              <div className="flex flex-col gap-3">
                {mockOperationalStatus.map((status, idx) => {
                  const SIcon = status.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                      <div className={`p-2 rounded-md ${status.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <SIcon size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-0.5">{status.label}</p>
                        <p className={`text-sm font-bold ${status.active ? 'text-foreground' : 'text-foreground'}`}>{status.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Quick Actions */}
            <SectionCard title="Aksi Cepat" className="shadow-sm border border-border/50 bg-primary/5 border-primary/10">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto flex-col gap-2 py-4 border-primary/20 hover:bg-primary/10 hover:text-primary">
                  <UserPlus size={20} />
                  <span className="text-xs font-semibold">Tambah User</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4 border-primary/20 hover:bg-primary/10 hover:text-primary">
                  <Database size={20} />
                  <span className="text-xs font-semibold">Data Master</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4 border-primary/20 hover:bg-primary/10 hover:text-primary">
                  <FileCheck size={20} />
                  <span className="text-xs font-semibold">Update Syarat</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4 border-primary/20 hover:bg-primary/10 hover:text-primary">
                  <UploadCloud size={20} />
                  <span className="text-xs font-semibold">Upload Dok.</span>
                </Button>
                <Button variant="outline" className="col-span-2 h-auto flex gap-2 py-3 border-primary/20 hover:bg-primary/10 hover:text-primary justify-center bg-background">
                  <Monitor size={18} />
                  <span className="text-sm font-semibold">Monitoring Sistem</span>
                </Button>
              </div>
            </SectionCard>
            
          </div>
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default AdminDashboardPage;
