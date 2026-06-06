import { BaseCard } from "../../../components/ui/BaseCard";
import { Download } from "lucide-react";

interface DownloadFileCardProps {
  description?: string;
  fileName?: string;
  fileSize?: string;
}

export default function DownloadFileCard({
  description = "File skripsi yang telah diupload oleh mahasiswa.",
  fileName = "Proposal_Budi_Santoso.pdf",
  fileSize = "2.4 MB",
}: DownloadFileCardProps) {
  return (
    <BaseCard className="flex flex-col gap-4 h-full justify-end">
      <p className="text-xs text-muted-foreground">{description}</p>

      <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/40">
        <div className="p-2 bg-primary/10 rounded text-primary">
          <Download className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{fileSize}</p>
        </div>
      </div>

      <a
        href="#"
        download
        className="self-center inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
      >
        <Download className="w-4 h-4" /> Download File
      </a>
    </BaseCard>
  );
}
