import { BaseCard } from "../../../components/ui/BaseCard";
import { ExternalLink } from "lucide-react";

interface ViewLinkCardProps {
  description?: string;
  link?: string;
}

export default function ViewLinkCard({
  description = "Link Google Docs yang telah disubmit oleh mahasiswa.",
  link = "https://docs.google.com/document/d/example",
}: ViewLinkCardProps) {
  return (
    <BaseCard className="flex flex-col gap-4 h-full justify-end">
      <span className="text-xs text-muted-foreground">{description}</span>

      <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/40 text-sm overflow-hidden">
        <ExternalLink className="w-4 h-4 text-primary shrink-0" />
        <span className="truncate text-muted-foreground">{link}</span>
      </div>

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="self-center inline-flex items-center gap-2 px-6 py-2 border border-primary text-primary text-sm font-medium rounded-md hover:bg-primary/10 transition-colors"
      >
        <ExternalLink className="w-4 h-4" /> Buka Link
      </a>
    </BaseCard>
  );
}
