import { BaseCard } from "../../../../components/ui/BaseCard";

// components/final-project/FinalProjectTitle.tsx
interface FinalProjectTitleProps {
  title: string;
  description: string;
}

export default function FinalProjectTitle({
  title,
  description,
}: FinalProjectTitleProps) {
  return (
    <BaseCard className="py-2">
      <span className="text-sm text-muted-foreground">{title}</span>
      <p className="mt-1 text-base leading-relaxed">{description}</p>
    </BaseCard>
  );
}
