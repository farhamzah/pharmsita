import React from "react";
import { navigateTo } from "../../../../router/Router";

type ProfileData = {
  nama: string;
  email: string;
  nim: string;
  tanggalLahir: string;
  angkatan: string;
  programStudi: string;
  noHpWhatsapp: string;
  skemaTA: string;
  jenisTA?: string;
  statusTA: 'Aktif' | 'Tidak Aktif';
};

interface ProfileCardProps {
  data: ProfileData;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ data }) => {
  const handleEdit = () => {
    navigateTo('mahasiswa/pendaftaran/personal');
  };

  return (
    <div
      className="
        w-full max-w-76 p-4 shadow-md
        border border-border rounded-xl
        overflow-hidden
      "
    >
      <h2 className="text-center font-semibold text-lg mb-6">My Profil</h2>

      {/* Avatar */}
      <div className="flex justify-center mb-6">
        <div className="w-40 h-40 rounded-full bg-gray-300" />
      </div>

      {/* Info */}
      <div className="flex justify-center">
        <div className="w-full space-y-3 text-sm">
          <InfoRow label="Nama" value={data.nama} />
          <InfoRow label="Email" value={data.email} />
          <InfoRow label="NIM" value={data.nim} />
          <InfoRow label="Tanggal Lahir" value={data.tanggalLahir} />
          <InfoRow label="Program Studi" value={data.programStudi} />
          <InfoRow label="Angkatan" value={data.angkatan} />
          <InfoRow label="No. HP/WhatsApp" value={data.noHpWhatsapp} />
          <InfoRow label="Skema TA" value={data.skemaTA} />
          <InfoRow label="Jenis TA" value={data.jenisTA || '-'} />
          <InfoRow
            label="Status TA"
            value={
              <span
                className={`inline-block px-3 py-1 text-xs rounded-full text-white ${data.statusTA === 'Aktif'
                  ? 'primary-gradient-lr'
                  : 'bg-gray-400'
                  }`}
              >
                {data.statusTA}
              </span>
            }
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-6 space-y-3">
        <ButtonPrimary onClick={handleEdit}>Edit Profil</ButtonPrimary>
      </div>
    </div>
  );
};

export default ProfileCard;

/* ------------------- Sub Components ------------------- */

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 min-w-0">
      <span className="font-medium text-foreground shrink-0 sm:w-30">
        {label}
      </span>

      <span className="hidden sm:block shrink-0">:</span>

      <div className="flex-1 min-w-0">
        <span className="block text-muted-foreground break-words whitespace-normal">
          {value}
        </span>
      </div>
    </div>
  );
};

interface ButtonPrimaryProps {
  children: React.ReactNode;
  onClick?: () => void;
}

const ButtonPrimary: React.FC<ButtonPrimaryProps> = ({ children, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full primary-gradient-lr text-white py-2 rounded-lg font-medium hover:opacity-90 transition"
    >
      {children}
    </button>
  );
};