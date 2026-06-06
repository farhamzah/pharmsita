// components/ui/data-table/data-table-toolbar.tsx
interface DataTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  actionSlot?: React.ReactNode;
}

export default function DataTableToolbar({
  searchValue,
  onSearchChange,
  actionSlot,
}: DataTableToolbarProps) {
  return (
    <div className="flex md:flex-row flex-col items-center justify-between gap-4 mb-4">
      <input
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search..."
        className="w-full max-w-xs rounded-md border px-3 py-2 text-sm"
      />

      {actionSlot}
    </div>
  );
}
