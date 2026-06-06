import { SectionCard } from "../../../../components/ui/SectionCard";
import { ProsesPersetujuan } from "../../components/dashboard/ApprovalProcess";

import { approvalProcessMocks } from "../../../../mock-data/student-ui-mocks";

const PersetujuanSection = () => {
  return (
    <section className="">
      <SectionCard title="Proses Persetujuan" className="w-full">
        <div
          className="grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-3"
        >
          {approvalProcessMocks.map((process, index) => (
            <ProsesPersetujuan
              key={index}
              tahap={process.tahap}
              items={process.items}
            />
          ))}
        </div>
      </SectionCard>
    </section>
  );
};

export default PersetujuanSection;
