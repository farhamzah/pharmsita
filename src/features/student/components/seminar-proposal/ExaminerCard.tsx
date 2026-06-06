import { BaseCard } from "../../../../components/ui/BaseCard";

// components/sidang/PengujiCard.tsx
interface ExaminerCardProps {
  label: string; // Penguji 1 / Penguji 2
  name: string;
  nidn: string;
  email?: string;
}

export default function ExaminerCard({
  label,
  name,
  nidn,
  email,
}: ExaminerCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <BaseCard>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">NIDN: {nidn}</span>
          {email && (
            <span className="text-xs text-muted-foreground">{email}</span>
          )}
        </div>
      </BaseCard>
    </div>
  );
}
