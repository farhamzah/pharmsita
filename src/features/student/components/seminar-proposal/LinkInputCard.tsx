import Button from "../../../../components/ui/Button";
import { BaseCard } from "../../../../components/ui/BaseCard";

// components/upload/link-input-card.tsx
interface LinkInputCardProps {
  placeholder?: string;
  description?: string;
  onSubmit?: (value: string) => void;
}

export default function LinkInputCard({
  placeholder,
  description,
  onSubmit,
}: LinkInputCardProps) {
  return (
    <BaseCard className="flex flex-col gap-4 h-full justify-end ">
      <span className="text-xs text-muted-foreground">{description}</span>

      <input
        type="url"
        placeholder={placeholder}
        className="rounded-md border px-3 py-4 text-sm outline-none focus:ring-1 focus:ring-primary"
      />

      <Button onClick={() => onSubmit?.('')} className="self-center" size="md">
        Submit
      </Button>
    </BaseCard>
  );
}
