import * as React from "react";
import { Info } from "lucide-react";

export function GuideTooltip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1 rounded-md hover:bg-muted transition"
      >
        <Info size={16} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-56 p-3 bg-card text-card-foreground border shadow-lg rounded-lg text-sm z-50">
          {text}
        </div>
      )}
    </div>
  );
}
