import React from 'react';
import { BaseCard as Card } from '../../../components/ui/BaseCard';
import { Users, FileText, GraduationCap, CheckCircle } from 'lucide-react';

interface StatData {
  title: string;
  count: number;
  icon: React.ReactNode;
  bg: string;
  text: string;
}

interface CoordinatorStatCardsProps {
  stats?: StatData[];
}

export const CoordinatorStatCards: React.FC<CoordinatorStatCardsProps> = ({ stats }) => {
  const defaultStats: StatData[] = [
    { title: 'Pengajuan Baru', count: 5, icon: <FileText className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100', text: 'text-blue-700' },
    { title: 'Aktif Tugas Akhir', count: 42, icon: <Users className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { title: 'Seminar Proposal', count: 8, icon: <GraduationCap className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100', text: 'text-purple-700' },
    { title: 'Menunggu Validasi', count: 8, icon: <CheckCircle className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100', text: 'text-amber-700' },
  ];

  const data = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((stat, idx) => (
        <Card key={idx} className="p-5 flex items-center justify-between border hover:border-primary/50 transition-colors">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{stat.title}</p>
            <h3 className="text-3xl font-bold">{stat.count}</h3>
          </div>
          <div className={`p-4 rounded-full ${stat.bg}`}>
            {stat.icon}
          </div>
        </Card>
      ))}
    </div>
  );
};
