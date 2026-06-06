import { cn } from "@/lib/utils";
import { ProgressCircle } from "@/components/ui/ProgressCircle";
import { BaseCard } from "../../../../components/ui/BaseCard";

type StatusType = 'fulfilled' | 'pending';

interface ApprovalItem {
  label: string;
  status: StatusType;
  note?: string;
}

interface ProsesPersetujuanProps {
  tahap: string;
  items: ApprovalItem[];
}

export function ProsesPersetujuan({ tahap, items }: ProsesPersetujuanProps) {
  const totalStep = items.length;
  const fulfilledStep = items.filter(
    (item) => item.status === "fulfilled",
  ).length;

  return (
    <BaseCard className="min-w-30">
      <div className="flex flex-col items-center gap-4 pb-4">
        {/* Tahap */}
        <p className="text-sm font-semibold">
          Tahap : <span className="font-normal">{tahap}</span>
        </p>

        {/* Progress Circle (Reusable UI) */}
        <ProgressCircle
          current={fulfilledStep}
          total={totalStep}
          label="Status"
          className="w-32"
        />

        {/* Section Title */}
        <p className="text-base font-semibold">Persetujuan</p>

        {/* Approval List */}
        <div className="w-full space-y-3">
          {items.map((item, index) => (
            <ApprovalRow key={index} {...item} />
          ))}
        </div>
      </div>
    </BaseCard>
  );
}

function ApprovalRow({
  label,
  status,
  note,
}: {
  label: string;
  status: StatusType;
  note?: string;
}) {
  const statusStyle = {
    fulfilled: 'bg-green-100 text-green-600',
    pending: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium ">{label}</p>
        {note && <p className="text-xs text-muted-foreground ">{note}</p>}
      </div>

      <span
        className={cn(
          'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
          statusStyle[status],
        )}
      >
        {status === 'fulfilled' ? 'Terpenuhi' : 'Pending'}
      </span>
    </div>
  );
}
