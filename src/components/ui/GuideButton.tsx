import { Info } from "lucide-react";

export function GuideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="p-1 rounded-md hover:bg-muted transition"
    >
      <Info size={16} />
    </button>
  );
}
