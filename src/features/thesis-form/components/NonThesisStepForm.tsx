import { useState } from "react";
import { mockJenisTA } from "../../../mock-data/thesis-types";

type Props = {
  onBack: () => void;
  onSubmit: (values: {
    jenisTA: string;
    judulMbkm: string;
    deskripsiMbkm: string;
    pembimbing1: string;
    pembimbing2: string;
  }) => void;
};

const dosenList = [
  { id: '1', nama: 'Dr. Ahmad' },
  { id: '2', nama: 'Dr. Budi' },
  { id: '3', nama: 'Dr. Citra' },
];

const StepFormNonSkripsi = ({ onBack, onSubmit }: Props) => {
  const [jenisTA, setJenisTA] = useState<string>('');
  const [judulMbkm, setJudulMbkm] = useState('');
  const [deskripsiMbkm, setDeskripsiMbkm] = useState('');
  const [pembimbing1, setPembimbing1] = useState('');
  const [pembimbing2] = useState('');

  // const toggleJenis = (value: string) => {
  //   if (jenisTA.includes(value)) {
  //     setJenisTA(jenisTA.filter((item) => item !== value));
  //   } else {
  //     setJenisTA([...jenisTA, value]);
  //   }
  // };

  const isValid =
    jenisTA !== '' &&
    judulMbkm.trim() &&
    deskripsiMbkm.trim() &&
    pembimbing1;

  const handleSubmit = () => {
    if (!isValid) return;

    onSubmit({
      jenisTA,
      judulMbkm,
      deskripsiMbkm,
      pembimbing1,
      pembimbing2,
    });
  };

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold border-b pb-3">
        Form Pengajuan Tugas Akhir (Non Skripsi)
      </h2>

      <div className="mb-6">
        <label className="text-sm font-medium text-foreground">
          Jenis Tugas Akhir
        </label>

        <div className="border rounded-lg p-4 space-y-2">
          {mockJenisTA
            .filter((item) => item.skema === 'Non Skripsi' && item.status === 'Aktif')
            .map((item) => (
              <label key={item.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="jenisTA"
                  value={item.name}
                  checked={jenisTA === item.name}
                  onChange={(e) => setJenisTA(e.target.value)}
                />
                {item.name}
              </label>
            ))}
        </div>
      </div>

      {/* Judul MBKM */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Judul MBKM</label>

        <input
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Masukkan judul MBKM"
          value={judulMbkm}
          onChange={(e) => setJudulMbkm(e.target.value)}
        />
      </div>

      {/* Deskripsi MBKM */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Deskripsi MBKM
        </label>

        <textarea
          rows={4}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Masukkan deskripsi kegiatan MBKM"
          value={deskripsiMbkm}
          onChange={(e) => setDeskripsiMbkm(e.target.value)}
        />
      </div>

      {/* Usulan Pembimbing */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Usulan Pembimbing
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Pembimbing 1 */}
          <select
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={pembimbing1}
            onChange={(e) => setPembimbing1(e.target.value)}
          >
            <option value="">Pilih Pembimbing 1</option>
            {dosenList.map((dosen) => (
              <option key={dosen.id} value={dosen.nama}>
                {dosen.nama}
              </option>
            ))}
          </select>

          {/* Pembimbing 2 */}
          <select
            className="border rounded-lg px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
            disabled
            value={pembimbing2}
          >
            <option>Pembimbing 2 ditentukan oleh Admin</option>
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-lg bg-muted hover:bg-gray-300 transition"
        >
          Kembali
        </button>

        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-6 py-2 rounded-lg text-white transition ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default StepFormNonSkripsi;
