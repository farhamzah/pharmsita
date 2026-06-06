// components/ui/data-table/data-table-pagination.tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onNext?: () => void;
  onPrev?: () => void;
}

export default function DataTablePagination({
  currentPage,
  totalPages,
  onNext,
  onPrev,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span>
        Page {currentPage} of {totalPages}
      </span>

      <div className="flex gap-2">
        <button onClick={onPrev} className="rounded-md border px-3 py-1">
          Previous
        </button>
        <button
          onClick={onNext}
          className="rounded-md bg-primary px-3 py-1 text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
