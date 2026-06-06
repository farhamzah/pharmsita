import { useState } from "react";
import { mockAngkatan } from "../../../mock-data";

type FormValues = {
  nama: string;
  nim: string;
  email: string;
  phone: string;
  tanggalLahir: string;
  angkatan: string;
  skema: 'skripsi' | 'non-skripsi' | null;
  bukti: File | null;
};

interface Props {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (values: FormValues) => void;
  submitText?: string;
}

const FormPersonalData = ({
  defaultValues,
  onSubmit,
  submitText = 'Submit',
}: Props) => {
  const [form, setForm] = useState<FormValues>({
    nama: '',
    nim: '',
    email: '',
    phone: '',
    tanggalLahir: '',
    angkatan: '',
    skema: null,
    bukti: null,
    ...defaultValues,
  });

  const isValid = form.skema;

  const handleChange = (key: keyof FormValues, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (onSubmit) onSubmit(form);
  };

  return (
    <>
      <div className="space-y-8">
        <h2 className="text-lg font-semibold border-b pb-3">
          Formulir Pendaftaran
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            placeholder="Nama Mahasiswa"
            className="border p-2 rounded-lg"
            value={form.nama}
            onChange={(e) => handleChange('nama', e.target.value)}
          />

          <input
            placeholder="NIM"
            className="border p-2 rounded-lg"
            value={form.nim}
            onChange={(e) => handleChange('nim', e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="border p-2 rounded-lg"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />

          <input
            placeholder="No. HP / Whatsapp"
            className="border p-2 rounded-lg"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />

          <input
            type="date"
            className="border p-2 rounded-lg"
            value={form.tanggalLahir}
            onChange={(e) => handleChange('tanggalLahir', e.target.value)}
          />

          <select
            className="border p-2 rounded-lg"
            value={form.angkatan}
            onChange={(e) => handleChange('angkatan', e.target.value)}
          >
            <option value="">Pilih Angkatan</option>
            {mockAngkatan.map((angkatan) => (
              <option key={angkatan} value={angkatan}>{angkatan}</option>
            ))}
          </select>
        </div>

        {/* Skema */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground">
            Skema Tugas Akhir
          </label>

          <div className="border rounded-lg p-4 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.skema === 'skripsi'}
                onChange={() => handleChange('skema', 'skripsi')}
              />
              Skripsi
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.skema === 'non-skripsi'}
                onChange={() => handleChange('skema', 'non-skripsi')}
              />
              Non Skripsi
            </label>
          </div>
        </div>

        {/* Upload */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground">
            Upload Bukti Kwitansi
          </label>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="border p-2 rounded-lg w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-sm hover:file:bg-blue-700"
          />

          <p className="text-xs text-muted-foreground mt-1">
            Format: PDF / JPG / PNG (maks 5MB)
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`
            px-6 py-2 rounded-lg text-white transition
            ${
              isValid
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-400 cursor-not-allowed'
            }
          `}
          >
            {submitText}
          </button>
        </div>
      </div>
    </>
  );
};

export default FormPersonalData;
