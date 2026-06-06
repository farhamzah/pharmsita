import { cn } from "@/lib/utils";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { GuideTooltip } from "../../../../components/ui/GuideTooltip";

interface StatusTugasAkhirProps {
  tahap: string;
  status: 'Active' | 'Selsai' | 'Pending';
  pembimbing1?: string;
  pembimbing2?: string;
  onClick?: () => void;
}

export function StatusTugasAkhir({
  tahap,
  status,
  pembimbing1,
  pembimbing2,
}: StatusTugasAkhirProps) {
  const statusStyle = {
    Active: "primary-gradient-lr text-white",
    Selsai: 'bg-green-100 text-green-600',
    Pending: 'bg-muted text-muted-foreground',
  };

  return (
    <SectionCard
      title="Status TA & Pembimbing"
      guide={
        <GuideTooltip text="Status & Pembimbing akan terisi secara otomatis setelah proses persetujuan TA selesai" />
      }
    >
      <div
        className="
      grid
      grid-cols-1
      gap-3
      pb-4
      sm:grid-cols-2
    "
      >
        {/* Tahap */}
        <InfoRow label="Tahap" value={tahap} />

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="font-semibold shrink-0">Status :</span>
          <span
            className={cn(
              'px-4 py-1 text-xs font-medium rounded-full',
              statusStyle[status],
            )}
          >
            {status}
          </span>
        </div>

        {/* Pembimbing 1 */}
        <InfoRow label="Pembimbing 1" value={pembimbing1 || '-'} />

        {/* Pembimbing 2 */}
        <InfoRow label="Pembimbing 2" value={pembimbing2 || '-'} />
      </div>
    </SectionCard>
  );
}

/* ===== Helper Component ===== */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-semibold shrink-0">{label} :</span>
      <span className="text-muted-foreground truncate">{value}</span>
    </div>
  );
}
