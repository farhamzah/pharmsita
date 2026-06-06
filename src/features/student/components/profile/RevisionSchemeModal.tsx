type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'skripsi' | 'non-skripsi') => void;
};

const SkemaRevisiModal = ({ open, onClose, onSelect }: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card text-card-foreground rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Pilih Skema Tugas Akhir</h2>

        <p className="text-sm text-muted-foreground mb-6">
          Silakan pilih skema tugas akhir yang akan direvisi.
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => onSelect('skripsi')}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Skripsi
          </button>

          <button
            onClick={() => onSelect('non-skripsi')}
            className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Non Skripsi
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Batal
        </button>
      </div>
    </div>
  );
};

export default SkemaRevisiModal;
