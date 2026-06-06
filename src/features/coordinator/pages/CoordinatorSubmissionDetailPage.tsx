import React, { useEffect, useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';
import ContentWrapper from '../../../components/ContentWrapper';
import { SubmissionDetailView } from '../components/SubmissionDetailView';
import { SubmissionDecisionPanel } from '../components/SubmissionDecisionPanel';
import { submissionMockData } from '../../../mock-data/coordinator-ui-mocks';
import { coordinatorFinalProjectRegistrationApi } from '../../../core/api/domain';
import { mapRegistrationToSubmissionData } from '../utils/final-project-registration-mapper';
import type { SubmissionData } from '../types/coordinator';
import { 
  ArrowLeft, 
  BookOpen, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  FileText 
} from 'lucide-react';
import { SectionCard } from '../../../components/ui/SectionCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';

const supervisorIdByName: Record<string, string> = {
  'Dr. Ahmad': 'usr_dosen_01',
  'Dr. Budi': 'usr_dosen_01',
  'Dr. Citra': 'usr_multi_01',
  'Dr. Budi Harto, M.Farm.': 'usr_dosen_01',
  'Dr. Multi Peran, M.Farm.': 'usr_multi_01',
};

const supervisorNameById: Record<string, string> = {
  usr_dosen_01: 'Dr. Budi Harto, M.Farm.',
  usr_multi_01: 'Dr. Multi Peran, M.Farm.',
};

const resolveSupervisorId = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  return supervisorIdByName[value] || value;
};

