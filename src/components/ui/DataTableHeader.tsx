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
  return (
    <div
      onClick={sortable ? onSort : undefined}
      className={`flex items-center gap-1 ${
        sortable ? "cursor-pointer select-none" : ''
      }`}
    >
      {label}
      {sortable &&
        (direction === 'asc' ? (
          <ChevronUp size={14} />
        ) : direction === 'desc' ? (
          <ChevronDown size={14} />
        ) : null)}
    </div>
  );
}
