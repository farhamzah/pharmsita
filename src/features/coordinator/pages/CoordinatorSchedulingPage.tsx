import React, { useEffect, useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import DataTable from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  coordinatorWorkflowApi,
  type LecturerDirectoryItem,
  type StudentDirectoryItem,
} from '../../../core/api/domain';
import { X, Calendar, CheckCircle2 } from 'lucide-react';

interface ScheduleItem {
  id: string;
  nim: string;
  name: string;
  studentId: string; // Dynamic mapped ID for detail redirection
  title: string;
  stage: 'Seminar Proposal' | 'Sidang Akhir';
  date: string | null;
  time: string | null;
  room: string | null;
  location: string | null;
  examiner1: string | null;
  examiner2: string | null;
  chairman: string | null;
  notes: string;
  status: 'pending' | 'dijadwalkan' | 'selesai';
}

const mapStudentToSchedule = (student: StudentDirectoryItem): ScheduleItem | null => {
  const stepId = student.activeStepId || '';
  const stage =
    stepId === 'sidang-proposal'
      ? 'Seminar Proposal'
      : stepId === 'sidang'
        ? 'Sidang Akhir'
        : null;

  if (!stage) return null;

  return {
    id: `schedule-${student.id}`,
    nim: student.nim || student.identifier,
    name: student.name,
    studentId: student.id,
    title: student.thesisTitle || 'Tugas Akhir belum diajukan',
    stage,
    date: null,
    time: null,
    room: null,
    location: null,
    examiner1: null,
    examiner2: null,
    chairman: null,
    notes: '',
    status: student.isCompleted ? 'selesai' : 'pending',
  };
};

const mapLecturerName = (lecturer: LecturerDirectoryItem) => lecturer.name;

type TabType = 'semua' | 'sempro' | 'sidang' | 'riwayat-sempro' | 'riwayat-sidang';

const stageToExamStage = (stage: ScheduleItem['stage']) =>
  stage === 'Seminar Proposal' ? 'sidang-proposal' : 'sidang';