export const CoordinatorSubmissionDetailPage: React.FC = () => {
  // Extract ID from hash '#/kordinator/pengajuan/detail/sub-1'
  const hash = window.location.hash;
  const idMatch = hash.match(/detail\/([^/]+)$/);
  const registrationId = idMatch ? decodeURIComponent(idMatch[1]) : 'sub-1';

  const fallbackData = submissionMockData.find(d => d.id === registrationId) || submissionMockData[0];
  const [data, setData] = useState<SubmissionData>(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    coordinatorFinalProjectRegistrationApi
      .getById(registrationId)
      .then((response) => {
        if (!mounted) return;
        setData(mapRegistrationToSubmissionData(response.data));
        setLoadError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setData(fallbackData);
        setLoadError('Detail memakai fallback mock karena data API tidak ditemukan.');
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [fallbackData, registrationId]);

  const studentHistory = submissionMockData.filter(
    sub => sub.nim === data.nim && sub.id !== data.id
  );

  const handleBack = () => {
    window.location.hash = `#/${getCurrentRolePath()}/pengajuan`;
  };

  const handleDecision = async (decision: 'disetujui' | 'ditolak', notes: string, spv1?: string, spv2?: string) => {
    try {
      const response = await coordinatorFinalProjectRegistrationApi.validate(data.id, {
        status: decision === 'disetujui' ? 'Disetujui' : 'Ditolak',
        catatanKoordinator: notes,
        ...(decision === 'disetujui'
          ? {
              pembimbing1Id: resolveSupervisorId(spv1, 'usr_dosen_01'),
              pembimbing2Id: resolveSupervisorId(spv2, 'usr_multi_01'),
            }
          : {}),
      });
      const updated = mapRegistrationToSubmissionData(response.data);
      setData(updated);
      alert(
        `Keputusan disimpan: ${decision.toUpperCase()}\nCatatan: ${notes || '-'}\nPembimbing 1: ${
          supervisorNameById[spv1 || ''] || spv1 || '-'
        }\nPembimbing 2: ${supervisorNameById[spv2 || ''] || spv2 || '-'}`
      );
      handleBack();
    } catch {
      alert('Keputusan belum berhasil disimpan. Silakan coba lagi.');
    }
  };

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
        headerRight={
          <button onClick={handleBack} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 bg-card border rounded-md shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
          </button>
        }
      >
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">Detail Pengajuan Tugas Akhir</h2>
          <p className="text-muted-foreground text-sm">Tinjau kelayakan pengajuan dan ambil keputusan</p>
        </div>

        {isLoading && (
          <div className="mt-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Memuat detail pengajuan tugas akhir...
          </div>
        )}

        {loadError && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            {loadError}
          </div>
        )}

        <div className="space-y-6 mt-4">
          <SubmissionDetailView data={data} />
          
          {/* Riwayat Pengajuan Mahasiswa Section */}
          <SectionCard 
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-bold text-foreground">Riwayat Pengajuan Mahasiswa</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                  {studentHistory.length} Total Pengajuan
                </span>
              </div>
            }
          >
            {studentHistory.length === 0 ? (
              <div className="py-8 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <h6 className="text-xs font-bold text-muted-foreground">Belum Ada Riwayat Pengajuan</h6>
                <p className="text-[11px] text-muted-foreground/80 mt-1 max-w-sm leading-relaxed px-4">
                  Mahasiswa ini belum pernah melakukan pengajuan judul tugas akhir sebelumnya (Ini adalah pengajuan pertamanya).
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {studentHistory.map((sub) => {
                  const isApproved = sub.status === 'disetujui';
                  const isPending = sub.status === 'menunggu';
                  const isRejected = sub.status === 'ditolak';
                  const isRevision = sub.status === 'perbaikan';
                  const isExpanded = expandedHistoryId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className={`border rounded-xl transition-all duration-300 relative overflow-hidden ${
                        isApproved ? 'bg-emerald-500/[0.01] border-emerald-500/10 hover:border-emerald-500/25' : ''
                      } ${
                        isPending ? 'bg-amber-500/[0.01] border-amber-500/10 hover:border-amber-500/25' : ''
                      } ${
                        isRejected ? 'bg-red-500/[0.01] border-red-500/20 hover:border-red-500/35' : ''
                      } ${
                        isRevision ? 'bg-orange-500/[0.01] border-orange-500/10 hover:border-orange-500/25' : ''
                      } ${
                        isExpanded ? 'shadow-xs ring-1 ring-primary/10 border-border/80' : ''
                      }`}
                    >
                      {/* Status Indicator Bar Left */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${
                        isApproved ? 'bg-emerald-500' : ''
                      } ${
                        isPending ? 'bg-amber-50' : ''
                      } ${
                        isRejected ? 'bg-rose-500' : ''
                      } ${
                        isRevision ? 'bg-orange-500' : ''
                      }`} />

                      {/* Collapsible Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId(isExpanded ? null : sub.id)}
                        className="w-full text-left pl-4.5 pr-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer focus:outline-none select-none bg-transparent"
                      >
                        <div className="space-y-1.5 flex-1 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded select-none border ${
                              isApproved ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-700 dark:text-emerald-400' : ''
                            } ${
                              isPending ? 'bg-amber-500/10 border-amber-500/10 text-amber-700 dark:text-amber-400' : ''
                            } ${
                              isRejected ? 'bg-rose-500/10 border-rose-500/10 text-rose-700 dark:text-rose-400' : ''
                            } ${
                              isRevision ? 'bg-orange-500/10 border-orange-500/10 text-orange-700 dark:text-orange-400' : ''
                            }`}>
                              {sub.scheme.replace('-', ' ')} — {sub.thesisType}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-foreground leading-relaxed">
                            {sub.title}
                          </h5>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 bg-transparent">
                          <div>
                            <StatusBadge status={sub.status} />
                          </div>
                          <div className={`w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center transition-transform duration-200 text-muted-foreground ${
                            isExpanded ? 'rotate-90' : ''
                          }`}>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </button>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="px-4.5 pb-4.5 pt-1 border-t border-border/40 pl-5.5 space-y-4 bg-muted/[0.01] animate-slide-down">
                          
                          {/* 1. Rangkuman/Deskripsi Rencana Penelitian */}
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Deskripsi / Rangkuman Rencana Penelitian</span>
                            <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/25 rounded-xl p-3 border border-border/40 font-medium italic">
                              {sub.description}
                            </p>
                          </div>

                          {/* 2. Rekomendasi/Usulan Dewan Pembimbing */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Rekomendasi Dosen Pendamping</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                              <div className="flex items-center gap-2.5 text-foreground bg-card border border-border/60 rounded-xl p-2.5">
                                <UserCheck className="w-4.5 h-4.5 text-primary shrink-0" />
                                <div>
                                  <span className="text-[9px] text-muted-foreground block font-semibold leading-none mb-0.5">Pembimbing Utama (1)</span>
                                  <strong>{sub.suggestedSupervisor1}</strong>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 text-foreground bg-card border border-border/60 rounded-xl p-2.5">
                                <UserCheck className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                                <div>
                                  <span className="text-[9px] text-muted-foreground block font-semibold leading-none mb-0.5">Pembimbing Pendamping (2)</span>
                                  <strong className="text-muted-foreground">{sub.suggestedSupervisor2 || '(Ditentukan oleh Koordinator)'}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. Informasi Tambahan Lainnya */}
                          <div className="space-y-2.5 pt-2 border-t border-border/40">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">Informasi Tambahan Lainnya</span>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-2 font-medium">
                                <Clock className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                <span>Tanggal Diajukan: <strong className="text-foreground/80">{sub.submittedAt}</strong></span>
                              </div>
                              <div className="flex items-center gap-2 font-medium">
                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                <span>Dokumen Lampiran: <strong className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{sub.receiptFile}</strong></span>
                              </div>
                            </div>

                            {/* Validation comment */}
                            {sub.validationNote && (
                              <div className="bg-red-500/[0.03] border border-red-500/20 rounded-xl p-3 text-[11px] text-red-700 dark:text-red-300 leading-relaxed flex items-start gap-2.5 mt-2">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="block font-bold mb-0.5 text-red-800 dark:text-red-400">Catatan Koordinator / Alasan Penolakan:</strong>
                                  {sub.validationNote}
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
          
          {data.status === 'menunggu' && (
            <SubmissionDecisionPanel 
              onDecision={handleDecision} 
              suggestedSupervisor1={data.suggestedSupervisor1} 
            />
          )}

          {data.validationHistory && data.validationHistory.length > 0 && (
            <SectionCard title="Riwayat Validasi">
              <div className="mt-2 relative pl-4 border-l-2 border-border/60 space-y-6">
                {data.validationHistory.map((history: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[21px] w-3 h-3 rounded-full mt-1.5 border-2 border-card ${history.action === 'disetujui' ? 'bg-emerald-500' : history.action === 'perbaikan' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold capitalize">{history.action}</span>
                        <span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(history.date))}</span>
                      </div>
                      <p className="text-sm mt-1 text-muted-foreground">Oleh: {history.by}</p>
                      <div className="text-sm mt-2 bg-muted/40 p-3 rounded-md border border-border/50 text-foreground">
                        {history.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorSubmissionDetailPage;
