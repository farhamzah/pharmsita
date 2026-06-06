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
import { approvalFinalisasi as approvalMock } from "../../../mock-data/student-ui-mocks";
import { AuthService } from "../../../core/services/auth-service";
import { proposalNotesKosong } from "../../../mock-data/student-ui-mocks";

const RevisiFinalisasiPage = () => {
  const handleSubmit = () => {
    console.log('Ajukan Revisi Finalisasi');
  };
  const auth = new AuthService();
  const role = auth.getRole();

  return (
    <MainLayout>
      <ContentWrapper
        title="Proses Akhir Finalisasi Revisi"
        description="Langkah terakhir sebelum menyelesaikan Tugas Akhir"
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
            labelSubmit="Ajukan revisi Finalisasi"
          />
          <ProposalNotesSection
            data={proposalNotesKosong}
            canAddNote={!!role}
          />
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default RevisiFinalisasiPage;
