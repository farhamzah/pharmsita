import ContentWrapper from "../../../components/ContentWrapper";
import MainLayout from "../../../layouts/MainLayout";
import DetailParticipantSection from "../sections/detail-profil/ParticipantDetailSection";
import ExaminerSection from "../sections/seminar-proposal/ExaminerSection";
import ProposalNotesSection from "../sections/seminar-proposal/ProposalNotesSection";
import UploadStatusSection from "../sections/seminar-proposal/UploadStatusSection";
import {
  examiner1,
  examiner2,
  ketuaSidang,
  agendaSidangKosong,
} from "../../../mock-data/student-ui-mocks";
import { approvalSidangAkhir as approvalMock } from "../../../mock-data/student-ui-mocks";
import { AuthService } from "../../../core/services/auth-service";
import { proposalNotesMock } from "../../../mock-data/student-ui-mocks";

const SidangAkhirPage = () => {
  const handleSubmit = () => {
    console.log('Ajukan Sidang Akhir');
  };
  const auth = new AuthService();
  const role = auth.getRole();

  return (
    <MainLayout>
      <ContentWrapper
        title="Proses Bimbingan Sidang Akhir"
        description="Bimbingan sebelum Sidang Akhir"
      >
        <DetailParticipantSection />
        <ExaminerSection
          examiner1={examiner1}
          examiner2={examiner2}
          ketuaSidang={ketuaSidang}
          agenda={agendaSidangKosong}
        />
        <div className="flex sm:flex-col flex-col-reverse gap-4">
          <UploadStatusSection
            approvals={approvalMock}
            onSubmit={handleSubmit}
            labelSubmit="Ajukan Sidang Akhir"
          />
          <ProposalNotesSection data={proposalNotesMock} canAddNote={!!role} />
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default SidangAkhirPage;
