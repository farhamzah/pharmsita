import React, { useEffect, useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SubmissionListTable } from '../components/SubmissionListTable';
import { coordinatorFinalProjectRegistrationApi } from '../../../core/api/domain';
import { mapRegistrationToSubmissionData } from '../utils/final-project-registration-mapper';
import type { SubmissionData } from '../types/coordinator';

type SubmissionTab = 'semua' | 'menunggu' | 'disetujui' | 'ditolak';

export const CoordinatorSubmissionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SubmissionTab>('semua');
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    coordinatorFinalProjectRegistrationApi
      .list({ limit: 100 })
      .then((response) => {
        if (!mounted) return;
        setSubmissions(response.data.map(mapRegistrationToSubmissionData));
        setErrorMessage(null);
      })
      .catch(() => {
        if (!mounted) return;
        setSubmissions([]);
        setErrorMessage('Data pengajuan belum bisa dimuat dari backend.');
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeSubmissions = submissions.filter(d => !d.isHistory);

  const tabs: { id: SubmissionTab; label: string; filter?: string }[] = [
    { id: 'semua', label: 'Semua Pengajuan' },
    { id: 'menunggu', label: 'Menunggu Validasi', filter: 'menunggu' },
    { id: 'disetujui', label: 'Disetujui', filter: 'disetujui' },
    { id: 'ditolak', label: 'Ditolak', filter: 'ditolak' },
  ];

  const filteredData = activeTab === 'semua' 
    ? activeSubmissions 
    : activeSubmissions.filter(d => d.status === activeTab);

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
        title="Pengajuan Tugas Akhir" 
        description="Kelola dan validasi form pengajuan tugas akhir mahasiswa"
      >
        {/* Navigasi Tabs */}
        <div className="flex flex-wrap gap-2 border-b pb-4 mb-6">
          {tabs.map((tab) => {
            const count = tab.filter ? activeSubmissions.filter(d => d.status === tab.filter).length : activeSubmissions.length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="mb-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Memuat data pengajuan tugas akhir...
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            {errorMessage}
          </div>
        )}

        <SubmissionListTable data={filteredData} />

      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorSubmissionPage;