export const CoordinatorSchedulingPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [lecturerOptions, setLecturerOptions] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('semua');

  // Modal form states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentEditItem, setCurrentEditItem] = useState<ScheduleItem | null>(null);

  // Form Input States
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formEx1, setFormEx1] = useState('');
  const [formEx2, setFormEx2] = useState('');
  const [formChairman, setFormChairman] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    let mounted = true;

    Promise.all([
      coordinatorWorkflowApi.listStudents({ limit: 100 }),
      coordinatorWorkflowApi.listLecturers(),
    ])
      .then(([studentsResponse, lecturersResponse]) => {
        if (!mounted) return;
        setSchedules(
          studentsResponse.data
            .map(mapStudentToSchedule)
            .filter((item): item is ScheduleItem => Boolean(item))
        );
        setLecturerOptions(lecturersResponse.data.map(mapLecturerName));
        setLoadError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setSchedules([]);
        setLecturerOptions([]);
        setLoadError('Data penjadwalan belum bisa dimuat dari backend.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Handle Redirect to stage monitoring details
  const handleViewDetail = (row: ScheduleItem) => {
    const targetStepId = row.stage === 'Seminar Proposal' ? 'sidang-proposal' : 'sidang';
    sessionStorage.setItem('monitor_student_id', row.studentId);
    sessionStorage.setItem('monitor_step_id', targetStepId);
    window.location.hash = `#/${getCurrentRolePath()}/tahapan-akademik`;
  };

  // Open Modal for Scheduling/Editing
  const openModal = (item: ScheduleItem) => {
    setCurrentEditItem(item);
    setFormDate(item.date || '2026-05-30');
    setFormTime(item.time ? item.time.replace(' WIB', '') : '09:00');
    setFormRoom(item.room || '');
    setFormLocation(item.location || '');
    setFormEx1(item.examiner1 || '');
    setFormEx2(item.examiner2 || '');
    setFormChairman(item.chairman || '');
    setFormNotes(item.notes || '');
    setIsEditing(true);
  };

  // Save Modal Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditItem) return;

    const formattedTime = formTime.includes('WIB') ? formTime : `${formTime} WIB`;

    try {
      await coordinatorWorkflowApi.updateExamStatus(
        currentEditItem.studentId,
        stageToExamStage(currentEditItem.stage),
        'terjadwal'
      );
    } catch {
      alert('Jadwal belum berhasil disimpan ke workflow koordinator. Silakan coba lagi.');
      return;
    }

    const updatedList = schedules.map(item => {
      if (item.id === currentEditItem.id) {
        return {
          ...item,
          date: formDate,
          time: formattedTime,
          room: formRoom,
          location: formLocation,
          examiner1: formEx1 || null,
          examiner2: formEx2 || null,
          chairman: formChairman || null,
          notes: formNotes,
          status: 'dijadwalkan' as const
        };
      }
      return item;
    });

    setSchedules(updatedList);
    setIsEditing(false);
    setCurrentEditItem(null);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'semua', label: 'Semua Jadwal' },
    { id: 'sempro', label: 'Seminar Proposal' },
    { id: 'sidang', label: 'Sidang Akhir' },
    { id: 'riwayat-sempro', label: 'Riwayat Seminar Proposal' },
    { id: 'riwayat-sidang', label: 'Riwayat Sidang Akhir' }
  ];

  // Filtering data logic
  const filteredData = schedules.filter(item => {
    switch (activeTab) {
      case 'sempro':
        return item.stage === 'Seminar Proposal' && item.status !== 'selesai';
      case 'sidang':
        return item.stage === 'Sidang Akhir' && item.status !== 'selesai';
      case 'riwayat-sempro':
        return item.stage === 'Seminar Proposal' && item.status === 'selesai';
      case 'riwayat-sidang':
        return item.stage === 'Sidang Akhir' && item.status === 'selesai';
      case 'semua':
      default:
        return item.status !== 'selesai';
    }
  });

  const isHistoryTab = activeTab.startsWith('riwayat-');

  const columns = [
    { key: 'name', label: 'Nama Mahasiswa', sortable: true, render: (row: ScheduleItem) => (
      <div className="py-1">
        <p className="font-bold text-foreground text-sm">{row.name}</p>
        <p className="text-xs text-muted-foreground font-semibold">{row.nim} • {row.stage}</p>
      </div>
    )},
    { key: 'schedule', label: 'Jadwal & Ruang', render: (row: ScheduleItem) => (
      row.date ? (
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-primary">{row.date} | {row.time}</p>
          <p className="text-muted-foreground font-medium">{row.room} | {row.location}</p>
        </div>
      ) : (
        <span className="text-[10px] font-bold px-2 py-0.5 bg-muted rounded-md text-muted-foreground inline-block">Belum dijadwalkan</span>
      )
    )},
    { key: 'examiners', label: 'Dewan Penguji (3 Dosen)', render: (row: ScheduleItem) => (
      row.examiner1 || row.examiner2 || row.chairman ? (
        <div className="text-xs space-y-0.5 text-muted-foreground font-medium">
          {row.examiner1 && <p><span className="font-bold text-foreground/75">P1:</span> {row.examiner1}</p>}
          {row.examiner2 && <p><span className="font-bold text-foreground/75">P2:</span> {row.examiner2}</p>}
          {row.chairman && <p><span className="font-bold text-foreground/75">Ketua:</span> {row.chairman}</p>}
        </div>
      ) : (
        <span className="text-[10px] font-bold px-2 py-0.5 bg-muted rounded-md text-muted-foreground inline-block">Belum di-plot</span>
      )
    )},
    { key: 'status', label: 'Status', render: (row: ScheduleItem) => {
      const mappedStatus = row.status === 'selesai' ? 'selesai' : row.status === 'dijadwalkan' ? 'dijadwalkan' : 'menunggu';
      return <StatusBadge status={mappedStatus} />;
    }},
    { key: 'actions', label: 'Aksi', render: (row: ScheduleItem) => (
      <div className="flex items-center gap-1.5 py-1">
        <button 
          onClick={() => handleViewDetail(row)}
          className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg hover:bg-sky-100/50 transition-colors shadow-3xs cursor-pointer"
        >
          Lihat Detail
        </button>

        {!isHistoryTab && (
          <button 
            onClick={() => openModal(row)}
            className="px-2.5 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition-colors shadow-3xs cursor-pointer"
          >
            {row.status === 'dijadwalkan' ? 'Ubah Jadwal' : 'Atur Jadwal'}
          </button>
        )}
      </div>
    )}
  ];

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
        title="Penjadwalan & Dosen Penguji" 
        description="Kelola slot waktu ujian, plot ruangan, dan alokasi susunan 3 dewan penguji seminar proposal / sidang akhir."
      >
        {loadError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {loadError}
          </p>
        )}
        {/* Sub-Navigasi Tabs */}
        <div className="flex flex-wrap gap-2 border-b pb-4 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Data Table Section */}
        <SectionCard 
          title={`Daftar Penjadwalan — ${tabs.find(t => t.id === activeTab)?.label}`} 
          className="border-border/50"
        >
          <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-3xs">
            <DataTable data={filteredData} columns={columns} />
          </div>
        </SectionCard>

        {/* MODAL POPUP PENJADWALAN */}
        {isEditing && currentEditItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-background border border-border/70 rounded-2xl max-w-lg w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              
              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setCurrentEditItem(null);
                }}
                className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                title="Tutup Form"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4 pr-10 border-b border-border/50 pb-3">
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> 
                  {currentEditItem.status === 'dijadwalkan' ? 'Ubah Alokasi Jadwal & Penguji' : 'Atur Alokasi Jadwal & Penguji'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Mahasiswa: <strong className="text-foreground">{currentEditItem.name}</strong> ({currentEditItem.nim}) • Fase: <strong className="text-foreground">{currentEditItem.stage}</strong>
                </p>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4">
                
                {/* WAKTU ROW (TANGGAL & JAM) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold block">Tanggal Pelaksanaan <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        placeholder="Contoh: 12 Mei 2026"
                        className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold block">Jam Pelaksanaan <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        placeholder="Contoh: 09:00 - 10:00"
                        className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* RUANG ROW (RUANG & LOKASI) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold block">Ruangan Ujian <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      placeholder="Contoh: Ruang A203"
                      className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold block">Gedung / Lokasi <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Contoh: Gedung Fakultas Teknik"
                      className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* DOSEN PENGUJI 1 */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block">Dosen Penguji 1 <span className="text-rose-500">*</span></label>
                  <select 
                    required 
                    value={formEx1} 
                    onChange={(e) => setFormEx1(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                  >
                    <option value="">-- Pilih Dosen Penguji 1 --</option>
                    {lecturerOptions.map((name, i) => (
                      <option key={i} value={name} disabled={name === formEx2 || name === formChairman}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* DOSEN PENGUJI 2 */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block">Dosen Penguji 2 <span className="text-rose-500">*</span></label>
                  <select 
                    required 
                    value={formEx2} 
                    onChange={(e) => setFormEx2(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                  >
                    <option value="">-- Pilih Dosen Penguji 2 --</option>
                    {lecturerOptions.map((name, i) => (
                      <option key={i} value={name} disabled={name === formEx1 || name === formChairman}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* KETUA SIDANG */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block">Ketua Sidang <span className="text-rose-500">*</span></label>
                  <select 
                    required 
                    value={formChairman} 
                    onChange={(e) => setFormChairman(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                  >
                    <option value="">-- Pilih Ketua Sidang --</option>
                    {lecturerOptions.map((name, i) => (
                      <option key={i} value={name} disabled={name === formEx1 || name === formEx2}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* CATATAN TAMBAHAN (OPTIONAL) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold block">Catatan Tambahan (Opsional)</label>
                  <textarea 
                    rows={2} 
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Masukkan instruksi khusus untuk mahasiswa atau penguji..."
                    className="w-full text-xs border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary bg-background text-foreground"
                  />
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-4 border-t border-border/50 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentEditItem(null);
                    }}
                    className="px-4 py-2 border border-border text-xs font-semibold rounded-lg hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Jadwal & Penguji
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorSchedulingPage;
