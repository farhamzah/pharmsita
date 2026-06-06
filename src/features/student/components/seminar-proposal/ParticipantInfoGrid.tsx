// components/final-project/ParticipantInfoGrid.tsx
import InfoItem from "@/components/ui/InfoItem";

export type ParticipantInfoItem = {
  label: string;
  value: React.ReactNode;
};

interface ParticipantInfoGridProps {
  items: ParticipantInfoItem[];
}

export default function ParticipantInfoGrid({
  items,
}: ParticipantInfoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <InfoItem key={index} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
