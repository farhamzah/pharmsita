import { BaseCard } from "../../../../components/ui/BaseCard";
import { SectionCard } from "../../../../components/ui/SectionCard";
import FinalProjectTitle from "../../components/seminar-proposal/FinalProjectTitle";
import ParticipantInfoGrid from "../../components/seminar-proposal/ParticipantInfoGrid";
import { profileDataMock } from "../../../../mock-data/student-ui-mocks";
import { mockStudentProfiles } from "../../../../mock-data/profiles";
// import TagList from "../../components/seminar-proposal/TagList";

interface Props {
  student?: {
    nama: string;
    nim: string;
    judulTA: string;
  };
}

const DetailParticipantSection: React.FC<Props> = ({ student }) => {
  const data = mockStudentProfiles.find(s => s.nim === student?.nim) || profileDataMock;

  return (
    <section>
      <SectionCard title="Detail Peserta Tugas Akhir" bodyClassName="space-y-4">
        <BaseCard className="py-2">
          <ParticipantInfoGrid
            items={[
              { label: 'Nama', value: student?.nama || data.name },
              { label: 'NIM', value: student?.nim || data.nim },
              { label: 'Program Studi', value: data.programStudi || '-' },
              { label: 'Skema TA', value: data.skemaTA || '-' },
              { label: 'Jenis TA', value: data.jenisTA || '-' },
              { label: 'Pembimbing Utama', value: data.pembimbing1 || '-' },
              { label: 'Pembimbing Pendamping', value: data.pembimbing2 || '-' },
              { label: 'Status Pengajuan', value: data.statusPengajuan || '-' },
            ]}
          />
        </BaseCard>
        <div className="flex lg:flex-row flex-col gap-4">
          <FinalProjectTitle
            title="Judul Tugas Akhir"
            description={student?.judulTA || data.judulTA || "-"}
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
