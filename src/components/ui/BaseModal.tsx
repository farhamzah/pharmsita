import React, { useEffect } from "react";

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const widthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

const BaseModal: React.FC<BaseModalProps> = ({
  open,
  onClose,
  title,
  maxWidth = "lg",
  children,
  footer,
}) => {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className={`relative flex max-h-[92vh] w-full ${widthMap[maxWidth]} flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3 sm:px-6 sm:py-4">
          {title ? <h2 className="text-base font-semibold sm:text-lg">{title}</h2> : <div />}

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tutup modal"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">{children}</div>

        {footer && (
          <div className="shrink-0 rounded-b-2xl border-t bg-muted px-4 py-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
