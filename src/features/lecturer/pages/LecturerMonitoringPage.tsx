import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { BaseCard as Card } from '../../../components/ui/BaseCard';
import { CheckCircle2, GraduationCap, FileEdit, BookOpen, User } from 'lucide-react';
import {
  supervisorOneData,
  supervisorTwoData,
  examinerOneData,
  examinerTwoData,
  chairmanData,
} from '../../../mock-data/lecturer-ui-mocks';

type TahapanFilter = 'Semua' | 'Seminar Proposal' | 'Sidang Akhir' | 'Revisi & Finalisasi' | 'Selesai';

export const LecturerMonitoringPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<TahapanFilter>('Semua');

  // Combine and deduplicate
  const allStudentsRaw = [
    ...supervisorOneData, ...supervisorTwoData,
    ...examinerOneData, ...examinerTwoData, ...chairmanData
  ];
  
  const allStudents = Array.from(new Map(allStudentsRaw.map(s => [s.nim, s])).values());
  
  const getCount = (tahapan: string) => allStudents.filter(s => s.tahapan === tahapan).length;

  const stats = [
    { label: 'Selesai', count: getCount('Selesai'), icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, colors: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30' },
    { label: 'Seminar Proposal', count: getCount('Seminar Proposal'), icon: <BookOpen className="w-5 h-5 text-blue-600" />, colors: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30' },
    { label: 'Sidang Akhir', count: getCount('Sidang Akhir'), icon: <GraduationCap className="w-5 h-5 text-purple-600" />, colors: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/30' },
    { label: 'Revisi & Finalisasi', count: getCount('Revisi & Finalisasi'), icon: <FileEdit className="w-5 h-5 text-amber-600" />, colors: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30' },
  ];

  const filteredData = activeFilter === 'Semua' 
     ? allStudents 
     : allStudents.filter(s => s.tahapan === activeFilter);

  // Group by tahapan
  const groupedData = filteredData.reduce((acc, student) => {
     const t = student.tahapan || 'Belum Ada Tahapan';
     if (!acc[t]) acc[t] = [];
     acc[t].push(student);
     return acc;
  }, {} as Record<string, typeof allStudents>);

  const tahapanOrder = ['Seminar Proposal', 'Sidang Akhir', 'Revisi & Finalisasi', 'Selesai'];

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
         title="Monitoring Progres Mahasiswa" 
         description="Status terkini dari semua mahasiswa bimbingan dan ujian Anda, dikelompokkan berdasarkan tahapan akhir."
      >
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 animate-in fade-in duration-300">
            {stats.map((stat, idx) => (
               <Card key={idx} className={`p-4 md:p-5 border ${stat.colors}`}>
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">{stat.label}</p>
                        <h4 className="text-3xl md:text-4xl font-black">{stat.count}</h4>
                        <p className="text-xs font-semibold opacity-70 mt-1">mahasiswa</p>
                     </div>
                     <div className="p-2.5 bg-white/60 dark:bg-black/20 rounded-xl shadow-sm border border-black/5 dark:border-white/5">
                        {stat.icon}
                     </div>
                  </div>
               </Card>
            ))}
         </div>

         <div className="flex flex-wrap gap-2 mb-8 bg-muted/40 p-2 rounded-lg border border-border animate-in fade-in duration-500">
            <button
               onClick={() => setActiveFilter('Semua')}
               className={`px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeFilter === 'Semua' ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
               Semua Tahapan
            </button>
            {tahapanOrder.map(tab => (
               <button
                  key={tab}
                  onClick={() => setActiveFilter(tab as TahapanFilter)}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeFilter === tab ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
               >
                  {tab}
               </button>
            ))}
         </div>

         <div className="space-y-10 animate-in fade-in duration-700">
            {tahapanOrder.filter(t => groupedData[t]?.length > 0).map(tahapan => (
               <div key={tahapan} className="space-y-4">
                  <h3 className="text-xl font-bold text-foreground border-b border-border/70 pb-3 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                     {tahapan}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {groupedData[tahapan].map(student => (
                        <div key={student.id} className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-300">
                           <div className="flex items-start gap-3 border-b border-border/50 pb-3">
                              <div className="mt-0.5 p-2 rounded-full bg-primary/10 shrink-0">
                                 <User className="w-5 h-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                 <p className="text-sm font-bold text-foreground truncate" title={student.name}>{student.name}</p>
                                 <p className="text-xs font-semibold text-muted-foreground mt-0.5">{student.nim}</p>
                              </div>
                           </div>
                           <div className="">
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Status Terakhir</p>
                              <span className="inline-block px-2.5 py-1 bg-secondary/50 border border-secondary text-secondary-foreground text-xs font-bold rounded-md w-full text-center truncate">
                                 {student.status}
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            ))}
            
            {Object.keys(groupedData).length === 0 && (
               <div className="py-20 text-center border-2 border-dashed border-border rounded-xl bg-muted/20 flex flex-col items-center gap-3">
                  <div className="p-4 bg-muted rounded-full">
                     <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Kosong</h3>
                  <p className="text-muted-foreground font-medium">Tidak ada mahasiswa yang sesuai dengan filter saat ini.</p>
               </div>
            )}
         </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default LecturerMonitoringPage;
