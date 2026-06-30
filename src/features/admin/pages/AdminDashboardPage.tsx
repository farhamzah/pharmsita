import React from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import { SectionCard } from '../../../components/ui/SectionCard';
import Button from '../../../components/ui/Button';
import { adminApi, type ListResponse } from '../../../core/api/domain';
import type { AdminAccount, AdminMasterRecord } from '../../../core/services/admin-data-service';
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

const emptyList = <T,>(): ListResponse<T> => ({
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
});

const normalizeRole = (role: unknown) => String(role || '').trim().toLowerCase();

const isActiveRecord = (record: AdminMasterRecord) =>
  record.status === 'Aktif' || record.isActive === true || record.is_active === true;

const AdminDashboardPage: React.FC = () => {
  const [users, setUsers] = React.useState<AdminAccount[]>([]);
  const [periods, setPeriods] = React.useState<AdminMasterRecord[]>([]);
  const [documents, setDocuments] = React.useState<AdminMasterRecord[]>([]);
  const [requirements, setRequirements] = React.useState<AdminMasterRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;

    Promise.all([
      adminApi.listUsers().catch(() => emptyList<AdminAccount>()),
      adminApi.listAcademicPeriods().catch(() => emptyList<AdminMasterRecord>()),
      adminApi.listSupportingDocuments().catch(() => emptyList<AdminMasterRecord>()),
      adminApi.listRequirementDefinitions().catch(() => emptyList<AdminMasterRecord>()),
    ])
      .then(([userResponse, periodResponse, documentResponse, requirementResponse]) => {
        if (!isMounted) return;
        setUsers(userResponse.data || []);
        setPeriods(periodResponse.data || []);
        setDocuments(documentResponse.data || []);
        setRequirements(requirementResponse.data || []);
        setError('');
      })
      .catch(() => {
        if (!isMounted) return;
        setUsers([]);
        setPeriods([]);
        setDocuments([]);
        setRequirements([]);
        setError('Data dashboard belum bisa dimuat.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const studentCount = users.filter((user) => normalizeRole(user.role) === 'mahasiswa').length;
  const lecturerCount = users.filter((user) => normalizeRole(user.role) === 'dosen').length;
  const coordinatorCount = users.filter((user) => ['koordinator', 'kordinator'].includes(normalizeRole(user.role))).length;
  const activePeriod = periods.find(isActiveRecord);
  const activePeriodLabel = activePeriod
    ? [activePeriod.semester, activePeriod.name || activePeriod.code].filter(Boolean).join(' ')
    : 'Belum diatur';
  const accountCreatedThisMonth = users.filter((user) => {
    if (normalizeRole(user.role) === 'admin' || user.identifier === 'superadmin') return false;
    const rawDate = user.createdAt || user.created_at;
    if (!rawDate) return false;
    const createdAt = new Date(rawDate);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    { label: 'Total Mahasiswa', value: String(studentCount), icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total Dosen', value: String(lecturerCount), icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Koordinator', value: String(coordinatorCount), icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Akun Baru (Bulan Ini)', value: String(accountCreatedThisMonth), icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Dokumen & Panduan', value: String(documents.length), icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  const operationalStatus = [
    { label: 'Periode Berjalan', value: activePeriodLabel, icon: Calendar, active: Boolean(activePeriod) },
    { label: 'Tahapan Aktif', value: requirements.length > 0 ? 'Persyaratan tersedia' : 'Belum ada data', icon: CheckCircle, active: requirements.length > 0 },
    { label: 'Total Dokumen', value: `${documents.length} Dokumen`, icon: FileCheck, active: documents.length > 0 },
    { label: 'Total Syarat', value: `${requirements.length} Syarat`, icon: Info, active: requirements.length > 0 },
  ];

  return (
    <MainLayout>
      <ContentWrapper
        title="Dashboard Administrator"
        description="Ringkasan operasional sistem PharmSITA (Tugas Akhir Prodi Farmasi)."
        headerRight={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shadow-sm text-sm font-semibold">
            <span className={`w-2 h-2 rounded-full ${activePeriod ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
            Periode: {isLoading ? 'Memuat...' : activePeriodLabel}
          </div>
        }
      >
        {error && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        )}

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex items-center gap-4 hover:border-primary/20 transition-all">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none mb-1">{isLoading ? '-' : stat.value}</p>
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
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-center">
                <div>
                  <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">Belum ada aktivitas admin</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aktivitas akan muncul setelah admin mulai membuat akun, mengisi master data, atau memvalidasi workflow.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* KANAN: Status & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Status Operasional */}
            <SectionCard title="Status Operasional" className="shadow-sm border border-border/50 bg-card">
              <div className="flex flex-col gap-3">
                {operationalStatus.map((status, idx) => {
                  const SIcon = status.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                      <div className={`p-2 rounded-md ${status.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <SIcon size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-0.5">{status.label}</p>
                        <p className="text-sm font-bold text-foreground">{isLoading ? 'Memuat...' : status.value}</p>
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
