import { SectionCard } from "../../../../components/ui/SectionCard";
import { AgendaTerdekat } from "../../components/dashboard/UpcomingAgenda";
import ExaminerCard from "../../components/seminar-proposal/ExaminerCard";
import ExaminerGrid from "../../components/seminar-proposal/ExaminerGrid";

export interface Examiner {
  name: string;
  nidn: string;
  email: string;
}

interface Agenda {
  agenda: string;
  tanggal: string;
  waktu: string;
  ruang: string;
  lokasi: string;
  roleLabel?: string;
}

interface Props {
  examiner1: Examiner;
  examiner2: Examiner;
  ketuaSidang: Examiner;
  agenda: Agenda;
  actionSlot?: React.ReactNode;
}

const ExaminerSection = ({
  examiner1,
  examiner2,
  ketuaSidang,
  agenda,
  actionSlot,
}: Props) => {
  return (
    <section className="flex gap-4 lg:flex-row flex-col">
      <SectionCard
        title="Penguji & Jadwal Sidang"
        bodyClassName="flex flex-col gap-4"
      >
        <ExaminerGrid examiner1={examiner1} examiner2={examiner2} />

        <ExaminerCard
          label="Ketua Sidang"
          name={ketuaSidang.name}
          nidn={ketuaSidang.nidn}
          email={ketuaSidang.email}
        />
      </SectionCard>

      <AgendaTerdekat {...agenda} actionSlot={actionSlot} />
    </section>
  );
};

export default ExaminerSection;
