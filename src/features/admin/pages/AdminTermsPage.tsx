import React, { useEffect, useState } from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import { SectionCard } from '../../../components/ui/SectionCard';
import Button from '../../../components/ui/Button';
import { Plus, GripVertical, Edit2, Trash2 } from 'lucide-react';
import { adminApi } from '../../../core/api/domain';
import type { AdminMasterRecord } from '../../../core/services/admin-data-service';

type RequirementStage = 'Persyaratan Awal' | 'Seminar Proposal' | 'Sidang Akhir' | 'Yudisium';

const STAGES: RequirementStage[] = ['Persyaratan Awal', 'Seminar Proposal', 'Sidang Akhir', 'Yudisium'];

const AdminTermsPage: React.FC = () => {
  const [activeStage, setActiveStage] = useState<RequirementStage>(STAGES[0]);
  const [allRequirements, setAllRequirements] = useState<AdminMasterRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    adminApi
      .listRequirementDefinitions()
      .then((response) => {
        if (!mounted) return;
        setAllRequirements(response.data);
        setLoadError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setAllRequirements([]);
        setLoadError('Persyaratan belum bisa dimuat dari backend.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const requirements = allRequirements.filter(req => req.tahap === activeStage);

  return (
    <MainLayout>
      <ContentWrapper
        title="Syarat & Ketentuan"
        description="Mengatur checklist persyaratan per tahapan tugas akhir yang harus dipenuhi mahasiswa."
      >
        {loadError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {loadError}
          </p>
        )}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 flex flex-col gap-1">
            {STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  activeStage === stage ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>

          {/* Content Space */}
          <div className="flex-1 drop-shadow-sm">
            <SectionCard 
              title={
                <div className="flex flex-1 justify-between items-center w-full">
                  <span>Persyaratan: {activeStage}</span>
                  <Button size="sm" className="flex items-center gap-2" type="button"><Plus size={16} /> Tambah Syarat</Button>
                </div>
              } 
              className="h-full"
            >
              {requirements.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {requirements.map((req, i) => (
                    <div key={req.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:border-primary/50 transition-colors">
                      <GripVertical size={16} className="text-muted-foreground cursor-grab" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{i + 1}. {req.namaPersyaratan || req.name || '-'}</p>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${req.wajib ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                          {req.wajib ? 'Wajib' : 'Opsional'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Edit"><Edit2 size={14} /></Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Hapus"><Trash2 size={14} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  Belum ada persyaratan untuk tahapan ini.
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default AdminTermsPage;
