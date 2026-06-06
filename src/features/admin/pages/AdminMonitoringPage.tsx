import React from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';

const mockMonitoring = [
  { id: '1', name: 'Alif Nur', nim: '221011400215', stage: 'Seminar Proposal', prodi: 'Teknik Informatika', status: 'Disetujui Pembimbing' },
  { id: '2', name: 'Rini Yuliana', nim: '221011400100', stage: 'Pendaftaran TA', prodi: 'Sistem Informasi', status: 'Menunggu Validasi' },
  { id: '3', name: 'Bayu Segara', nim: '221011400111', stage: 'Sidang Akhir', prodi: 'Teknik Informatika', status: 'Dijadwalkan' },
];

const AdminMonitoringPage: React.FC = () => {
  return (
    <MainLayout>
      <ContentWrapper
        title="Monitoring Pengajuan"
        description="Pantau seluruh progress mahasiswa secara administratif."
      >
        <DataTable
          data={mockMonitoring}
          columns={[
            { key: 'nim', label: 'NIM' },
            { key: 'name', label: 'Nama Mahasiswa' },
            { key: 'prodi', label: 'Prodi' },
            { 
              key: 'stage', 
              label: 'Tahapan Saat Ini',
              render: (row: any) => <span className="font-medium text-primary">{row.stage}</span>
            },
            { key: 'status', label: 'Status' },
            {
              key: 'actions',
              label: 'Aksi',
              render: () => <Button variant="outline" size="sm">Log Detail</Button>
            }
          ]}
        />
      </ContentWrapper>
    </MainLayout>
  );
};

export default AdminMonitoringPage;
