import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { ModalPenilaianSidang } from '../components/ModalPenilaianSidang';
import { SectionCard } from '../../../components/ui/SectionCard';
import { Calendar, Clock, MapPin, DoorOpen, Filter, Search, Users, Award, Eye } from 'lucide-react';
import { lecturerWorkflowApi } from '../../../core/api/domain';

interface AgendaRecord {
  id: string; // student nim/id
  name: string;
  nim: string;
  tahapan: string;
  peran: string;
  scheduleDate: string;
  scheduleTime: string;
  scheduleRoom: string;
  scheduleLocation: string;
  scheduleStatus: 'Terjadwal' | 'Selesai' | 'Dibatalkan';
  hasGrade: boolean;
  scores?: {
    presentasi: number;
    penulisan: number;
    tanyaJawab: number;
  };
  revisions?: { id: string; topik: string; catatan: string }[];
}

const INITIAL_AGENDAS: AgendaRecord[] = [];

type FilterTab = 'semua' | 'penguji-1' | 'penguji-2' | 'ketua-sidang';
type MainTab = 'agenda' | 'riwayat';

export const LecturerSchedulePage: React.FC = () => {
  const [agendasList, setAgendasList] = useState<AgendaRecord[]>(INITIAL_AGENDAS);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('agenda');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('semua');
  
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<AgendaRecord | null>(null);
  const [isReadOnlyModal, setIsReadOnlyModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getFilteredData = () => {
    let list = agendasList;
    
    if (activeMainTab === 'agenda') {
      list = list.filter(a => a.scheduleStatus === 'Terjadwal' && !a.hasGrade);
    } else {
      list = list.filter(a => a.scheduleStatus === 'Selesai' || a.hasGrade);
    }

    if (activeFilter !== 'semua') {
      const matchRole = activeFilter.replace('-', ' ');
      list = list.filter(a => a.peran.toLowerCase() === matchRole);
    }

    const query = searchQuery.toLowerCase().trim();
    if (query) {
      list = list.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.nim.toLowerCase().includes(query) ||
        a.tahapan.toLowerCase().includes(query)
      );
    }

    return list;
  };

  const filteredData = getFilteredData();

  const gradeFromScore = (score: number) => {
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "E";
  };

  const handleSaveAssessment = async (data: {
    scores: { presentasi: number; penulisan: number; tanyaJawab: number };
    revisions: { id: string; topik: string; catatan: string }[];
  }) => {
    if (!selectedAgenda) return;
    const avg = Math.round(((data.scores.presentasi + data.scores.penulisan + data.scores.tanyaJawab) / 3) * 10) / 10;
    const stageId = selectedAgenda.tahapan === 'Seminar Proposal' ? 'sidang-proposal' : 'sidang';

    await lecturerWorkflowApi.updateExamAssessment(selectedAgenda.id, stageId, {
      grade: gradeFromScore(avg),
      resultStatus: data.revisions.length > 0 ? "lulus-dengan-revisi" : "lulus",
    });

    const updatedList = agendasList.map(a => {
      if (a.id === selectedAgenda.id) {
        return {
          ...a,
          scheduleStatus: 'Selesai' as const,
          hasGrade: true,
          scores: data.scores,
          revisions: data.revisions
        };
      }
      return a;
    });

    setAgendasList(updatedList);
    setGradingModalOpen(false);
    setSelectedAgenda(null);
  };

  const getCountByTab = (tab: MainTab) => {
    if (tab === 'agenda') {
      return agendasList.filter(a => a.scheduleStatus === 'Terjadwal' && !a.hasGrade).length;
    }
    return agendasList.filter(a => a.scheduleStatus === 'Selesai' || a.hasGrade).length;
  };

  return (
    <RoleLayoutComponent>
      <ContentWrapper
        title="Jadwal & Penilaian Ujian"
        description="Pantau jadwal ujian/sidang mendatang serta kelola dan dokumentasikan arsip penilaian akademik mahasiswa."
      >
        {/* Main Tabs Navigation */}
        <div className="flex gap-2 mb-6 border-b border-border/80">
          <button
            onClick={() => {
              setActiveMainTab('agenda');
              setSearchQuery('');
              setActiveFilter('semua');
            }}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeMainTab === 'agenda'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Agenda Mendatang ({getCountByTab('agenda')})
          </button>
          <button
            onClick={() => {
              setActiveMainTab('riwayat');
              setSearchQuery('');
              setActiveFilter('semua');
            }}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeMainTab === 'riwayat'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Riwayat Penilaian ({getCountByTab('riwayat')})
          </button>
        </div>

        {/* Filters Card */}
        <SectionCard title="Filter & Pencarian Ujian" collapsible={false} className="border-border/50 shadow-xs mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: Role Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5 mr-2">
                <Filter className="w-4 h-4" /> Filter Peran:
              </span>
              {[
                { id: 'semua', label: 'Semua Agenda' },
                { id: 'penguji-1', label: 'Penguji 1' },
                { id: 'penguji-2', label: 'Penguji 2' },
                { id: 'ketua-sidang', label: 'Ketua Sidang' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as FilterTab)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors border cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                      : 'bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right: Search bar */}
            <div className="relative w-full md:max-w-xs shrink-0">
              <input 
                type="text" 
                placeholder="Cari mahasiswa, NIM, atau tahapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border rounded-lg pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-primary bg-card text-foreground"
              />
              <div className="absolute left-3 top-3 text-muted-foreground">
                <Search className="w-4 h-4" />
              </div>
            </div>

          </div>
        </SectionCard>

        {/* LIST / CARDS RENDER */}
        <div className="space-y-4 animate-in fade-in duration-300">
          {filteredData.map((agenda, idx) => {
            // Calculate dynamic final grade if available
            const avg = agenda.scores 
              ? Math.round(((agenda.scores.presentasi + agenda.scores.penulisan + agenda.scores.tanyaJawab) / 3) * 10) / 10 
              : 0;

            return (
              <div key={idx} className="bg-card border border-border/80 shadow-xs rounded-2xl p-5 md:p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-primary/40 transition-all duration-300">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-foreground">{agenda.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">NIM: {agenda.nim}</p>
                      <p className="text-xs font-semibold text-primary mt-1">{agenda.tahapan}</p>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider rounded border border-primary/20 w-fit">
                      {agenda.peran}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">
                        <Calendar className="w-3.5 h-3.5" /> Tanggal
                      </span>
                      <span className="text-xs font-semibold text-foreground">{agenda.scheduleDate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">
                        <Clock className="w-3.5 h-3.5" /> Waktu
                      </span>
                      <span className="text-xs font-semibold text-foreground">{agenda.scheduleTime}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">
                        <DoorOpen className="w-3.5 h-3.5" /> Ruang
                      </span>
                      <span className="text-xs font-semibold text-foreground">{agenda.scheduleRoom}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">
                        <MapPin className="w-3.5 h-3.5" /> Lokasi
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate" title={agenda.scheduleLocation}>{agenda.scheduleLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col items-center justify-between md:justify-center border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6 shrink-0 gap-3">
                  <div className="flex md:flex-col items-center gap-2 md:gap-1">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Status Ujian</span>
                    {agenda.scheduleStatus === 'Terjadwal' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-extrabold uppercase">
                        Terjadwal
                      </span>
                    )}
                    {agenda.scheduleStatus === 'Selesai' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase">
                        Selesai
                      </span>
                    )}
                    {agenda.scheduleStatus === 'Dibatalkan' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase">
                        Dibatalkan
                      </span>
                    )}
                  </div>

                  {activeMainTab === 'riwayat' && agenda.scores && (
                    <div className="text-center bg-muted/20 px-3 py-1.5 rounded-xl border border-border/60 flex flex-col items-center shrink-0">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Nilai Rata-Rata</span>
                      <strong className="text-sm font-extrabold text-foreground mt-0.5">{avg}</strong>
                    </div>
                  )}

                  {agenda.scheduleStatus !== 'Dibatalkan' && (
                    <button 
                      onClick={() => {
                        setSelectedAgenda(agenda);
                        setIsReadOnlyModal(activeMainTab === 'riwayat');
                        setGradingModalOpen(true);
                      }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg transition-all shadow-3xs cursor-pointer flex items-center gap-1 shrink-0 ${
                        activeMainTab === 'riwayat'
                          ? "bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 hover:bg-sky-100/50"
                          : "bg-primary text-primary-foreground hover:bg-primary/95"
                      }`}
                    >
                      {activeMainTab === 'riwayat' ? (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Lihat Nilai
                        </>
                      ) : (
                        <>
                          <Award className="w-3.5 h-3.5" /> Berikan Nilai
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredData.length === 0 && (
            <div className="py-16 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
              <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <h6 className="text-xs font-bold text-muted-foreground">Tidak Ada Agenda</h6>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                Tidak ditemukan data jadwal ujian pada kelompok filter ini.
              </p>
            </div>
          )}
        </div>
      </ContentWrapper>

      {selectedAgenda && (
        <ModalPenilaianSidang 
          open={gradingModalOpen}
          onClose={() => {
            setGradingModalOpen(false);
            setSelectedAgenda(null);
          }}
          onSave={handleSaveAssessment}
          tahap={selectedAgenda.tahapan === 'Seminar Proposal' ? 'Seminar Proposal' : 'Sidang Akhir'}
          readOnly={isReadOnlyModal}
          initialData={selectedAgenda.hasGrade ? {
            scores: selectedAgenda.scores!,
            revisions: selectedAgenda.revisions!
          } : undefined}
        />
      )}
    </RoleLayoutComponent>
  );
};

export default LecturerSchedulePage;
