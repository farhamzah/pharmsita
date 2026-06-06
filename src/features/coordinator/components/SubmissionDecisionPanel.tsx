import React, { useEffect, useState } from 'react';
import { SectionCard } from '../../../components/ui/SectionCard';
import { CheckCircle, XCircle } from 'lucide-react';

interface SubmissionDecisionPanelProps {
  onDecision: (
    decision: 'disetujui' | 'ditolak',
    notes: string,
    supervisor1?: string,
    supervisor2?: string
  ) => void;
  suggestedSupervisor1: string;
}

const lecturers = [
  { id: 'usr_dosen_01', name: 'Dr. Budi Harto, M.Farm.', quota: '7/10' },
  { id: 'usr_multi_01', name: 'Dr. Multi Peran, M.Farm.', quota: '4/10' },
];

const resolveInitialSupervisorId = (name: string) => {
  const normalizedName = name.toLowerCase();
  return (
    lecturers.find((lecturer) =>
      normalizedName.includes(lecturer.name.toLowerCase())
    )?.id || 'usr_dosen_01'
  );
};

export const SubmissionDecisionPanel: React.FC<SubmissionDecisionPanelProps> = ({
  onDecision,
  suggestedSupervisor1,
}) => {
  const [decision, setDecision] = useState<'disetujui' | 'ditolak' | null>(null);
  const [notes, setNotes] = useState('');
  const [spv1, setSpv1] = useState(resolveInitialSupervisorId(suggestedSupervisor1));
  const [spv2, setSpv2] = useState('usr_multi_01');

  useEffect(() => {
    setSpv1(resolveInitialSupervisorId(suggestedSupervisor1));
  }, [suggestedSupervisor1]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) return;

    if (decision === 'disetujui') {
      if (!spv1 || !spv2) {
        alert('Pembimbing 1 dan Pembimbing 2 wajib dipilih.');
        return;
      }

      if (spv1 === spv2) {
        alert('Pembimbing 1 dan Pembimbing 2 harus berbeda.');
        return;
      }
    }

    onDecision(decision, notes, spv1, spv2);
  };

  return (
    <SectionCard title="Keputusan Koordinator" className="border-primary/50 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold">Pilih Keputusan:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${decision === 'disetujui' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500' : 'hover:bg-muted'}`}>
              <input type="radio" className="sr-only" checked={decision === 'disetujui'} onChange={() => setDecision('disetujui')} />
              <CheckCircle className={`w-5 h-5 ${decision === 'disetujui' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              <span className={`font-medium text-sm ${decision === 'disetujui' ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>Setujui Pengajuan</span>
            </label>
            <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${decision === 'ditolak' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-500 ring-1 ring-rose-500' : 'hover:bg-muted'}`}>
              <input type="radio" className="sr-only" checked={decision === 'ditolak'} onChange={() => setDecision('ditolak')} />
              <XCircle className={`w-5 h-5 ${decision === 'ditolak' ? 'text-rose-600' : 'text-muted-foreground'}`} />
              <span className={`font-medium text-sm ${decision === 'ditolak' ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'}`}>Tolak Pengajuan</span>
            </label>
          </div>
        </div>

        {decision === 'disetujui' && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Penetapan Pembimbing</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Pembimbing 1 <span className="text-rose-500">*</span></label>
                <select value={spv1} onChange={e => setSpv1(e.target.value)} className="w-full p-2 border rounded-md text-sm bg-background">
                  <option value="">Pilih Pembimbing 1</option>
                  {lecturers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} (Kuota: {l.quota})</option>
                  ))}
                </select>
                <p className="text-[10px] text-emerald-600 font-medium mt-1">Dipetakan ke akun dosen backend demo</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Pembimbing 2 <span className="text-rose-500">*</span></label>
                <select value={spv2} onChange={e => setSpv2(e.target.value)} className="w-full p-2 border rounded-md text-sm bg-background">
                  <option value="">Pilih Pembimbing 2</option>
                  {lecturers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} (Kuota: {l.quota})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground">Catatan Persetujuan (Opsional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tambahkan catatan untuk mahasiswa (opsional)..." className="w-full p-2 border rounded-md text-sm bg-background min-h-[80px]" />
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md text-sm transition">
                Setujui & Tetapkan Pembimbing
              </button>
            </div>
          </div>
        )}

        {decision === 'ditolak' && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Catatan Validasi</h4>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Alasan Penolakan <span className="text-rose-500">*</span>
              </label>
              <textarea required value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tuliskan alasan mengapa dokumen ini ditolak..." className="w-full p-2 border rounded-md text-sm bg-background min-h-[80px]" />
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full sm:w-auto px-6 py-2 text-white font-medium rounded-md text-sm transition bg-rose-600 hover:bg-rose-700">
                Tolak Pengajuan
              </button>
            </div>
          </div>
        )}
      </form>
    </SectionCard>
  );
};
