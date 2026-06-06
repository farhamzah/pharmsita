import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { mockJenisTA } from '../../../../mock-data/thesis-types';

interface DaftarTAModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { skema: string; jenisTA: string }) => void;
}

const DaftarTAModal: React.FC<DaftarTAModalProps> = ({ open, onClose, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [skema, setSkema] = useState<'Skripsi' | 'Non Skripsi' | ''>('');
  const [jenisTA, setJenisTA] = useState('');

  if (!open) return null;

  const handleNext = () => {
    if (step === 1 && skema) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setJenisTA('');
    }
  };

  const handleSubmit = () => {
    if (step === 2 && jenisTA) {
      onConfirm({ skema, jenisTA });
      // Reset state for next open
      setTimeout(() => {
        setStep(1);
        setSkema('');
        setJenisTA('');
      }, 300);
    }
  };

  // Filter Jenis TA based on Skema TA and status Aktif
  const availableJenisTA = mockJenisTA.filter(
    (item) => item.skema === skema && item.status === 'Aktif'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border flex flex-col overflow-hidden slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={handleBack} className="p-1 hover:bg-muted rounded-full transition-colors">
                <ArrowLeft size={18} />
              </button>
            )}
            <h3 className="font-bold text-lg">Pilih Tugas Akhir</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Progress indicators */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <div className={`w-12 h-1 mx-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-left-4">
              <h4 className="font-semibold mb-2">Pilih Skema Tugas Akhir</h4>
              <div className="space-y-3">
                <label className={`block border rounded-lg p-4 cursor-pointer transition-all ${skema === 'Skripsi' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="skema" 
                      value="Skripsi" 
                      checked={skema === 'Skripsi'} 
                      onChange={() => setSkema('Skripsi')}
                      className="w-4 h-4 text-primary"
                    />
                    <div>
                      <div className="font-medium">Skripsi</div>
                      <div className="text-sm text-muted-foreground">Jalur reguler penelitian dan penulisan karya ilmiah.</div>
                    </div>
                  </div>
                </label>
                <label className={`block border rounded-lg p-4 cursor-pointer transition-all ${skema === 'Non Skripsi' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="skema" 
                      value="Non Skripsi" 
                      checked={skema === 'Non Skripsi'} 
                      onChange={() => setSkema('Non Skripsi')}
                      className="w-4 h-4 text-primary"
                    />
                    <div>
                      <div className="font-medium">Non Skripsi</div>
                      <div className="text-sm text-muted-foreground">Jalur alternatif seperti project, publikasi, dll.</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h4 className="font-semibold mb-2">Pilih Kategori Jenis TA</h4>
              <p className="text-sm text-muted-foreground mb-4">Tersedia untuk skema: <span className="font-semibold text-foreground">{skema}</span></p>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                {availableJenisTA.length > 0 ? availableJenisTA.map((item) => (
                  <label key={item.id} className={`block border rounded-lg p-4 cursor-pointer transition-all ${jenisTA === item.name ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                    <div className="flex items-start gap-3">
                      <input 
                        type="radio" 
                        name="jenisTA" 
                        value={item.name} 
                        checked={jenisTA === item.name} 
                        onChange={() => setJenisTA(item.name)}
                        className="w-4 h-4 text-primary mt-1"
                      />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {/* If mockJenisTA had desc we would show it here, but it doesn't currently in thesis-types.ts */}
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">Pilih kategori ini untuk mendaftar tugas akhir.</div>
                      </div>
                    </div>
                  </label>
                )) : (
                  <div className="text-center p-6 border rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">Tidak ada Jenis TA yang aktif untuk skema ini.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            Batal
          </button>
          
          {step === 1 ? (
            <button 
              onClick={handleNext}
              disabled={!skema}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${skema ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
            >
              Selanjutnya <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={!jenisTA}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${jenisTA ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
            >
              Lanjutkan Pendaftaran
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DaftarTAModal;
