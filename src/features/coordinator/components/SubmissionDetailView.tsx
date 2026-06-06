import React from 'react';
import { SectionCard } from '../../../components/ui/SectionCard';
import type { SubmissionData } from '../types/coordinator';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Download, Eye, FileText } from 'lucide-react';

interface SubmissionDetailViewProps {
  data: SubmissionData;
}

export const SubmissionDetailView: React.FC<SubmissionDetailViewProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <SectionCard title="Data Mahasiswa">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div><span className="text-muted-foreground block text-xs">Nama Lengkap</span><span className="font-medium">{data.studentName}</span></div>
            <div><span className="text-muted-foreground block text-xs">NIM</span><span className="font-medium">{data.nim}</span></div>
            <div><span className="text-muted-foreground block text-xs">Email</span><span className="font-medium">{data.email}</span></div>
            <div><span className="text-muted-foreground block text-xs">No. HP / WhatsApp</span><span className="font-medium">{data.phone}</span></div>
            <div><span className="text-muted-foreground block text-xs">Angkatan</span><span className="font-medium">{data.batch}</span></div>
            <div><span className="text-muted-foreground block text-xs">Tanggal Lahir</span><span className="font-medium">{data.birthDate}</span></div>
          </div>
        </SectionCard>

        <SectionCard title="Detail Pengajuan TA">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-muted-foreground block text-xs">Skema Tugas Akhir</span><span className="font-medium capitalize">{data.scheme.replace('-', ' ')}</span></div>
              <div><span className="text-muted-foreground block text-xs">Jenis Tugas Akhir</span><span className="font-medium">{data.thesisType}</span></div>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Judul {data.scheme === 'skripsi' ? 'Tugas Akhir' : 'MBKM'}</span>
              <p className="font-medium leading-snug">{data.title}</p>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Deskripsi {data.scheme === 'skripsi' ? 'Tugas Akhir' : 'MBKM'}</span>
              <p className="text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-md italic">{data.description}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Bukti Kuitansi">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 rounded-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{data.receiptFile}</p>
                <p className="text-xs text-muted-foreground">Format: PDF | Ukuran: 1.2 MB</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition" title="Preview"><Eye className="w-4 h-4" /></button>
              <button className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition" title="Download"><Download className="w-4 h-4" /></button>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard title="Status Pengajuan">
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Status Saat Ini</span>
              <StatusBadge status={data.status} />
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Tanggal Pengajuan</span>
              <span className="font-medium">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(data.submittedAt))}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Usulan Pembimbing dari Mahasiswa">
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Usulan Pembimbing 1</span>
              <span className="font-medium">{data.suggestedSupervisor1}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Usulan Pembimbing 2</span>
              <span className="text-muted-foreground italic">{data.suggestedSupervisor2 || '(Ditentukan oleh Koordinator)'}</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-md text-xs border border-amber-200 dark:border-amber-900/50">
              <span className="font-semibold block mb-1">💡 Catatan:</span>
              Ini hanya usulan dari mahasiswa. Keputusan penetapan akhir ada di tangan Koordinator.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
