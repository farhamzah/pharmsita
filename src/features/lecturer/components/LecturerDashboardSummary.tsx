import React from 'react';
import { BaseCard as Card } from '../../../components/ui/BaseCard';
import { SectionCard } from '../../../components/ui/SectionCard';
import { Users, FileText, CalendarDays, Bell, CheckCircle2, ArrowRight } from 'lucide-react';

import {
  supervisorOneData,
  supervisorTwoData,
  examinerOneData,
  examinerTwoData,
  chairmanData,
  attentionItemsData,
  mockGuidanceData
} from '../../../mock-data/lecturer-ui-mocks';

export const LecturerDashboardSummary: React.FC = () => {
  const navigate = (path: string) => { window.location.hash = `#${path}`; };

  // Calculate stats
  const totalMahasiswa = supervisorOneData.length + supervisorTwoData.length + examinerOneData.length + examinerTwoData.length + chairmanData.length;
  
  const sidangMendatang = [...examinerOneData, ...examinerTwoData, ...chairmanData].filter(s => s.scheduleDate).length;
  
  const persetujuanTertunda = [...supervisorOneData, ...supervisorTwoData].filter(s => (s.bimbinganCount || 0) >= (s.bimbinganMin || 8) && s.layakLanjut === false).length;

  const stats = [
    { title: 'Total Mahasiswa', count: totalMahasiswa, icon: <Users className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100', text: 'text-blue-700' },
    { title: 'Sidang & Ujian Mendatang', count: sidangMendatang, icon: <CalendarDays className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100', text: 'text-amber-700' },
    { title: 'Persetujuan Tertunda', count: persetujuanTertunda, icon: <FileText className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100', text: 'text-purple-700' },
  ];

  // Activities (hanya yang approved, max 3)
  const approvedActivities = mockGuidanceData.filter(g => g.status === 'approve').slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Greetings Card */}
      <Card className="p-6 bg-linear-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Selamat Datang, Bapak/Ibu Dosen</h2>
          <p className="text-muted-foreground">
            Ringkasan aktivitas seluruh peran tugas akhir Anda
          </p>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
           <Card key={idx} className="p-5 flex items-center justify-between border hover:border-primary/50 transition-colors">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{stat.title}</p>
              <h3 className="text-3xl font-bold text-foreground">{stat.count}</h3>
            </div>
            <div className={`p-4 rounded-full ${stat.bg}`}>
              {stat.icon}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Kolom Kiri */}
        <div className="space-y-6">
          {/* Perlu Perhatian */}
          <SectionCard title={<><Bell className="w-4 h-4 mr-2" /> Perlu Perhatian</>} defaultOpen>
            <div className="space-y-4">
              {attentionItemsData.map((item, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg bg-card border shadow-sm">
                  <div className="mt-0.5">
                     <span className="flex h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-snug">{item.studentName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Topik: {item.topik}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Kolom Kanan */}
        <div className="space-y-6">
          {/* Agenda Terdekat (Ringkasan) */}
          <SectionCard title={<><CalendarDays className="w-4 h-4 mr-2" /> Agenda Terdekat</>}>
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
               <div className="p-4 bg-primary/10 rounded-full">
                  <CalendarDays className="w-8 h-8 text-primary" />
               </div>
               <div>
                  <h4 className="text-lg font-bold text-foreground">{sidangMendatang} agenda mendatang</h4>
                  <p className="text-sm text-muted-foreground mt-1">Jangan lewatkan jadwal sidang dan ujian mahasiswa Anda.</p>
               </div>
               <button 
                  onClick={() => navigate('/dosen/jadwal')}
                  className="mt-2 flex items-center text-sm font-medium text-primary hover:text-primary/80"
               >
                  Lihat Semua Jadwal <ArrowRight className="w-4 h-4 ml-1" />
               </button>
            </div>
          </SectionCard>
        </div>
      </div>
      
      {/* Aktivitas Bimbingan */}
      <SectionCard title={<><CheckCircle2 className="w-4 h-4 mr-2" /> Aktivitas Bimbingan</>}>
         <div className="divide-y divide-border/50">
            {approvedActivities.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between py-3">
                 <div>
                    <h4 className="text-sm font-bold text-foreground">{activity.author === 'Dosen' ? 'Mahasiswa' : activity.author}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{activity.topik || "Tanpa Topik"}</p>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold tracking-wider rounded-sm">Approved</span>
                    <span className="text-[10px] text-muted-foreground">{activity.date}</span>
                 </div>
              </div>
            ))}
            {approvedActivities.length === 0 && (
               <div className="py-4 text-center text-sm text-muted-foreground">Belum ada aktivitas bimbingan yang disetujui.</div>
            )}
         </div>
      </SectionCard>
    </div>
  );
};
