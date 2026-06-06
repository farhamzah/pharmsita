import { useState } from "react";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { GuideButton } from "../../../../components/ui/GuideButton";
import { FullScreenGuideModal } from "../../../../components/ui/FullScreenGuideModal";

type StatusItem = {
  label: string;
  value: number;
  variant: 'warning' | 'success' | 'info';
};

interface StatusCatatanBimbinganProps {
  title?: string;
  items: StatusItem[];
  className?: string;
}

export default function StatusCatatanBimbingan({
  title = "Status Catatan Bimbingan",
  items,
  className = 'w-full',
}: StatusCatatanBimbinganProps) {
  const [openGuide, setOpenGuide] = useState(false);

  return (
    <>
      <SectionCard
        title={title}
        className={className}
        guide={<GuideButton onClick={() => setOpenGuide(true)} />}
      >
        <div
          className="
            grid
            grid-cols-2
            gap-2
            sm:grid-cols-3
            md:flex
            md:flex-wrap
          "
        >
          {items.map((item, index) => (
            <StatusItemRow key={index} {...item} />
          ))}
        </div>
      </SectionCard>

      {/* FULL SCREEN GUIDE MODAL */}
      <FullScreenGuideModal
        open={openGuide}
        onClose={() => setOpenGuide(false)}
        title="Panduan Status Catatan Bimbingan"
      >
        <div className="space-y-4">
          <p>
            Fitur ini menampilkan ringkasan status catatan bimbingan mahasiswa.
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>
              <b>Revisi</b> : Status catatan yang perlu dikerjakan untuk
              mencapai maksimal bimbingan.
            </li>
            <li>
              <b>Send</b> : Status catatan biasa yang digunakan untuk bertanya
              atau memberikan informasi.
            </li>
            <li>
              <b>Approve</b> : Status yang menandakan revisi telah selesai.
            </li>
          </ul>

          <p>
            Gunakan informasi ini untuk memonitor progres dan tindak lanjut
            bimbingan secara berkala.
          </p>
        </div>
      </FullScreenGuideModal>
    </>
  );
}

const variantStyles = {
  warning: 'border-yellow-300 bg-yellow-50',
  success: 'border-green-300 bg-green-50',
  info: 'border-blue-300 bg-blue-50',
};

function StatusItemRow({ label, value, variant }: StatusItem) {
  return (
    <div
      className={`
        rounded-xl
        border
        px-3
        py-2
        text-center
        flex-1
        min-w-25
        ${variantStyles[variant]}
      `}
    >
      <p className="text-xs sm:text-sm font-medium truncate">{label}</p>
      <p className="text-base sm:text-lg font-semibold">{value}</p>
    </div>
  );
}
