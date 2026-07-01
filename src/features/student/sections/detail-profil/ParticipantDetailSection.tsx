import { BaseCard } from "../../../../components/ui/BaseCard";
import { SectionCard } from "../../../../components/ui/SectionCard";
import FinalProjectTitle from "../../components/seminar-proposal/FinalProjectTitle";
import ParticipantInfoGrid from "../../components/seminar-proposal/ParticipantInfoGrid";
// import TagList from "../../components/seminar-proposal/TagList";

interface Props {
  student?: {
    nama: string;
    nim: string;
    judulTA: string;
  };
}

const DetailParticipantSection: React.FC<Props> = ({ student }) => {
  return (
    <section>
      <SectionCard title="Detail Peserta Tugas Akhir" bodyClassName="space-y-4">
        <BaseCard className="py-2">
          <ParticipantInfoGrid
            items={[
              { label: 'Nama', value: student?.nama || '-' },
              { label: 'NIM', value: student?.nim || '-' },
              { label: 'Program Studi', value: '-' },
              { label: 'Skema TA', value: '-' },
              { label: 'Jenis TA', value: '-' },
              { label: 'Pembimbing Utama', value: '-' },
              { label: 'Pembimbing Pendamping', value: '-' },
              { label: 'Status Pengajuan', value: '-' },
            ]}
          />
        </BaseCard>
        <div className="flex lg:flex-row flex-col gap-4">
          <FinalProjectTitle
            title="Judul Tugas Akhir"
            description={student?.judulTA || "-"}
          />
        </div>

        {/* <TagList
          tags={[
            'Sistem Informasi',
            'Manajemen Tugas Akhir',
            'Aplikasi Web',
            'Metode ADDIE',
          ]}
        /> */}
      </SectionCard>
    </section>
  );
};

export default DetailParticipantSection;
