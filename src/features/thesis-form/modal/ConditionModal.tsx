import { AlertCircle, Check } from "lucide-react";
import React, { useEffect } from "react";
import { ProgressCircle } from "../../../components/ui/ProgressCircle";

type RequirementStatus = 'Valid' | 'Belum Valid';

interface RequirementItem {
  label: string;
  status: RequirementStatus;
}

interface ConditionModalProps {
  open: boolean;
  onClose: () => void;
  items: RequirementItem[];

  driveLink?: string;
  onDriveLinkChange?: (value: string) => void;
  additionalNote?: string;
  onSubmitDrive?: () => void;
  coordinatorNote?: string; // Catatan dari koordinator di tingkat tahapan
}

const ConditionModal: React.FC<ConditionModalProps> = ({
  open,
  onClose,
  items,
  driveLink = '',
  onDriveLinkChange,
  additionalNote,
  onSubmitDrive,
  coordinatorNote,
}) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  if (!open) return null;

  const totalItems = items.length;
  const validItemsCount = items.filter(item => item.status === 'Valid').length;

  const isSubmitDisabled = !driveLink?.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-xl p-6 relative max-h-[90vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors"
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="text-center font-bold text-lg mb-6 text-foreground">
          Persyaratan Tugas Akhir
        </h2>

        {/* Dynamic Progress Circle */}
        <div className="flex justify-center mb-6">
          <ProgressCircle
            current={validItemsCount}
            total={totalItems}
            className="h-40"
          />
        </div>

        {/* Requirement List */}
        <div className="space-y-2.5 mb-6">
          {items.map((item, index) => (
            <ConditionRow key={index} {...item} />
          ))}
        </div>

        {/* Drive Input */}
        {onDriveLinkChange && (
          <div className="mb-6 p-4 border border-border/80 rounded-2xl bg-muted/20">
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Link Google Drive
            </label>

            <input
              type="url"
              value={driveLink}
              onChange={(e) => onDriveLinkChange(e.target.value)}
              placeholder="Masukkan link Google Drive berkas Anda..."
              className="w-full border border-border bg-background rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />

            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
              Pastikan akses folder Google Drive sudah diatur agar dapat diakses oleh publik/koordinator.
            </p>

            {onSubmitDrive && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={onSubmitDrive}
                  disabled={isSubmitDisabled}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition cursor-pointer ${
                    isSubmitDisabled
                      ? 'bg-muted text-muted-foreground/60 cursor-not-allowed border border-border'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                  }`}
                >
                  Kirim Link
                </button>
              </div>
            )}
          </div>
        )}

        {/* Coordinator Category Note */}
        {coordinatorNote && (
          <div className="mb-6 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl text-xs space-y-1.5 animate-in slide-in-from-bottom-2 duration-200">
            <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 select-none">
              <AlertCircle className="w-3.5 h-3.5" /> Catatan Koordinator:
            </span>
            <p className="text-muted-foreground leading-relaxed font-medium">{coordinatorNote}</p>
          </div>
        )}

        {/* Additional Note */}
        {additionalNote && (
          <div className="text-xs text-muted-foreground/80 leading-normal p-3 bg-muted/30 border border-border/50 rounded-xl">
            {additionalNote}
          </div>
        )}
      </div>
    </div>
  );
};

const ConditionRow: React.FC<RequirementItem> = ({ label, status }) => {
  const isValid = status === 'Valid';

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
        isValid
          ? 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-200 dark:border-emerald-800/60 shadow-xs'
          : 'bg-card border-border shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Status Checkbox-style Icon */}
        <div
          className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
            isValid
              ? 'bg-emerald-500 border-emerald-500 text-white animate-in zoom-in-50 duration-150'
              : 'border-muted-foreground/30 bg-muted/10 text-muted-foreground/45'
          }`}
        >
          {isValid ? (
            <Check className="w-3.5 h-3.5 stroke-[3px]" />
          ) : (
            <span className="text-[10px] font-bold">✕</span>
          )}
        </div>

        {/* Label */}
        <p className={`text-sm font-medium transition-all ${isValid ? 'text-muted-foreground line-through font-normal' : 'text-foreground font-semibold'}`}>
          {label}
        </p>
      </div>

      {/* Status Badge */}
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs select-none ${
        isValid
          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
      }`}>
        {isValid ? 'Valid' : 'Belum Valid'}
      </span>
    </div>
  );
};

export default ConditionModal;
