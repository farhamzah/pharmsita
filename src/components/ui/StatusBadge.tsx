type StatusType = 
  | 'pending' 
  | 'fulfilled' 
  | 'menunggu' 
  | 'disetujui' 
  | 'ditolak' 
  | 'perbaikan' 
  | 'layak' 
  | 'belum_layak' 
  | 'dijadwalkan' 
  | 'selesai';

interface StatusBadgeProps {
  status: StatusType;
}

const STATUS_CONFIG: Record<StatusType, { label: string; styles: string }> = {
  pending: { label: 'Pending', styles: 'bg-yellow-100 text-yellow-700' },
  fulfilled: { label: 'Terpenuhi', styles: 'bg-green-100 text-green-700' },
  menunggu: { label: 'Menunggu', styles: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  disetujui: { label: 'Disetujui', styles: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  ditolak: { label: 'Ditolak', styles: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  perbaikan: { label: 'Perbaikan', styles: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  layak: { label: 'Layak', styles: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  belum_layak: { label: 'Belum Layak', styles: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  dijadwalkan: { label: 'Dijadwalkan', styles: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  selesai: { label: 'Selesai', styles: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, styles } = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}
