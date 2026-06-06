import { BaseCard } from "../../../../components/ui/BaseCard";

export type HeadExaminer = {
  name: string;
  nidn: string;
  email?: string;
};

interface HeadExaminerCardProps {
  name: string;
  nidn: string;
  email?: string;
}

export default function HeadExaminerCard({
  name,
  nidn,
  email,
}: HeadExaminerCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">
        Ketua Sidang
      </span>
      <BaseCard>
        <div className="flex flex-col">
          <div className="w-10 h-10 rounded-full bg-muted" />
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
