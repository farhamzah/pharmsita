import React from 'react';
import { BaseCard as Card } from '../../../components/ui/BaseCard';
import type { StudentData } from '../../../mock-data/lecturer-ui-mocks';
import { Users, CheckCircle, Clock, Calendar, MapPin, Check, AlertCircle, FileText } from 'lucide-react';

interface LecturerRoleSectionProps {
  title: string;
  data: StudentData[];
  roleType: 'pembimbing' | 'penguji' | 'ketua';
  detailPath?: string; // e.g. 'dosen/seminar-proposal/1'. Defaults to 'dosen/mahasiswa/1'
  isArchive?: boolean;
}

export const LecturerRoleSection: React.FC<LecturerRoleSectionProps> = ({ title, data, roleType, detailPath = 'dosen/mahasiswa/1', isArchive = false }) => {

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'revisi proposal':
      case 'bimbingan skripsi':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      case 'lulus':
      case 'selesai sidang':
      case 'revisi disetujui':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'menunggu sidang':
      case 'jadwal sidang ditetapkan':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1 mb-2">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">Pantau progres dan kelola persetujuan tugas akhir mahasiswa di bawah bimbingan/ujian Anda.</p>
      </div>

      {/* Stats Cards Reusable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-0.5">Total Mahasiswa</p>
            <p className="text-2xl font-bold leading-none">{data.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-0.5">{isArchive ? 'Total Lulus' : 'Selesai / Approved'}</p>
            <p className="text-2xl font-bold leading-none">
               {data.filter(d => d.status.toLowerCase().includes('selesai') || d.status.toLowerCase().includes('disetujui') || d.status.toLowerCase() === 'lulus').length}
            </p>
          </div>
        </Card>
        {!isArchive && (
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-0.5">Menunggu Tinjauan</p>
              <p className="text-2xl font-bold leading-none">
                 {data.filter(d => !d.status.toLowerCase().includes('selesai')).length}
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Mahasiswa List */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        {data.length > 0 ? (
          data.map((student) => (
            <div key={student.id} className="p-5 border rounded-lg bg-card text-card-foreground shadow-sm flex flex-col h-full hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-2 gap-2">
                <div>
                  <h4 className="font-semibold text-lg text-foreground hover:text-primary cursor-pointer transition-colors max-w-[200px] truncate" title={student.name}>{student.name}</h4>
                  <p className="text-sm text-muted-foreground font-medium">NIM: {student.nim}</p>
                </div>
                <span className={`px-2.5 py-1 text-[11px] uppercase tracking-wider text-center rounded-full font-bold ${getStatusColor(student.status)}`}>
                  {student.status}
                </span>
              </div>
              <div className="grow">
                <p className="text-sm mt-3 mb-4 line-clamp-3 text-muted-foreground" title={student.title}>
                  <span className="font-semibold text-foreground">Judul TA:</span> {student.title}
                </p>

                {student.scheduleTime && (
                  <div className="mb-4 space-y-1.5 p-3 rounded-md border bg-muted/30">
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Penjadwalan Sidang</p>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      {student.scheduleTime}
                    </div>
                    {student.scheduleRoom && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {student.scheduleRoom}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              
              <div className="mt-auto pt-4 border-t flex flex-wrap items-center justify-between gap-y-3">
                {isArchive ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    Diarsip: {new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      {roleType === 'pembimbing' ? (
                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{student.bimbinganCount || 0} Bimbingan</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-sm">
                          Nilai: {student.grade || '-'}
                        </span>
                      )}
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {student.revisiCount || 0} Revisi
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {student.approveCount || 0} Approved
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground mr-1">Status Lanjut:</span>
                      {student.layakLanjut ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Layak Sidang/Lanjut
                        </span>
                      ) : (
                        <span className="text-red-500 font-bold flex items-center gap-1">
                          Belum Layak
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {isArchive ? (
                  <button 
                    onClick={() => alert('Fitur Export PDF (Berita Acara & Nilai Akhir) sedang dijalankan... Mode Mockup.')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground border rounded-md shadow-sm hover:bg-secondary/80 transition-colors focus-visible:outline-none shrink-0"
                  >
                    <FileText className="w-4 h-4" /> Cetak Berita Acara PDF
                  </button>
                ) : (
                  <button 
                    onClick={() => window.location.hash = `#/${detailPath}`}
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  >
                    Buka Detail
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-muted/30 border border-dashed rounded-lg">
             <p className="text-muted-foreground">Belum ada mahasiswa yang ditugaskan pada role ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};
