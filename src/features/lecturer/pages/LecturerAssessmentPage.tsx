import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { BaseCard as Card } from '../../../components/ui/BaseCard';
import Button from '../../../components/ui/Button';
import BaseModal from '../../../components/ui/BaseModal';
import { FileText, Calendar, CheckCircle2 } from 'lucide-react';
import { assessmentHistoryData, type AssessmentRecord } from '../../../mock-data/lecturer-ui-mocks';

export const LecturerAssessmentPage: React.FC = () => {
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentRecord | null>(null);

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
         title="Riwayat Penilaian" 
         description="Daftar seluruh penilaian yang pernah Anda berikan sebagai Penguji atau Ketua Sidang."
      >
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in duration-300">
            {assessmentHistoryData.map(assessment => (
               <Card key={assessment.id} className="p-5 hover:border-primary/50 transition-colors flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4 gap-2">
                     <div>
                        <h3 className="text-lg font-bold text-foreground leading-tight">{assessment.studentName}</h3>
                        <p className="text-xs text-muted-foreground mt-1">NIM: {assessment.nim}</p>
                     </div>
                     <span className="shrink-0 px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded border border-primary/20">
                        {assessment.roleSaatMenilai}
                     </span>
                  </div>
                  
                  <div className="space-y-4 mb-6 flex-1">
                     <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Tahap Penilaian</p>
                           <p className="text-sm font-semibold text-foreground">{assessment.tahap}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Tanggal Penilaian</p>
                           <p className="text-sm font-semibold text-foreground">{assessment.tanggal}</p>
                        </div>
                     </div>
                  </div>

                  <Button variant="outline" className="w-full text-xs h-9 mt-auto" onClick={() => setSelectedAssessment(assessment)}>
                     Lihat Detail Penilaian
                  </Button>
               </Card>
            ))}
            
            {assessmentHistoryData.length === 0 && (
               <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                  <p className="text-muted-foreground font-medium">Belum ada riwayat penilaian.</p>
               </div>
            )}
         </div>

         {/* Modal Detail Penilaian */}
         {selectedAssessment && (
            <BaseModal
               open={!!selectedAssessment}
               onClose={() => setSelectedAssessment(null)}
               title={`Detail Penilaian - ${selectedAssessment.studentName}`}
               maxWidth="2xl"
            >
               <div className="space-y-6 pt-2">
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                     <div className="flex flex-col gap-1 text-center border-r border-primary/10">
                        <p className="text-[10px] text-primary/70 font-bold uppercase">Tahap</p>
                        <p className="text-sm font-bold text-primary">{selectedAssessment.tahap}</p>
                     </div>
                     <div className="flex flex-col gap-1 text-center border-r border-primary/10">
                        <p className="text-[10px] text-primary/70 font-bold uppercase">Peran Anda</p>
                        <p className="text-sm font-bold text-primary">{selectedAssessment.roleSaatMenilai}</p>
                     </div>
                     <div className="flex flex-col gap-1 text-center">
                        <p className="text-[10px] text-primary/70 font-bold uppercase">Tanggal</p>
                        <p className="text-sm font-bold text-primary">{selectedAssessment.tanggal}</p>
                     </div>
                  </div>

                  <div>
                     <h4 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3 pb-2 border-b border-border/50">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Checklist Penilaian
                     </h4>
                     <ul className="space-y-2 bg-card p-4 rounded-lg border border-border shadow-sm">
                        {selectedAssessment.checkedItems.map((item, idx) => (
                           <li key={idx} className="flex gap-3 items-start">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span className="text-sm font-medium text-foreground/80">{item.split('_').join(' - ')}</span>
                           </li>
                        ))}
                        {selectedAssessment.checkedItems.length === 0 && (
                           <li className="text-sm text-muted-foreground italic text-center py-2">Tidak ada checklist yang dipilih.</li>
                        )}
                     </ul>
                  </div>

                  <div>
                     <h4 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3 pb-2 border-b border-border/50">
                        <FileText className="w-4 h-4 text-amber-500" /> Catatan Rekomendasi/Revisi
                     </h4>
                     <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-sm">
                        <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed font-medium">
                           {selectedAssessment.catatan || "Tidak ada catatan."}
                        </p>
                     </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border/50">
                     <Button onClick={() => setSelectedAssessment(null)}>Tutup Detail</Button>
                  </div>
               </div>
            </BaseModal>
         )}
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default LecturerAssessmentPage;
