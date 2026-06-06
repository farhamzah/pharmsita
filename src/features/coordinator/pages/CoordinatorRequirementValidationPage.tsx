import React, { useState, useMemo } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';
import {
  mockStudentValidationList,
  mockExtendedStudentRequirements,
  getStudentValidationStatus,
  type StudentValidationSummary,
} from '../../../mock-data/requirement-validation-mocks';
import {
  Search,
  Users,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  ChevronDown,
} from 'lucide-react';


// ---------- local helpers ----------
type FilterStatus = 'semua' | 'valid' | 'belum_valid';

const STATUS_PILL: Record<
  'Valid' | 'Belum Valid',
  { label: string; color: string; dot: string; icon: React.ReactNode }
> = {
  'Valid': {
    label: 'Valid',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  'Belum Valid': {
    label: 'Belum Valid',
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    dot: 'bg-slate-400',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

/** Mini progress bar component */
function MiniProgress({ validCount, totalCount }: { validCount: number; totalCount: number }) {
  const percent = totalCount === 0 ? 0 : Math.round((validCount / totalCount) * 100);
  const barColor =
    percent === 100 ? 'bg-emerald-500' :
    percent >= 60   ? 'bg-amber-500' :
    percent >= 30   ? 'bg-orange-500' :
                      'bg-rose-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
        {validCount}/{totalCount} valid
      </span>
    </div>
  );
}

/** Single student row card */
function StudentValidationCard({ student, onDetail }: { student: StudentValidationSummary; onDetail: () => void }) {
  const reqStatus = getStudentValidationStatus(student.studentId);
  const statusCfg = STATUS_PILL[reqStatus];

  // Count valid / total for this student's current active stage reqs
  const allReqs = mockExtendedStudentRequirements.filter(r => r.studentId === student.studentId);
  const validCount = allReqs.filter(r => r.status === 'Valid').length;

  return (
    <div
      onClick={onDetail}
      className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all duration-200"
    >
      {/* Avatar */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base select-none">
          {student.nama.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm truncate">{student.nama}</h3>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {student.nim} · {student.programStudi} · Angkatan {student.angkatan}
          </p>
          <p className="text-xs text-muted-foreground">
            Tahap: <span className="font-medium text-foreground">{student.tahapanAktif}</span>
          </p>
          <MiniProgress validCount={validCount} totalCount={allReqs.length || 1} />
        </div>
      </div>

      {/* Right side info */}
      <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 sm:gap-1.5 flex-shrink-0">
        {/* Drive link */}
        {student.linkBerkasDrive ? (
          <a
            href={student.linkBerkasDrive}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors bg-sky-50 dark:bg-sky-950/20 px-2.5 py-1 rounded border border-sky-100 dark:border-sky-900"
          >
            <ExternalLink className="w-3 h-3" /> Folder Drive
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">Belum ada link drive</span>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 hidden sm:block" />
    </div>
  );
}

// ---------- MAIN PAGE ----------

export const CoordinatorRequirementValidationPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('semua');
  const [filterStage, setFilterStage] = useState<string>('semua');

  // Summary counts
  const totalStudents = mockStudentValidationList.length;
  const validCount     = mockStudentValidationList.filter(s => getStudentValidationStatus(s.studentId) === 'Valid').length;
  const belumValidCount = mockStudentValidationList.filter(s => getStudentValidationStatus(s.studentId) === 'Belum Valid').length;

  const statCards = [
    { label: 'Total Mahasiswa', value: totalStudents, color: 'text-foreground', bg: 'bg-muted/50', icon: <Users className="w-5 h-5 text-primary" /> },
    { label: 'Valid', value: validCount, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
    { label: 'Belum Valid', value: belumValidCount, color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/40', icon: <XCircle className="w-5 h-5 text-slate-400" /> },
  ];

  const tabs: { id: FilterStatus; label: string; count: number }[] = [
    { id: 'semua',        label: 'Semua',        count: totalStudents },
    { id: 'valid',        label: 'Valid',        count: validCount },
    { id: 'belum_valid',  label: 'Belum Valid',  count: belumValidCount },
  ];

  const filtered = useMemo(() => {
    let list = mockStudentValidationList;

    // Filter by tab status
    if (filterStatus !== 'semua') {
      const statusMap: Record<Exclude<FilterStatus, 'semua'>, ReturnType<typeof getStudentValidationStatus>> = {
        valid:       'Valid',
        belum_valid: 'Belum Valid',
      };
      list = list.filter(s => getStudentValidationStatus(s.studentId) === statusMap[filterStatus]);
    }

    // Filter by stage
    if (filterStage !== 'semua') {
      list = list.filter(s => s.tahapanAktif === filterStage);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        s => s.nama.toLowerCase().includes(q) || s.nim.includes(q)
      );
    }

    return list;
  }, [search, filterStatus, filterStage]);

  const handleDetail = (studentId: string) => {
    window.location.hash = `#/${getCurrentRolePath()}/validasi-persyaratan/detail/${studentId}`;
  };

  return (
    <RoleLayoutComponent>
      <ContentWrapper
        title="Validasi Persyaratan Mahasiswa"
        description="Tinjau dan validasi dokumen persyaratan yang diunggah mahasiswa ke Google Drive"
      >
        <div className="space-y-6 animate-in fade-in duration-500">

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map(card => (
              <div key={card.label} className={`flex items-center gap-3 p-4 rounded-xl border border-border ${card.bg}`}>
                <div className="flex-shrink-0">{card.icon}</div>
                <div>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter + Search */}
          <SectionCard title="Daftar Mahasiswa" collapsible={false}>
            <div className="space-y-4">

              {/* Tab filter */}
              <div className="flex flex-wrap gap-2 border-b border-border pb-4">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filterStatus === tab.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filterStatus === tab.id
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-background text-muted-foreground'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search bar & Stage Dropdown */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cari nama atau NIM mahasiswa..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div className="relative min-w-[220px]">
                  <select
                    value={filterStage}
                    onChange={e => setFilterStage(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="semua">Semua Tahapan</option>
                    <option value="Persyaratan Awal">Persyaratan Awal</option>
                    <option value="Bimbingan Pra Proposal">Bimbingan Pra Proposal</option>
                    <option value="Bimbingan Pra Sidang">Bimbingan Pra Sidang</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* List */}
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada mahasiswa yang sesuai filter</p>
                  </div>
                ) : (
                  filtered.map(student => (
                    <StudentValidationCard
                      key={student.studentId}
                      student={student}
                      onDetail={() => handleDetail(student.studentId)}
                    />
                  ))
                )}
              </div>

            </div>
          </SectionCard>

        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorRequirementValidationPage;
