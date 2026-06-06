interface BaseCardProps {
  children: React.ReactNode;
  className?: string;
}

export function BaseCard({ children, className = '' }: BaseCardProps) {
  return (
    <div
      className={`
        w-full
        min-w-0
        max-w-full
        overflow-hidden
        bg-card text-card-foreground
        rounded-xl
        shadow-md
        border
        border-border
        p-4
        ${className}
      `}
    >
      {children}
    </div>
  );
}
