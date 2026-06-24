import React, { useEffect, useMemo, useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';
import { coordinatorStudentMock } from '../../../mock-data/coordinator-ui-mocks';
import { AlertCircle, Check, Copy, Loader2, Search, X } from 'lucide-react';
import { navigateTo } from '../../../router/Router';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';
import { RevisionGateAuditPanel } from '../../shared/components/RevisionGateAuditPanel';
import {
  coordinatorWorkflowApi,
  type CoordinatorLifecycleStageCode,
  type SortDirection,
  type StudentDirectoryItem,
  type StudentDirectorySortBy,
} from '../../../core/api/domain';

interface CoordinatorMonitoringRow {
  id: string;
  nim: string;
  name: string;
  title: string;
  supervisor1: string;
  status: string;
  activeStepId: string | null;
  isCompleted: boolean;
}

const lifecycleStageFilters: Record<
  CoordinatorLifecycleStageCode,
  { label: string; activeStepId?: string | null; completed?: boolean; unregistered?: boolean }
> = {
  UNREGISTERED: {
    label: 'Belum Registrasi TA',
    activeStepId: null,
    unregistered: true,
  },
  PROPOSAL_GUIDANCE: {
    label: 'Bimbingan Proposal',
    activeStepId: 'bimbingan-pra-proposal',
  },
  PROPOSAL_SEMINAR: {
    label: 'Seminar Proposal',
    activeStepId: 'sidang-proposal',
  },
  PROPOSAL_REVISION: {
    label: 'Revisi Proposal',
    activeStepId: 'revisi-proposal',
  },
  FINAL_GUIDANCE: {
    label: 'Bimbingan Sidang Akhir',
    activeStepId: 'bimbingan-pra-sidang',
  },
  FINAL_DEFENSE: {
    label: 'Sidang Akhir',
    activeStepId: 'sidang',
  },
  FINAL_REVISION: {
    label: 'Revisi Sidang Akhir',
    activeStepId: 'revisi-sidang',
  },
  COMPLETED: {
    label: 'Selesai',
    completed: true,
  },
};

const readHashSearchParams = () =>
  new URLSearchParams(window.location.hash.split('?')[1] || '');

const readPositiveHashNumber = (
  params: URLSearchParams,
  key: string,
  fallback: number,
  allowed?: number[]
) => {
  const value = Number(params.get(key) || fallback);
  if (!Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return allowed && !allowed.includes(value) ? fallback : value;
};

const readHashStageCode = (params: URLSearchParams) => {
  const value = params.get('stage') || '';
  return value in lifecycleStageFilters ? (value as CoordinatorLifecycleStageCode) : null;
};

const readHashSortBy = (params: URLSearchParams): StudentDirectorySortBy => {
  const value = params.get('sortBy');
  return value === 'nim' || value === 'stage' || value === 'supervisor1'
    ? value
    : 'name';
};

const readHashSortDir = (params: URLSearchParams): SortDirection =>
  params.get('sortDir') === 'desc' ? 'desc' : 'asc';

const isCoordinatorMonitoringHash = () =>
  window.location.hash.replace(/^#\/?/, '').split('?')[0] ===
  'kordinator/monitoring';

const createShareUrl = () =>
  `${window.location.origin}${window.location.pathname}${window.location.hash}`;

const mapDirectoryStudentToRow = (
  student: StudentDirectoryItem
): CoordinatorMonitoringRow => ({
  id: student.id,
  nim: student.nim || student.identifier,
  name: student.name,
  title: student.thesisTitle || 'Belum mengajukan judul',
  supervisor1: student.supervisor1Name || '-',
  status: student.activeStepLabel,
  activeStepId: student.activeStepId ?? null,
  isCompleted: student.isCompleted,
});

const mapMockStudentToRow = (student: any): CoordinatorMonitoringRow => ({
  id: student.id,
  nim: student.nim,
  name: student.name,
  title: student.title,
  supervisor1: student.supervisor1 || '-',
  status: student.status,
  activeStepId: null,
  isCompleted: student.status === 'Selesai Sidang' || student.status === 'Selesai',
});

const readRowSortValue = (
  row: CoordinatorMonitoringRow,
  key: StudentDirectorySortBy
) => {
  if (key === 'nim') return row.nim;
  if (key === 'stage') return row.status;
  if (key === 'supervisor1') return row.supervisor1;
  return row.name;
};

const sortMonitoringRows = (
  rows: CoordinatorMonitoringRow[],
  key: StudentDirectorySortBy,
  direction: SortDirection
) =>
  [...rows].sort((left, right) => {
    const multiplier = direction === 'desc' ? -1 : 1;
    const primary = readRowSortValue(left, key).localeCompare(
      readRowSortValue(right, key),
      'id',
      { numeric: true, sensitivity: 'base' }
    );

    if (primary !== 0) {
      return primary * multiplier;
    }

    return left.name.localeCompare(right.name, 'id', {
      numeric: true,
      sensitivity: 'base',
    });
  });

export const CoordinatorMonitoringPage: React.FC = () => {
  const initialParams = useMemo(() => readHashSearchParams(), []);
  const [searchTerm, setSearchTerm] = useState(() => initialParams.get('q') || '');
  const [currentPage, setCurrentPage] = useState(() =>
    readPositiveHashNumber(initialParams, 'page', 1)
  );
  const [pageLimit, setPageLimit] = useState(() =>
    readPositiveHashNumber(initialParams, 'limit', 10, [2, 5, 10, 20])
  );
  const [sortBy, setSortBy] = useState<StudentDirectorySortBy>(() =>
    readHashSortBy(initialParams)
  );
  const [sortDir, setSortDir] = useState<SortDirection>(() =>
    readHashSortDir(initialParams)
  );
  const [activeStageCode, setActiveStageCode] = useState<CoordinatorLifecycleStageCode | null>(() =>
    readHashStageCode(initialParams)
  );
  const [students, setStudents] = useState<CoordinatorMonitoringRow[]>(
    coordinatorStudentMock.map(mapMockStudentToRow)
  );
  const [directoryMeta, setDirectoryMeta] = useState({
    page: 1,
    limit: pageLimit,
    total: coordinatorStudentMock.length,
    totalPages: 1,
    sortBy,
    sortDir,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const activeStageFilter = activeStageCode
    ? lifecycleStageFilters[activeStageCode]
    : null;

  useEffect(() => {
    const syncStateFromHash = () => {
      if (!isCoordinatorMonitoringHash()) {
        return;
      }

      const params = readHashSearchParams();
      setSearchTerm(params.get('q') || '');
      setCurrentPage(readPositiveHashNumber(params, 'page', 1));
      setPageLimit(readPositiveHashNumber(params, 'limit', 10, [2, 5, 10, 20]));
      setSortBy(readHashSortBy(params));
      setSortDir(readHashSortDir(params));
      setActiveStageCode(readHashStageCode(params));
    };

    window.addEventListener('hashchange', syncStateFromHash);
    return () => window.removeEventListener('hashchange', syncStateFromHash);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeStageCode) params.set('stage', activeStageCode);
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (currentPage > 1) params.set('page', String(currentPage));
    if (pageLimit !== 10) params.set('limit', String(pageLimit));
    if (sortBy !== 'name') params.set('sortBy', sortBy);
    if (sortDir !== 'asc') params.set('sortDir', sortDir);

    const query = params.toString();
    const nextHash = `#/kordinator/monitoring${query ? `?${query}` : ''}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [activeStageCode, currentPage, pageLimit, searchTerm, sortBy, sortDir]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    coordinatorWorkflowApi
      .listStudents({
        stage: activeStageCode,
        q: searchTerm.trim() || null,
        page: currentPage,
        limit: pageLimit,
        sortBy,
        sortDir,
      })
      .then((response) => {
        if (!isMounted) return;

        setStudents(response.data.map(mapDirectoryStudentToRow));
        setDirectoryMeta({
          page: response.meta?.page || currentPage,
          limit: response.meta?.limit || pageLimit,
          total: response.meta?.total ?? response.data.length,
          totalPages: response.meta?.totalPages || 1,
          sortBy: (response.meta?.sortBy as StudentDirectorySortBy | undefined) || sortBy,
          sortDir: response.meta?.sortDir || sortDir,
        });
        setLoadError(null);
      })
      .catch((error) => {
        if (!isMounted) return;

        const fallbackRows = sortMonitoringRows(
          coordinatorStudentMock
            .map(mapMockStudentToRow)
            .filter((item) => {
              const normalizedSearch = searchTerm.toLowerCase();
              const matchesSearch =
                !normalizedSearch ||
                item.name.toLowerCase().includes(normalizedSearch) ||
                item.nim.toLowerCase().includes(normalizedSearch);
              const matchesStage =
                !activeStageFilter ||
                (activeStageFilter.completed && item.isCompleted) ||
                (activeStageFilter.unregistered && !item.activeStepId && !item.isCompleted) ||
                (!!activeStageFilter.activeStepId &&
                  item.activeStepId === activeStageFilter.activeStepId);

              return matchesSearch && matchesStage;
            }),
          sortBy,
          sortDir
        );
        const start = (currentPage - 1) * pageLimit;

        setStudents(fallbackRows.slice(start, start + pageLimit));
        setDirectoryMeta({
          page: currentPage,
          limit: pageLimit,
          total: fallbackRows.length,
          totalPages: Math.max(1, Math.ceil(fallbackRows.length / pageLimit)),
          sortBy,
          sortDir,
        });
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Student directory belum bisa dimuat.'
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeStageCode, activeStageFilter, currentPage, pageLimit, searchTerm, sortBy, sortDir]);

  const filteredData = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    return students.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.nim.toLowerCase().includes(normalizedSearch);
      const matchesStage =
        !activeStageFilter ||
        (activeStageFilter.completed && item.isCompleted) ||
        (activeStageFilter.unregistered && !item.activeStepId && !item.isCompleted) ||
        (!!activeStageFilter.activeStepId &&
          item.activeStepId === activeStageFilter.activeStepId);

      return matchesSearch && matchesStage;
    });
  }, [activeStageFilter, searchTerm, students]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageLimitChange = (value: string) => {
    setPageLimit(Number(value));
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    const nextSortBy =
      key === 'nim' || key === 'name' || key === 'status' || key === 'supervisor1'
        ? key
        : null;

    if (!nextSortBy) {
      return;
    }

    const normalizedSortBy: StudentDirectorySortBy =
      nextSortBy === 'status' ? 'stage' : nextSortBy;

    if (sortBy === normalizedSortBy) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(normalizedSortBy);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const handleCopyShareLink = async () => {
    const shareUrl = createShareUrl();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error('Clipboard fallback failed');
        }
      }

      setShareStatus('copied');
      window.setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      setShareStatus('failed');
      window.setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const tableSortKey = sortBy === 'stage' ? 'status' : sortBy;

  const columns = [
    { key: 'nim', label: 'NIM', sortable: true },
    { key: 'name', label: 'Nama Mahasiswa', sortable: true },
    { key: 'title', label: 'Judul Tugas Akhir', render: (row: CoordinatorMonitoringRow) => (
      <div className="max-w-[250px] truncate" title={row.title}>{row.title}</div>
    )},
    { key: 'supervisor1', label: 'Pembimbing Utama', sortable: true },
    { key: 'status', label: 'Tahapan Saat Ini', sortable: true, render: (row: CoordinatorMonitoringRow) => {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold border inline-block w-max bg-muted/50">{row.status}</span>
        </div>
      );
    }},
    { key: 'actions', label: 'Aksi', render: (row: any) => (
      <button
        onClick={() => navigateTo(`${getCurrentRolePath()}/monitoring/detail/${row.id}`)}
        className="px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-semibold hover:bg-primary/20 transition-colors"
      >
        Lihat Detail
      </button>
    )}
  ];

  return (
    <RoleLayoutComponent>
      <ContentWrapper title="Monitoring Mahasiswa" description="Pantau progress tugas akhir seluruh mahasiswa aktif">
        <SectionCard title="Daftar Mahasiswa Aktif">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Cari berdasarkan Nama atau NIM..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-semibold text-foreground hover:bg-muted"
                aria-label="Salin link view monitoring"
                title="Salin link view monitoring"
              >
                {shareStatus === 'copied' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {shareStatus === 'copied'
                  ? 'Link tersalin'
                  : shareStatus === 'failed'
                    ? 'Gagal salin'
                    : 'Salin link view'}
              </button>
              <span className="sr-only" aria-live="polite">
                {shareStatus === 'copied'
                  ? 'Link view monitoring berhasil disalin.'
                  : shareStatus === 'failed'
                    ? 'Link view monitoring gagal disalin.'
                    : ''}
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat student directory
                </span>
              )}
              {loadError && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Fallback data lokal
                </span>
              )}
              {activeStageFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveStageCode(null);
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-semibold text-primary hover:bg-primary/15"
                >
                  {activeStageFilter.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="border border-border/50 rounded-lg overflow-hidden shadow-sm bg-card">
            <DataTable
              data={filteredData}
              columns={columns}
              sortKey={tableSortKey}
              sortDirection={sortDir}
              onSort={handleSort}
            />
          </div>
          <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span>
              Menampilkan {filteredData.length} dari {directoryMeta.total} mahasiswa
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span>Per halaman</span>
                <select
                  value={pageLimit}
                  onChange={(event) => handlePageLimitChange(event.target.value)}
                  disabled={isLoading}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {[2, 5, 10, 20].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={directoryMeta.page <= 1 || isLoading}
                className="rounded-md border border-border px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
              >
                Sebelumnya
              </button>
              <span className="min-w-24 text-center">
                {directoryMeta.page} / {directoryMeta.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(directoryMeta.totalPages, page + 1))
                }
                disabled={directoryMeta.page >= directoryMeta.totalPages || isLoading}
                className="rounded-md border border-border px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </SectionCard>
        <div className="mt-6">
          <RevisionGateAuditPanel scope="coordinator" />
        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorMonitoringPage;
