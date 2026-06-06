// components/ui/TagList.tsx
import Tag from "@/components/ui/tag";
import { BaseCard } from "../../../../components/ui/BaseCard";

interface TagListProps {
  tags: string[];
}

export default function TagList({ tags }: TagListProps) {
  return (
    <BaseCard className="py-2">
      <span className="text-sm text-muted-foreground">Kata Kunci</span>

      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <Tag key={index}>{tag}</Tag>
        ))}
      </div>
    </BaseCard>
  );
}
