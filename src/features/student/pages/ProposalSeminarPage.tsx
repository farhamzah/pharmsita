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
  agendaSidang,
} from "../../../mock-data/student-ui-mocks";
import { approvalSeminarProposal as approvalMock } from "../../../mock-data/student-ui-mocks";
import { AuthService } from "../../../core/services/auth-service";
import { proposalNotesMock } from "../../../mock-data/student-ui-mocks";

const SeminarProposalPage = () => {
  const handleSubmit = () => {
    console.log('Ajukan Sempro');
  };
  const auth = new AuthService();
  const role = auth.getRole();

  return (
    <MainLayout>
      <ContentWrapper
        title="Proses Bimbingan Seminar Proposal"
        description="Bimbingan sebelum Seminar Proposal"
      >
        <DetailParticipantSection />
        <ExaminerSection
          examiner1={examiner1}
          examiner2={examiner2}
          ketuaSidang={ketuaSidang}
          agenda={agendaSidang}
        />
        <div className="flex sm:flex-col flex-col-reverse gap-4">
          <UploadStatusSection
            approvals={approvalMock}
            onSubmit={handleSubmit}
            labelSubmit="Ajukan Seminar Proposal"
          />
          <ProposalNotesSection data={proposalNotesMock} canAddNote={!!role} />
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default SeminarProposalPage;
