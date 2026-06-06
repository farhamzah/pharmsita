import { FileText } from "lucide-react";
import { SectionCard } from "../../../../components/ui/SectionCard";

interface BerkasPendukungProps {
  title?: string;
  berkas: {
    title: string;
    description: string;
  }[];
}

export function BerkasPendukung({
  title = "Berkas Pendukung",
  berkas,
}: BerkasPendukungProps) {
  return (
    <SectionCard title={title}>
      <div className="flex flex-col gap-4">
        {berkas.map((item, index) => (
          <BerkasItem
            key={index}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>
    </SectionCard>
  );
}

/* ===== Item ===== */
function BerkasItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
        rounded-xl
        border
        border-blue-200
        p-3
        hover:bg-muted/50
        transition
      "
    >
      {/* Icon */}
      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-blue-100
          text-blue-600
        "
      >
        <FileText size={20} />
      </div>

      {/* Text */}
      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground  ">{description}</p>
      </div>
    </div>
  );
}
