import React, { useEffect } from "react";

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const widthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

const BaseModal: React.FC<BaseModalProps> = ({
  open,
  onClose,
  title,
  maxWidth = 'lg',
  children,
  footer,
}) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthMap[maxWidth]} bg-card text-card-foreground rounded-2xl shadow-xl relative max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          {title ? <h2 className="text-lg font-semibold">{title}</h2> : <div />}

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">{children}</div>

        {/* Footer (Optional) */}
        {footer && (
          <div className="px-6 py-4 border-t bg-muted rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
