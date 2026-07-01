import React, { useEffect, useMemo, useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { CoordinatorStatCards } from '../components/CoordinatorStatCards';
import { QuickActionList } from '../components/QuickActionList';
import { SectionCard } from '../../../components/ui/SectionCard';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle,
  FileText,
  GraduationCap,
  Loader2,
  Users,
} from 'lucide-react';
import {
  coordinatorWorkflowApi,
  type CoordinatorLifecycleSummaryItem,
  type LecturerDirectoryItem,
} from '../../../core/api/domain';
import { navigateTo } from '../../../router/Router';

const lifecycleFallback: CoordinatorLifecycleSummaryItem[] = [];

const summarizeLecturerQuota = (lecturers: LecturerDirectoryItem[]) => {
  const full = lecturers.filter(
    (lecturer) =>
      lecturer.quotaLimit > 0 &&
      Math.max(lecturer.p1Active, lecturer.p2Active) >= lecturer.quotaLimit
  ).length;

  return {
    total: lecturers.length,
    full,
    available: Math.max(0, lecturers.length - full),
  };
};

const formatLifecycleStatus = (status: string) =>
  status
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const CoordinatorDashboardPage: React.FC = () => {
  const [lifecycleSummary, setLifecycleSummary] =
    useState<CoordinatorLifecycleSummaryItem[]>(lifecycleFallback);
  const [isLifecycleLoading, setIsLifecycleLoading] = useState(true);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [lifecycleSource, setLifecycleSource] = useState<string>('api');
  const [quotaSummary, setQuotaSummary] = useState({
    total: 0,
    full: 0,
    available: 0,
  });

  useEffect(() => {
    let isMounted = true;

    coordinatorWorkflowApi
      .getLifecycleSummary()
      .then((response) => {
        if (!isMounted) return;

        setLifecycleSummary(response.data);
        setLifecycleSource(response.meta?.source || 'api');
        setLifecycleError(null);
      })
      .catch((error) => {
        if (!isMounted) return;

        setLifecycleSummary([]);
        setLifecycleSource('api');
        setLifecycleError(
          error instanceof Error
            ? error.message
            : 'Ringkasan lifecycle belum bisa dimuat.'
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLifecycleLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    coordinatorWorkflowApi
      .listLecturers()
      .then((response) => {
        if (!isMounted) return;
        setQuotaSummary(summarizeLecturerQuota(response.data));
      })
      .catch(() => {
        if (!isMounted) return;
        setQuotaSummary({ total: 0, full: 0, available: 0 });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const lifecycleTotals = useMemo(
    () =>
      lifecycleSummary.reduce(
        (totals, item) => ({
          students: totals.students + item.studentCount,
          active: totals.active + item.activeThesisCount,
          completed: totals.completed + item.completedThesisCount,
          proposalSeminar:
            totals.proposalSeminar +
            (item.stageCode === 'PROPOSAL_SEMINAR' ? item.studentCount : 0),
        }),
        { students: 0, active: 0, completed: 0, proposalSeminar: 0 }
      ),
    [lifecycleSummary]
  );

  const maxLifecycleStudents = Math.max(
    1,
    ...lifecycleSummary.map((item) => item.studentCount)
  );

  const quickActions = [
    { label: 'Validasi Pengajuan Baru', count: 0, path: 'kordinator/pengajuan', icon: <FileText className="w-4 h-4 text-primary" /> },
    { label: 'Validasi Seminar Proposal', count: lifecycleTotals.proposalSeminar, path: 'kordinator/tahapan-akademik', icon: <GraduationCap className="w-4 h-4 text-purple-600" /> },
    { label: 'Tetapkan Jadwal Sidang', count: 0, path: 'kordinator/penjadwalan', icon: <CalendarDays className="w-4 h-4 text-amber-600" /> },
  ];

  const dashboardStats = [
    {
      title: 'Mahasiswa Terpantau',
      count: lifecycleTotals.students,
      icon: <Users className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-100',
      text: 'text-sky-700',
    },
    {
      title: 'Aktif Tugas Akhir',
      count: lifecycleTotals.active,
      icon: <Activity className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
    },
    {
      title: 'Seminar Proposal',
      count: lifecycleTotals.proposalSeminar,
      icon: <GraduationCap className="w-5 h-5 text-violet-600" />,
      bg: 'bg-violet-100',
      text: 'text-violet-700',
    },
    {
      title: 'Selesai TA',
      count: lifecycleTotals.completed,
      icon: <CheckCircle className="w-5 h-5 text-teal-600" />,
      bg: 'bg-teal-100',
      text: 'text-teal-700',
    },
  ];

  const recentNotifications: {
    label: string;
    path: string;
    icon: React.ReactNode;
  }[] = [];

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
          <CoordinatorStatCards stats={dashboardStats} />

          <SectionCard
            title={
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span>Ringkasan Lifecycle Tugas Akhir</span>
              </div>
            }
            collapsible={false}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total</p>
                    <p className="text-xl font-bold">{lifecycleTotals.students}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Aktif</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{lifecycleTotals.active}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Selesai</p>
                    <p className="text-xl font-bold text-teal-700 dark:text-teal-300">{lifecycleTotals.completed}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isLifecycleLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Memuat data lifecycle...</span>
                    </>
                  ) : lifecycleError ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      <span>{lifecycleError}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Sinkron dari {lifecycleSource}.</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {lifecycleSummary.length === 0 ? (
                  <div className="lg:col-span-2 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada data lifecycle tugas akhir.
                  </div>
                ) : lifecycleSummary.map((item) => {
                  const width = `${Math.max(8, Math.round((item.studentCount / maxLifecycleStudents) * 100))}%`;

                  return (
                    <button
                      type="button"
                      key={`${item.stageCode}-${item.lifecycleStatus}`}
                      onClick={() =>
                        navigateTo(
                          `kordinator/monitoring?stage=${encodeURIComponent(item.stageCode)}`
                        )
                      }
                      className="rounded-lg border border-border/60 bg-background p-3 text-left transition hover:border-primary/60 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" title={item.stageName}>
                            {item.stageName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatLifecycleStatus(item.lifecycleStatus)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{item.studentCount}</p>
                          <p className="text-[11px] text-muted-foreground">mahasiswa</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Aktif: {item.activeThesisCount}</span>
                        <span>Selesai: {item.completedThesisCount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

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
                    <span className="font-bold text-lg">{quotaSummary.total}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2 text-rose-600 dark:text-rose-400">
                    <span className="font-medium">Dosen dengan Kuota Penuh</span>
                    <span className="font-bold text-lg">{quotaSummary.full}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="font-medium">Dosen Tersedia (Ada Sisa Kuota)</span>
                    <span className="font-bold text-lg">{quotaSummary.available}</span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Agenda Terdekat">
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada agenda terdekat.
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
