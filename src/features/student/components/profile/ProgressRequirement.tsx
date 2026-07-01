import React, { useState } from "react";
import { BaseCard } from "../../../../components/ui/BaseCard";
import ConditionModal from "../../../thesis-form/modal/ConditionModal";
import ConfirmModal from "../../../../components/ui/ConfirmModal";
import SkemaRevisiModal from "./RevisionSchemeModal";
import { navigateTo } from "../../../../router/Router";

type ProgressItem = {
  label: string;
  value: number;
  total: number;
};

interface ProgressRequirementProps {
  items: ProgressItem[];
  onYudisium?: () => void;
  isTRegistered?: boolean;
  isTitleAccepted?: boolean;
}

const ProgressRequirement: React.FC<ProgressRequirementProps> = ({
  items,
  onYudisium,
  isTRegistered = true,
  isTitleAccepted = false,
}) => {
  const [isPersyaratanAwalOpen, setIsPersyaratanAwalOpen] = useState(false);
  const [isPersyaratanSidangAkhirOpen, setIsPersyaratanSidangAkhirOpen] =
    useState(false);
  const [
    isPersyaratanSeminarProposalOpen,
    setIsPersyaratanSeminarProposalOpen,
  ] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  
  const handleSubmitDrive = () => {
    console.log('Drive Link:', driveLink);

    if (!driveLink) {
      alert('Link Google Drive tidak boleh kosong');
      return;
    }

    setIsPersyaratanAwalOpen(false);
    setIsPersyaratanSidangAkhirOpen(false);
    setIsPersyaratanSeminarProposalOpen(false);
  };

  const [openDaftarTA, setOpenDaftarTA] = useState(false);
  const [openRevisiJudul, setOpenRevisiJudul] = useState(false);

  const handleContinueDaftar = () => {
    setOpenDaftarTA(false);
    navigateTo('mahasiswa/pendaftaran/tugas-akhir');
  };

  const handleSelectSkemaRevisi = (type: 'skripsi' | 'non-skripsi') => {
    setOpenRevisiJudul(false);
    if (type === 'skripsi') {
      navigateTo('mahasiswa/pendaftaran/skripsi');
    } else {
      navigateTo('mahasiswa/pendaftaran/non-skripsi');
    }
  };

  const mapToModalItems = (details: any[]) => details.map(d => ({
    label: d.namaPersyaratan,
    status: (d.status === 'Valid' ? 'Valid' : 'Belum Valid') as 'Valid' | 'Belum Valid'
  }));

  const getStageCoordinatorNote = () => '';

  const persyaratanAwalItems = mapToModalItems([]);
  const persyaratanSeminarProposalItems = mapToModalItems([]);
  const persyaratanSidangAkhirItems = mapToModalItems([]);

  return (
    <BaseCard>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground">Statistics</p>
          <h2 className="text-lg font-semibold">Progres Pemenuhan Persyaratan</h2>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className={`px-3 py-1 text-xs rounded-full ${isTRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
            {isTRegistered ? '✅ Sudah Daftar TA' : '⏳ Belum Daftar TA'}
          </span>
          <span className={`px-3 py-1 text-xs rounded-full ${isTitleAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {isTitleAccepted ? '✅ Judul Diterima' : '⏳ Judul Belum Diterima'}
          </span>
        </div>
      </div>

      {/* Progress List */}
      <div className="space-y-5">
        {items.map((item, index) => (
          <ProgressRow key={index} {...item} />
        ))}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-6 mb-4">
        <ButtonPrimary onClick={() => setIsPersyaratanAwalOpen(true)}>
          Persyaratan Awal
        </ButtonPrimary>

        <ButtonPrimary onClick={() => setIsPersyaratanSidangAkhirOpen(true)}>
          Sidang Akhir
        </ButtonPrimary>

        <ButtonPrimary
          onClick={() => setIsPersyaratanSeminarProposalOpen(true)}
        >
          Seminar Proposal
        </ButtonPrimary>

        <ButtonPrimary onClick={onYudisium}>Yudisium</ButtonPrimary>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border mt-4 mb-2">
        <ButtonPrimary onClick={() => setOpenRevisiJudul(true)}>Revisi Judul</ButtonPrimary>
        <ButtonPrimary onClick={() => setOpenDaftarTA(true)}>Daftar Tugas Akhir</ButtonPrimary>
      </div>

      <ConditionModal
        open={isPersyaratanAwalOpen}
        onClose={() => setIsPersyaratanAwalOpen(false)}
        items={persyaratanAwalItems}
        driveLink={driveLink}
        onDriveLinkChange={setDriveLink}
        additionalNote="Untuk Pembayaran Tugas Akhir dibayarkan hanya tunai di bagian Tata Usaha (TU) FAKULTAS FARMASI UBP KARAWANG"
        onSubmitDrive={handleSubmitDrive}
        coordinatorNote={getStageCoordinatorNote()}
      />
      <ConditionModal
        open={isPersyaratanSidangAkhirOpen}
        onClose={() => setIsPersyaratanSidangAkhirOpen(false)}
        items={persyaratanSidangAkhirItems}
        driveLink={driveLink}
        onDriveLinkChange={setDriveLink}
        onSubmitDrive={handleSubmitDrive}
        coordinatorNote={getStageCoordinatorNote()}
      />
      <ConditionModal
        open={isPersyaratanSeminarProposalOpen}
        onClose={() => setIsPersyaratanSeminarProposalOpen(false)}
        items={persyaratanSeminarProposalItems}
        driveLink={driveLink}
        onDriveLinkChange={setDriveLink}
        onSubmitDrive={handleSubmitDrive}
        coordinatorNote={getStageCoordinatorNote()}
      />

      <SkemaRevisiModal
        open={openRevisiJudul}
        onClose={() => setOpenRevisiJudul(false)}
        onSelect={handleSelectSkemaRevisi}
      />
      <ConfirmModal
        open={openDaftarTA}
        onClose={() => setOpenDaftarTA(false)}
        title="Daftar Tugas Akhir"
        description="Syarat melakukan pendaftaran tugas akhir adalah dengan memenuhi Persyaratan Awal. Jika anda sudah menyelesaikan Persyaratan Awal silahkan tekan 'Lanjutkan' untuk melakukan pendaftaran Tugas Akhir"
        confirmText="Lanjutkan"
        cancelText="Kembali"
        onConfirm={handleContinueDaftar}
      />
    </BaseCard>
  );
};

export default ProgressRequirement;

/* ------------------ Sub Components ------------------ */

interface ProgressRowProps {
  label: string;
  value: number;
  total: number;
}

const ProgressRow: React.FC<ProgressRowProps> = ({ label, value, total }) => {
  const percentage = total === 0 ? 0 : (value / total) * 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-primary">
          {value}/{total}
        </span>
      </div>

      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full primary-gradient-lr transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
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
      className="w-full primary-gradient-lr text-white py-2 rounded-lg font-medium hover:opacity-90 transition cursor-pointer shadow-xs"
    >
      {children}
    </button>
  );
};
