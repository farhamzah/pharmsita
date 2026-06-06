import React, { useState } from 'react';
import { SectionCard } from '../../../components/ui/SectionCard';
import Button from '../../../components/ui/Button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  type: 'pembimbing' | 'penguji';
  tahapan?: string;
}

export const TahapanValidationPanel: React.FC<Props> = ({ type, tahapan }) => {
  const [status, setStatus] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  const isPembimbing = type === 'pembimbing';

  // Do not render for examiner in Sempro
  if (!isPembimbing && tahapan === 'Seminar Proposal') {
     return null;
  }

  return (
    <SectionCard title={isPembimbing ? "Panel Validasi Tahapan" : "Panel Validasi Penyelesaian Revisi"}>
      <div className="space-y-4 pt-2">
        {isPembimbing ? (
          <p className="text-sm text-muted-foreground border-b border-border/50 pb-3">
            Digunakan untuk menyetujui apakah mahasiswa layak melanjutkan ke seminar/sidang berikutnya.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground border-b border-border/50 pb-3">
            Tujuan: Memvalidasi bahwa mahasiswa telah menyelesaikan revisi yang diberikan saat sidang.
          </p>
        )}

        <div className="space-y-3">
           <label className="text-sm font-bold text-foreground">Status {isPembimbing ? "Kelayakan" : "Validasi"}:</label>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 text-sm cursor-pointer border p-3 rounded-lg transition-colors ${status === 'ok' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-muted/50'}`}>
                <input 
                  type="radio" 
                  name="validasiStatus" 
                  value="ok" 
                  checked={status === 'ok'}
                  onChange={() => setStatus('ok')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium flex items-center gap-2">
                   <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                   {isPembimbing ? "Disetujui Lanjut" : "Revisi Selesai & Disetujui"}
                </span>
              </label>
              <label className={`flex items-center gap-3 text-sm cursor-pointer border p-3 rounded-lg transition-colors ${status === 'revisi' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-muted/50'}`}>
                <input 
                  type="radio" 
                  name="validasiStatus" 
                  value="revisi" 
                  checked={status === 'revisi'}
                  onChange={() => setStatus('revisi')}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium flex items-center gap-2">
                   <AlertCircle className="w-5 h-5 text-amber-500" />
                   {isPembimbing ? "Perlu Revisi Tambahan" : "Revisi Belum Selesai"}
                </span>
              </label>
           </div>
        </div>

        <div className="space-y-2 pt-2">
           <label className="text-sm font-bold text-foreground">Catatan {isPembimbing ? "Internal (opsional)" : ""}:</label>
           <textarea 
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full min-h-[80px] p-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              placeholder="Tulis catatan..."
           />
        </div>

        <div className="pt-2 flex flex-col gap-3">
           <Button className="w-full sm:w-auto">Simpan {isPembimbing ? "Keputusan" : "Validasi"}</Button>
           
           <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 p-3 rounded-lg flex items-start gap-3 text-xs mt-2 border border-blue-200 dark:border-blue-900/50">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                 {isPembimbing 
                   ? "Ini hanya salah satu syarat. Keputusan akhir tetap ada pada Koordinator." 
                   : "Validasi ini bukan keputusan final. Ini bagian dari proses verifikasi penyelesaian revisi oleh penguji."}
              </p>
           </div>
        </div>
      </div>
    </SectionCard>
  );
};
