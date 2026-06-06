// components/ui/data-table/data-table-status-badge.tsx
interface StatusBadgeProps {
  status: 'send' | 'revision' | 'approved';
}

const statusMap = {
  send: 'bg-green-500',
  revision: 'bg-yellow-500',
  approved: 'bg-blue-500',
};

export default function DataTableStatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`px-4 py-1 w-full text-center block rounded-full text-xs text-white ${
        statusMap[status]
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
