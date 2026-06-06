import { Calendar, Clock, MapPin, DoorOpen } from "lucide-react";
import { SectionCard } from "../../../../components/ui/SectionCard";

interface AgendaTerdekatProps {
  agenda: string;
  tanggal: string;
  waktu: string;
  ruang: string;
  lokasi: string;
  roleLabel?: string;
  actionSlot?: React.ReactNode;
}

export function AgendaTerdekat({
  agenda,
  tanggal,
  waktu,
  ruang,
  lokasi,
  roleLabel,
  actionSlot,
}: AgendaTerdekatProps) {
  return (
    <SectionCard title="Agenda Terdekat">
      <div className="flex flex-col gap-4 pb-4">
        {/* Judul Agenda */}
        <div>
          <div className="flex justify-between items-start">
            <p className="text-sm text-muted-foreground">Jadwal</p>
            {roleLabel && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                Peran: {roleLabel}
              </span>
            )}
          </div>
          <p className="text-base font-semibold mt-0.5">{agenda}</p>
        </div>

        {/* Detail Agenda */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem
            icon={<Calendar size={16} />}
            label="Tanggal"
            value={tanggal}
          />

          <InfoItem icon={<Clock size={16} />} label="Waktu" value={waktu} />

          <InfoItem icon={<DoorOpen size={16} />} label="Ruang" value={ruang} />

          <InfoItem icon={<MapPin size={16} />} label="Lokasi" value={lokasi} />
        </div>

        {/* Optional Action Slot */}
        {actionSlot && <div className="mt-2 pt-4 border-t">{actionSlot}</div>}
      </div>
    </SectionCard>
  );
}

/* ===== Reusable Item ===== */
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="mt-1 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
