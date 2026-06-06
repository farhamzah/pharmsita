import React, { useEffect } from "react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;

  title?: string;
  description?: string;

  cancelText?: string;
  confirmText?: string;

  onConfirm?: () => void;

  loading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const widthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  title = 'Konfirmasi',
  description = 'Apakah Anda yakin ingin melanjutkan?',
  cancelText = 'Kembali',
  confirmText = 'Lanjutkan',
  onConfirm,
  loading = false,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthMap[maxWidth]} bg-card text-card-foreground rounded-2xl shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 text-center">
          <h2 className="text-lg font-semibold mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 justify-center px-6 py-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 rounded-xl border text-sm hover:bg-muted transition"
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-xl text-sm text-white transition ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
