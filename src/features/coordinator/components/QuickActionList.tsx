import React from 'react';
import { BaseCard as Card } from '../../../components/ui/BaseCard';
import { ChevronRight } from 'lucide-react';
import { navigateTo } from '../../../router/Router';

interface QuickAction {
  label: string;
  count?: number;
  path: string;
  icon?: React.ReactNode;
}

interface QuickActionListProps {
  title: string;
  actions: QuickAction[];
}

export const QuickActionList: React.FC<QuickActionListProps> = ({ title, actions }) => {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="bg-muted px-4 py-3 border-b font-semibold">
        {title}
      </div>
      <div className="divide-y divide-border/50">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => navigateTo(action.path)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition text-left"
          >
            <div className="flex items-center gap-3">
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </div>
            <div className="flex items-center gap-3">
              {action.count !== undefined && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                  {action.count}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
        {actions.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Tidak ada tindakan.
          </div>
        )}
      </div>
    </Card>
  );
};
