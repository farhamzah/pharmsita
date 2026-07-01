import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';
import { navigateTo } from '../../../router/Router';
import { Search, FileEdit, ArrowRight } from 'lucide-react';

interface RevisionStudent {
  id: string; // ID mahasiswa untuk redirect
  name: string;
  nim: string;
  title: string;
  stage: 'Revisi Proposal' | 'Revisi Sidang';
  status: 'Sedang Direvisi' | 'Selesai Revisi';
  lastUpdated: string;
}

const INITIAL_REVISION_STUDENTS: RevisionStudent[] = [];

type RevisionFilterTab = 'revisi-proposal' | 'revisi-sidang' | 'riwayat-revisi';

export const LecturerRevisionGuidancePage: React.FC = () => {
  const [students] = useState<RevisionStudent[]>(INITIAL_REVISION_STUDENTS);
  const [activeFilter, setActiveFilter] = useState<RevisionFilterTab>('revisi-proposal');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getFilteredStudents = () => {
    let filtered = students;

    // Filter by Tab
    if (activeFilter === 'revisi-proposal') {
      filtered = filtered.filter(s => s.stage === 'Revisi Proposal' && s.status === 'Sedang Direvisi');
    } else if (activeFilter === 'revisi-sidang') {
      filtered = filtered.filter(s => s.stage === 'Revisi Sidang' && s.status === 'Sedang Direvisi');
    } else if (activeFilter === 'riwayat-revisi') {
      filtered = filtered.filter(s => s.status === 'Selesai Revisi');
    }

    // Search Query
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.nim.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const handleLihatDetail = (student: RevisionStudent) => {
    // Map stage to stepId
    const stepId = student.stage === 'Revisi Proposal' ? 'revisi-proposal' : 'revisi-sidang';
    
    // Save state to sessionStorage for redirect focus
    sessionStorage.setItem('target_student_id', student.id);
    sessionStorage.setItem('target_step_id', stepId);
    
    // Navigate to Bimbingan Mahasiswa page
    navigateTo('dosen/mahasiswa-bimbingan');
  };

  const getCountByTab = (tab: RevisionFilterTab) => {
    if (tab === 'revisi-proposal') {
      return students.filter(s => s.stage === 'Revisi Proposal' && s.status === 'Sedang Direvisi').length;
    } else if (tab === 'revisi-sidang') {
      return students.filter(s => s.stage === 'Revisi Sidang' && s.status === 'Sedang Direvisi').length;
    } else {
      return students.filter(s => s.status === 'Selesai Revisi').length;
    }
  };

  const filteredStudents = getFilteredStudents();

  const columns = [
    {
      key: 'mahasiswa',
      label: 'Mahasiswa',
      sortable: true,
      render: (row: RevisionStudent) => (
        <div className="py-1 max-w-[450px]">
          <p className="font-bold text-foreground text-sm">{row.name}</p>
          <p className="text-xs text-muted-foreground font-semibold">NIM: {row.nim}</p>
          <p className="text-xs text-foreground/80 mt-1 font-medium leading-relaxed italic border-l-2 border-primary/30 pl-2 py-0.5" title={row.title}>
            {row.title}
          </p>
        </div>
      )
    },
    {
      key: 'stage',
      label: 'Tahapan',
      render: (row: RevisionStudent) => (
        <span className="font-bold text-xs text-primary bg-primary/5 dark:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg inline-block">
          {row.stage}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: RevisionStudent) => {
        const isDone = row.status === 'Selesai Revisi';
        return (
          <div className="flex flex-col gap-1">
            <span className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border inline-block w-fit ${
              isDone 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20' 
                : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 animate-pulse-slow'
            }`}>
              {row.status}
            </span>
            <span className="text-[9px] text-muted-foreground">Update: {row.lastUpdated}</span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row: RevisionStudent) => (
        <button
          onClick={() => handleLihatDetail(row)}
          className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg hover:bg-sky-100/50 transition cursor-pointer shadow-3xs flex items-center gap-1"
        >
          Lihat Detail <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  return (
    <RoleLayoutComponent>
      <ContentWrapper
        title="Bimbingan Revisi Mahasiswa"
        description="Fasilitas monitoring dan bimbingan revisi tugas akhir mahasiswa pasca seminar proposal atau sidang akhir."
      >
        {/* Horizontal Navigation Submenu / Filter */}
        <div className="flex gap-2 mb-6 border-b border-border/80">
          <button
            onClick={() => {
              setActiveFilter('revisi-proposal');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeFilter === 'revisi-proposal'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Revisi Proposal ({getCountByTab('revisi-proposal')})
          </button>
          <button
            onClick={() => {
              setActiveFilter('revisi-sidang');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeFilter === 'revisi-sidang'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Revisi Sidang ({getCountByTab('revisi-sidang')})
          </button>
          <button
            onClick={() => {
              setActiveFilter('riwayat-revisi');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeFilter === 'riwayat-revisi'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Riwayat Revisi ({getCountByTab('riwayat-revisi')})
          </button>
        </div>

        {/* Section Card List */}
        <SectionCard
          title={`Daftar Monitoring — ${
            activeFilter === 'revisi-proposal' ? 'Revisi Seminar Proposal' :
            activeFilter === 'revisi-sidang' ? 'Revisi Sidang Akhir' :
            'Arsip Riwayat Revisi Mahasiswa'
          }`}
          className="border-border/50 shadow-xs"
        >
          {/* Search bar */}
          <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Cari nama, NIM, atau judul TA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-primary bg-card text-foreground"
              />
              <div className="absolute left-3 top-3 text-muted-foreground">
                <Search className="w-4 h-4" />
              </div>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary font-bold hover:underline cursor-pointer shrink-0"
              >
                Reset Pencarian
              </button>
            )}
          </div>

          {filteredStudents.length === 0 ? (
            <div className="py-12 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
              <FileEdit className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <h6 className="text-xs font-bold text-muted-foreground">Tidak Ada Mahasiswa</h6>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                Tidak ditemukan data mahasiswa bimbingan revisi pada filter ini.
              </p>
            </div>
          ) : (
            <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
              <DataTable data={filteredStudents} columns={columns} />
            </div>
          )}
        </SectionCard>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default LecturerRevisionGuidancePage;
