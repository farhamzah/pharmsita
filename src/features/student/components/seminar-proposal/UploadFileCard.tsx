// components/upload/upload-file-card.tsx
import UploadFileInput from "@/components/ui/UploadFileInput";
import Button from "../../../../components/ui/Button";
import { BaseCard } from "../../../../components/ui/BaseCard";

interface UploadFileCardProps {
  description?: string;
  onUpload?: () => void;
}

export default function UploadFileCard({
  description,
  onUpload,
}: UploadFileCardProps) {
  return (
    <BaseCard className="flex flex-col gap-4 h-full justify-end">
      <p className="text-xs text-muted-foreground ">{description}</p>

      <UploadFileInput />

      <Button onClick={onUpload} className="self-center" size="md">
        Upload
      </Button>
    </BaseCard>
  );
}
