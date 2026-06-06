import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  current: number;
  total: number;
  strokeWidth?: number;
  label?: string;
  className?: string; // control size from outside (w-24 h-24 etc)
}

export function ProgressCircle({
  current,
  total,
  strokeWidth = 6,
  label = "Status",
  className,
}: ProgressCircleProps) {
  const percentage = Math.min(current / total, 1);

  const radius = 50 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn(
        'relative h-full aspect-square', // default size
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
        {/* Background */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#2563eb"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - circumference * percentage}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">
          {current} / {total}
        </span>
      </div>
    </div>
  );
}
