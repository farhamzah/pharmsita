import React, { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { SubmissionData } from '../types/coordinator';
import { Search, Filter } from 'lucide-react';
import { navigateTo } from '../../../router/Router';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';

interface SubmissionListTableProps {
  data: SubmissionData[];
}

export const SubmissionListTable: React.FC<SubmissionListTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkema, setFilterSkema] = useState('all');
  
  const filteredData = data.filter(item => {
    const matchesSearch = item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.nim.includes(searchTerm);
    const matchesSkema = filterSkema === 'all' || item.scheme === filterSkema;
    return matchesSearch && matchesSkema;
  });

  const columns = [
    { key: 'nim', label: 'NIM', sortable: true },
    { key: 'studentName', label: 'Nama Mahasiswa', sortable: true },
    { key: 'scheme', label: 'Skema', render: (row: SubmissionData) => (
      <span className="capitalize">{row.scheme.replace('-', ' ')}</span>
    )},
    { key: 'thesisType', label: 'Jenis TA' },
    { key: 'title', label: 'Judul', render: (row: SubmissionData) => (
      <div className="max-w-[200px] truncate" title={row.title}>{row.title}</div>
    )},
    { key: 'status', label: 'Status', render: (row: SubmissionData) => (
      <StatusBadge status={row.status} />
    )},
    { key: 'submittedAt', label: 'Tanggal Ajuan' },
    { key: 'actions', label: 'Aksi', render: (row: SubmissionData) => (
      <button 
        onClick={() => navigateTo(`${getCurrentRolePath()}/pengajuan/detail/${row.id}`)}
        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md shadow-sm hover:bg-primary/90 transition-colors"
      >
        Lihat Detail
      </button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Cari nama atau NIM..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Filter className="w-4 h-4" />
          </div>
          <select
            value={filterSkema}
            onChange={(e) => setFilterSkema(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md text-sm appearance-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Semua Skema</option>
            <option value="skripsi">Skripsi</option>
            <option value="non-skripsi">Non Skripsi</option>
          </select>
        </div>
      </div>
      
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <DataTable data={filteredData} columns={columns} />
      </div>
    </div>
  );
};
