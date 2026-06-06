import { AgendaTerdekat } from "../../components/dashboard/UpcomingAgenda";
import { BerkasPendukung } from "../../components/dashboard/SupportingDocuments";

import { upcomingAgendaMock, supportingDocumentsMock } from "../../../../mock-data/student-ui-mocks";

const AgendaSupportFileSection = () => {
  return (
    <section className="w-full flex flex-col lg:flex-row gap-4">
      <AgendaTerdekat {...upcomingAgendaMock} />
      <BerkasPendukung berkas={supportingDocumentsMock} />
    </section>
  );
};

export default AgendaSupportFileSection;
