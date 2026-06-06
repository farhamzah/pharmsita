import ProgressRequirement from "../../components/profile/ProgressRequirement";

import { requirementProgressMock } from "../../../../mock-data/student-ui-mocks";

const ProgressPersyaratanSection = () => {
  return (
    <section>
      <ProgressRequirement
        items={requirementProgressMock}
        // onSeminarProposal={() => console.log('Seminar Proposal')}
        // onTugasAkhir={() => console.log('Tugas Akhir')}
        // onYudisium={() => console.log('Yudisium')}
      />
    </section>
  );
};

export default ProgressPersyaratanSection;
