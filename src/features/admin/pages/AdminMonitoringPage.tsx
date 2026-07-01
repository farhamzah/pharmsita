import React, { useEffect, useState } from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import { RevisionGateAuditPanel } from '../../shared/components/RevisionGateAuditPanel';
import { AuditExportCleanupSchedulerStatusPanel } from '../../shared/components/AuditExportCleanupSchedulerStatusPanel';
import { AuditExportAttemptPanel } from '../../shared/components/AuditExportAttemptPanel';
import { coordinatorWorkflowApi, type StudentDirectoryItem } from '../../../core/api/domain';

const mapStudentMonitoringRow = (student: StudentDirectoryItem) => ({
  id: student.id,
  name: student.name,
  nim: student.nim || student.identifier,
  stage: student.activeStepLabel || '-',
  prodi: student.programStudi || '-',
  status: student.activeStepStatus || (student.isCompleted ? 'Selesai' : '-'),
});

const AdminMonitoringPage: React.FC = () => {
  const [monitoringRows, setMonitoringRows] = useState<
    ReturnType<typeof mapStudentMonitoringRow>[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    coordinatorWorkflowApi
      .listStudents({ limit: 100 })
      .then((response) => {
        if (!mounted) return;
        setMonitoringRows(response.data.map(mapStudentMonitoringRow));
        setLoadError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setMonitoringRows([]);
        setLoadError('Monitoring mahasiswa belum bisa dimuat dari backend.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MainLayout>
      <ContentWrapper
        title="Monitoring Pengajuan"
        description="Pantau seluruh progress mahasiswa secara administratif."
      >
        {loadError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {loadError}
          </p>
        )}
        <DataTable
          data={monitoringRows}
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
        <div className="mt-6">
          <RevisionGateAuditPanel scope="admin" />
        </div>
        <div className="mt-6">
          <AuditExportCleanupSchedulerStatusPanel />
        </div>
        <div className="mt-6">
          <AuditExportAttemptPanel />
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default AdminMonitoringPage;
