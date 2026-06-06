import React, { useState } from 'react';

import { BaseCard as Card } from '../../../components/ui/BaseCard';
import Button from '../../../components/ui/Button';
import { Calendar, Clock, MapPin, DoorOpen } from 'lucide-react';
import type { StudentData } from '../../../mock-data/lecturer-ui-mocks';
import { ModalPenilaianSidang } from './ModalPenilaianSidang';
import { lecturerWorkflowApi } from '../../../core/api/domain';

interface Props {
  student: StudentData;
}

export const ExaminerStudentCard: React.FC<Props> = ({ student }) => {
  const navigate = (path: string) => { window.location.hash = `#${path}`; };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const gradeFromScore = (score: number) => {
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "E";
  };

  // Navigate to appropriate detail page based on tahapan
  const handleViewDetail = () => {
    if (student.tahapan === 'Revisi & Finalisasi') {
      navigate(`/dosen/mahasiswa-bimbingan/revisi/${student.id}`);
    } else if (student.tahapan === 'Sidang Akhir') {
      navigate(`/dosen/mahasiswa-bimbingan/sidang-akhir/${student.id}`);
    } else {
      navigate(`/dosen/mahasiswa-bimbingan/detail/${student.id}`); // fallback or Sempro
    }
  };

  return (
    <>
      <Card className="p-5 flex flex-col gap-4 border hover:border-primary/50 transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-foreground">{student.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">NIM: {student.nim}</p>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-md border border-primary/20">
            {student.tahapan}
          </span>
        </div>

        <div className="py-2">
          <p className="text-sm font-medium line-clamp-2 leading-relaxed">{student.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 p-3 bg-muted/40 rounded-lg border border-border/50">
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5 uppercase tracking-wider font-bold">
               <Calendar className="w-3.5 h-3.5" /> Tanggal
            </span>
            <span className="text-sm font-medium">{student.scheduleDate || '-'}</span>
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5 uppercase tracking-wider font-bold">
               <Clock className="w-3.5 h-3.5" /> Waktu
            </span>
            <span className="text-sm font-medium">{student.scheduleTime || '-'}</span>
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5 uppercase tracking-wider font-bold">
               <DoorOpen className="w-3.5 h-3.5" /> Ruang
            </span>
            <span className="text-sm font-medium line-clamp-1">{student.scheduleRoom || '-'}</span>
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5 uppercase tracking-wider font-bold">
               <MapPin className="w-3.5 h-3.5" /> Lokasi
            </span>
            <span className="text-sm font-medium line-clamp-1">{student.scheduleLocation || '-'}</span>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 mt-2">
          {student.hasGrade ? (
            <Button 
               size="sm" 
               variant="outline"
               onClick={() => setIsModalOpen(true)}
               className="text-xs h-8 flex-1 border-primary text-primary"
            >
              Lihat Nilai
            </Button>
          ) : (
            <Button 
               size="sm" 
               onClick={() => setIsModalOpen(true)}
               className="text-xs h-8 flex-1"
            >
              Berikan Nilai
            </Button>
          )}
          <Button 
             size="sm" 
             variant="secondary"
             onClick={handleViewDetail}
             className="text-xs h-8 flex-1"
          >
            Buka Detail
          </Button>
        </div>
      </Card>
      
      <ModalPenilaianSidang 
         open={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         onSave={async (data) => {
            const avg = Math.round(((data.scores.presentasi + data.scores.penulisan + data.scores.tanyaJawab) / 3) * 10) / 10;
            const stageId = student.tahapan === 'Seminar Proposal' ? 'sidang-proposal' : 'sidang';

            await lecturerWorkflowApi.updateExamAssessment(student.id, stageId, {
              grade: gradeFromScore(avg),
              resultStatus: data.revisions.length > 0 ? "lulus-dengan-revisi" : "lulus",
            });
            setIsModalOpen(false);
         }}
         tahap={student.tahapan === 'Seminar Proposal' ? 'Seminar Proposal' : 'Sidang Akhir'}
      />
    </>
  );
};
