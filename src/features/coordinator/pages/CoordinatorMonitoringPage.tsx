import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';
import { coordinatorStudentMock } from '../../../mock-data/coordinator-ui-mocks';
import { Search } from 'lucide-react';
import { navigateTo } from '../../../router/Router';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';
import { RevisionGateAuditPanel } from '../../shared/components/RevisionGateAuditPanel';

export const CoordinatorMonitoringPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = coordinatorStudentMock.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.nim.includes(searchTerm)
  );

  const columns = [
    { key: 'nim', label: 'NIM', sortable: true },
    { key: 'name', label: 'Nama Mahasiswa', sortable: true },
    { key: 'title', label: 'Judul Tugas Akhir', render: (row: any) => (
      <div className="max-w-[250px] truncate" title={row.title}>{row.title}</div>
    )},
    { key: 'supervisor1', label: 'Pembimbing Utama' },
    { key: 'status', label: 'Tahapan Saat Ini', render: (row: any) => {
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
          <div className="mb-4 relative max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              placeholder="Cari berdasarkan Nama atau NIM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50 bg-background"
            />
          </div>
          <div className="border border-border/50 rounded-lg overflow-hidden shadow-sm bg-card">
            <DataTable data={filteredData} columns={columns} />
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
