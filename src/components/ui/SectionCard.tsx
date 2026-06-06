import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SectionCardProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  guide?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  collapsible?: boolean;
  align?: 'left' | 'center';
}

export function SectionCard({
  title,
  children,
  defaultOpen = true,
  guide,
  className = '',
  bodyClassName = '',
  collapsible = true,
  align = 'left',
}: SectionCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const isCenter = align === 'center';

  return (
    <div
      className={`
        w-full
        min-w-0
        max-w-full
        bg-card text-card-foreground
        rounded-xl
        shadow-md
        border
        border-border
        overflow-hidden
        ${className}
      `}
    >
      {/* HEADER */}
      <div
        className={`
          px-4 py-3
          bg-muted
          font-semibold
          flex items-center
          ${isCenter ? 'justify-center text-center' : 'justify-between'}
        `}
      >
        {/* LEFT / CENTER TITLE */}
        <div
          className={`
            flex items-center gap-2
            ${isCenter ? 'justify-center w-full' : ''}
          `}
        >
          {guide && guide}
          {title}
        </div>

        {/* ARROW BUTTON (HANYA JIKA COLLAPSIBLE) */}
        {collapsible && !isCenter && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-md hover:bg-muted transition"
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        )}
      </div>

      {/* BODY */}
      <div
        className={`
          grid
          transition-all
          duration-300
          ${
            collapsible
              ? isOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0'
              : 'grid-rows-[1fr] opacity-100'
          }
        `}
      >
        <div className="overflow-hidden">
          <div className={`p-4 ${bodyClassName}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
