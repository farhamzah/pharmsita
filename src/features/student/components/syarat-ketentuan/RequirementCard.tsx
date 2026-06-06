import React from "react";
import { AlertCircle, Check } from "lucide-react";
import { ProgressCircle } from "../../../../components/ui/ProgressCircle";

type RequirementStatus = 'completed' | 'pending';

interface RequirementItem {
  label: string;
  status: RequirementStatus;
}

interface RequirementCardProps {
  title: string;
  total: number;
  current: number;
  items: RequirementItem[];
}

const RequirementCard: React.FC<RequirementCardProps> = ({
  title,
  total,
  current,
  items,
}) => {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-sm p-6 max-w-2xl w-full">
      {/* Title */}
      <h2 className="text-center font-semibold text-lg mb-6">{title}</h2>

      {/* Progress */}
      <div className="flex justify-center mb-6">
        <ProgressCircle current={current} total={total} className="h-36" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <RequirementRow key={index} {...item} />
        ))}
      </div>
    </div>
  );
};

const RequirementRow: React.FC<RequirementItem> = ({ label, status }) => {
  const config = {
    completed: {
      icon: <Check size={16} />,
      color: 'bg-green-500',
      bar: 'bg-green-500 w-full',
    },
    pending: {
      icon: <AlertCircle size={16} />,
      color: 'bg-yellow-500',
      bar: 'bg-yellow-500 w-4',
    },
  };

  const current = config[status];

  return (
    <div className="border border-border rounded-xl p-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-6 h-6 flex items-center justify-center text-white rounded-full ${current.color}`}
        >
          {current.icon}
        </div>

        <p className="text-sm flex-1">{label}</p>
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full mt-2">
        <div className={`h-full rounded-full ${current.bar}`} />
      </div>
    </div>
  );
};

export default RequirementCard;
