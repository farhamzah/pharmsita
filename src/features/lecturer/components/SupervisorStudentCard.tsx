import React from 'react';

import { BaseCard as Card } from '../../../components/ui/BaseCard';
import Button from '../../../components/ui/Button';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { StudentData } from '../../../mock-data/lecturer-ui-mocks';

interface Props {
  student: StudentData;
}

export const SupervisorStudentCard: React.FC<Props> = ({ student }) => {
  const navigate = (path: string) => { window.location.hash = `#${path}`; };

  return (
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

      <div className="py-3 border-y border-border/50">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Judul Tugas Akhir</p>
        <p className="text-sm font-medium line-clamp-2 leading-relaxed">{student.title}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 p-2 rounded-md text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Bimbingan</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm font-bold">{student.bimbinganCount}/{student.bimbinganMin || 8}</span>
            {(student.bimbinganCount || 0) >= (student.bimbinganMin || 8) && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
          </div>
        </div>
        <div className="bg-muted/50 p-2 rounded-md text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Revisi</p>
          <span className="text-sm font-bold text-amber-600">{student.revisiCount}</span>
        </div>
        <div className="bg-muted/50 p-2 rounded-md text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Approval</p>
          <span className="text-sm font-bold text-emerald-600">{student.approveCount}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status Lanjut:</span>
          {student.layakLanjut ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Layak
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
              <AlertCircle className="w-3.5 h-3.5" /> Belum Layak
            </span>
          )}
        </div>
        <Button 
           size="sm" 
           variant="outline"
           onClick={() => navigate(`/dosen/mahasiswa-bimbingan/detail/${student.id}`)}
           className="text-xs h-8"
        >
          Detail Mahasiswa →
        </Button>
      </div>
    </Card>
  );
};
