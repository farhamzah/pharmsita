import { Stepper } from "@/components/ui/Stepper";
import type { Step } from "@/components/ui/Stepper";
import { StatusTugasAkhir } from "../../components/dashboard/FinalProjectStatus";
import StatusCatatanBimbingan from "../../components/dashboard/GuidanceNotesStatus";
import { BaseCard } from "../../../../components/ui/BaseCard";

const StepperStatusSection = () => {
  const steps: Step[] = [
    { title: 'Upload Berkas', status: 'completed' },
    { title: 'Ajukan Judul', status: 'completed' },
    { title: 'Seminar Proposal', status: 'active' },
    { title: 'Sidang Akhir', status: 'pending' },
    { title: 'Revisi', status: 'pending' },
  ];

  return (
    <section className="w-full flex flex-col gap-4">
      <BaseCard>
        <Stepper steps={steps} />
      </BaseCard>
      <div className="flex gap-4 flex-col lg:flex-row ">
        <StatusTugasAkhir
          tahap="Pengajuan Judul"
          status="Active"
          onClick={() => console.log('Klik cek berkas')}
        />

        <StatusCatatanBimbingan
          items={[
            { label: 'Revisi', value: 5, variant: 'warning' },
            { label: 'Send', value: 5, variant: 'success' },
            { label: 'Approve', value: 5, variant: 'info' },
          ]}
        />
      </div>
    </section>
  );
};

export default StepperStatusSection;
