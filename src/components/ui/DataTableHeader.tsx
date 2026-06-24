import { ChevronUp, ChevronDown } from "lucide-react";

interface HeaderProps {
  label: string;
  sortable?: boolean;
  direction?: 'asc' | 'desc';
  onSort?: () => void;
}

export default function DataTableHeader({
  label,
  sortable,
  direction,
  onSort,
}: HeaderProps) {
  if (!sortable) {
    return <span>{label}</span>;
  }

  const nextDirection = direction === 'asc' ? 'desc' : 'asc';
  const ariaLabel = `${label}, urutkan ${nextDirection === 'asc' ? 'naik' : 'turun'}`;

  return (
    <button
      type="button"
      onClick={onSort}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-sm font-semibold outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {label}
      {direction === 'asc' ? (
        <ChevronUp size={14} aria-hidden="true" />
      ) : direction === 'desc' ? (
        <ChevronDown size={14} aria-hidden="true" />
      ) : null}
    </button>
  );
}
