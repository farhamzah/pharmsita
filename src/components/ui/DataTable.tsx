// components/ui/data-table/data-table.tsx
import DataTableHeader from "./DataTableHeader";
import DataTableEmpty from "./DataTableEmpty";

interface DataTableProps<T> {
  columns: any[];
  data: T[];
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export default function DataTable<T>({
  columns,
  data,
  sortKey,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  if (!data.length) return <DataTableEmpty />;

  return (
    <div className="w-full overflow-x-auto lg:overflow-visible">
      <table className="min-w-max lg:min-w-0 w-full text-sm border-collapse">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-2 text-left whitespace-nowrap"
              >
                <DataTableHeader
                  label={col.label}
                  sortable={col.sortable}
                  direction={sortKey === col.key ? sortDirection : undefined}
                  onSort={() => onSort?.(String(col.key))}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-t hover:bg-muted/30">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-2 ">
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
