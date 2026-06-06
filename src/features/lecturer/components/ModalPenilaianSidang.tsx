import React, { useState } from 'react';
import BaseModal from '../../../components/ui/BaseModal';
import { Trash2, Plus, Star, Award, CheckCircle2 } from 'lucide-react';

interface RevisionItem {
  id: string;
  topik: string;
  catatan: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    scores: { presentasi: number; penulisan: number; tanyaJawab: number };
    revisions: RevisionItem[];
  }) => void;
  tahap: 'Seminar Proposal' | 'Sidang Akhir';
  readOnly?: boolean;
  initialData?: {
    scores: { presentasi: number; penulisan: number; tanyaJawab: number };
    revisions: RevisionItem[];
  };
}

export const ModalPenilaianSidang: React.FC<Props> = ({ 
  open, 
  onClose, 
  onSave, 
  tahap, 
  readOnly = false,
  initialData
}) => {
  const [presentasiScore, setPresentasiScore] = useState<number>(0);
  const [penulisanScore, setPenulisanScore] = useState<number>(0);
  const [tanyaJawabScore, setTanyaJawabScore] = useState<number>(0);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);

  // Repopulate state when modal opens or initialData changes
  React.useEffect(() => {
    if (open) {
      setPresentasiScore(initialData?.scores?.presentasi ?? 0);
      setPenulisanScore(initialData?.scores?.penulisan ?? 0);
      setTanyaJawabScore(initialData?.scores?.tanyaJawab ?? 0);
      setRevisions(initialData?.revisions ?? []);
    }
  }, [open, initialData]);

  // Real-Time Average & Grade calculation
  const average = Math.round(((presentasiScore + penulisanScore + tanyaJawabScore) / 3) * 10) / 10;
  
  const getLetterGrade = (score: number) => {
    if (score >= 80) return { label: 'A', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' };
    if (score >= 70) return { label: 'B', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/20 border-sky-200' };
    if (score >= 60) return { label: 'C', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200' };
    if (score >= 50) return { label: 'D', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20 border-orange-200' };
    return { label: 'E', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200' };
  };

  const grade = getLetterGrade(average);

  const handleAddRevision = () => {
    setRevisions(prev => [...prev, { id: Date.now().toString(), topik: '', catatan: '' }]);
  };

  const handleRevisionChange = (id: string, field: 'topik' | 'catatan', value: string) => {
    setRevisions(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveRevision = (id: string) => {
    setRevisions(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      scores: {
        presentasi: presentasiScore,
        penulisan: penulisanScore,
        tanyaJawab: tanyaJawabScore
      },
      revisions
    });
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={readOnly ? `Arsip Penilaian - ${tahap}` : `Form Penilaian - ${tahap}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-xs text-muted-foreground -mt-2">
          {readOnly 
            ? 'Dokumen arsip penilaian resmi yang telah diberikan oleh Dosen/Penguji.' 
            : `Berikan penilaian objektif pada mahasiswa berdasarkan aspek-aspek utama berikut selama ujian ${tahap}.`}
        </p>

        {/* INPUT GRID & GRADE SUMMARY CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          
          {/* Aspek Penilaian Left Form Card */}
          <div className="md:col-span-8 space-y-4 bg-muted/10 p-5 rounded-2xl border border-border/60">
            <h4 className="text-xs font-extrabold uppercase text-foreground border-b pb-2 mb-3 tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-primary" /> Aspek Penilaian Utama
            </h4>

            {/* Aspek: Presentasi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <label className="text-xs font-bold text-foreground sm:col-span-2">Presentasi <span className="text-rose-500">*</span></label>
              <input
                type="number"
                required
                disabled={readOnly}
                min={0}
                max={100}
                value={presentasiScore || ''}
                onChange={(e) => setPresentasiScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                placeholder="Nilai 0 - 100"
                className="w-full text-xs border rounded-lg px-3 py-2 bg-background text-foreground text-center"
              />
            </div>

            {/* Aspek: Penulisan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <label className="text-xs font-bold text-foreground sm:col-span-2">Penulisan Tugas Akhir <span className="text-rose-500">*</span></label>
              <input
                type="number"
                required
                disabled={readOnly}
                min={0}
                max={100}
                value={penulisanScore || ''}
                onChange={(e) => setPenulisanScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                placeholder="Nilai 0 - 100"
                className="w-full text-xs border rounded-lg px-3 py-2 bg-background text-foreground text-center"
              />
            </div>

            {/* Aspek: Tanya Jawab */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <label className="text-xs font-bold text-foreground sm:col-span-2">Tanya Jawab <span className="text-rose-500">*</span></label>
              <input
                type="number"
                required
                disabled={readOnly}
                min={0}
                max={100}
                value={tanyaJawabScore || ''}
                onChange={(e) => setTanyaJawabScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                placeholder="Nilai 0 - 100"
                className="w-full text-xs border rounded-lg px-3 py-2 bg-background text-foreground text-center"
              />
            </div>

          </div>

          {/* Average Grade Summary Right Card */}
          <div className="md:col-span-4 p-5 rounded-2xl border border-border/80 bg-card flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Nilai Akhir Rata-Rata</span>
            <strong className="text-4xl font-black text-foreground">{average || 0}</strong>
            
            <div className={`mt-3 px-3 py-1 rounded-full border text-xs font-extrabold ${grade.color} flex items-center gap-1.5`}>
              <Award className="w-3.5 h-3.5" /> Grade: {grade.label}
            </div>
          </div>

        </div>

        {/* MULTIPLE REVISIONS BUILDER CONTAINER */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase text-foreground tracking-wider flex items-center gap-1.5">
              Catatan Revisi {tahap}
            </h4>
            
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddRevision}
                className="flex items-center gap-1.5 text-xs font-extrabold text-primary hover:text-primary/80 transition-colors px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg cursor-pointer shadow-3xs"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Catatan Revisi
              </button>
            )}
          </div>

          {revisions.length === 0 ? (
            <div className="py-6 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-xs text-muted-foreground font-semibold">Tidak ada catatan revisi.</span>
              {!readOnly && <p className="text-[10px] text-muted-foreground/80 mt-1">Dosen dapat menekan tombol di atas untuk menyematkan catatan bimbingan revisi mahasiswa.</p>}
            </div>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {revisions.map((rev, idx) => (
                <div key={rev.id} className="p-4 border border-border bg-card rounded-xl relative group shadow-3xs">
                  {/* Remove button */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRevision(rev.id)}
                      className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                      title="Hapus Catatan Revisi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold block">Topik Revisi #{idx + 1} <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        disabled={readOnly}
                        value={rev.topik}
                        onChange={(e) => handleRevisionChange(rev.id, 'topik', e.target.value)}
                        placeholder="Misal: Perbaiki BAB 3 metodologi, Tambahkan referensi jurnal terbaru"
                        className="w-full text-xs border rounded-lg px-3 py-2.5 bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold block">Catatan / Detail Revisi <span className="text-muted-foreground/60">(Opsional)</span></label>
                      <textarea
                        rows={2}
                        disabled={readOnly}
                        value={rev.catatan}
                        onChange={(e) => handleRevisionChange(rev.id, 'catatan', e.target.value)}
                        placeholder="Tulis instruksi revisi yang lebih detail jika diperlukan..."
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-background text-foreground resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            {readOnly ? 'Tutup' : 'Batal'}
          </button>
          {!readOnly && (
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Penilaian
            </button>
          )}
        </div>
      </form>
    </BaseModal>
  );
};
