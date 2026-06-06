import ContentWrapper from "../../../components/ContentWrapper";
import MainLayout from "../../../layouts/MainLayout";
import DetailParticipantSection from "../../student/sections/detail-profil/ParticipantDetailSection";
import ExaminerSection from "../../student/sections/seminar-proposal/ExaminerSection";
import ProposalNotesSection from "../../student/sections/seminar-proposal/ProposalNotesSection";
import { SectionCard } from "../../../components/ui/SectionCard";
import DownloadFileCard from "../components/DownloadFileCard";
import ViewLinkCard from "../components/ViewLinkCard";
import { useState, useEffect } from "react";
import {
  examiner1,
  examiner2,
  ketuaSidang,
} from "../../../mock-data/student-ui-mocks";
import { approvalFinalisasi as approvalMock } from "../../../mock-data/student-ui-mocks";
import { StatusGuidanceCard } from "../../student/components/seminar-proposal/StatusGuidanceCard";
import { ArrowLeft } from "lucide-react";
import { TahapanValidationPanel } from "../components/TahapanValidationPanel";
import { LecturerStudentStageTabs } from "../components/LecturerStudentStageTabs";
import { 
  getStudentById, 
  getLecturerRoleForStudent, 
  getRoleGroup, 
  getAgendaByStage,
  getNotesByStage,
  shouldShowAssessmentButton,
  CURRENT_LECTURER_ID,
  formatAgendaLabel
} from "../utils/db-helpers";

const LecturerRevisionFinalizationPage = () => {
  const [studentId, setStudentId] = useState<string>('1');

  useEffect(() => {
    const hash = window.location.hash;
    const parts = hash.split('/');
    const id = parts[parts.length - 1];
    if (id) setStudentId(id);
  }, []);

  const handleBack = () => {
    window.location.hash = "#/dosen/mahasiswa-bimbingan";
  };

  const student = getStudentById(studentId);
  const rawRole = getLecturerRoleForStudent(studentId, CURRENT_LECTURER_ID);
  const roleGroup = rawRole ? getRoleGroup(rawRole) : 'pembimbing';
  
  const stage = 'Revisi & Finalisasi';
  const showAssessment = shouldShowAssessmentButton(roleGroup, stage);
  const agendaData = getAgendaByStage(studentId, stage);
  const notesData = getNotesByStage(studentId, stage);

  const activeAgenda = {
    agenda: "Revisi & Finalisasi",
    tanggal: agendaData.date,
    waktu: agendaData.time,
    ruang: agendaData.room,
    lokasi: agendaData.location,
    roleLabel: rawRole ? formatAgendaLabel(rawRole) : 'Dosen'
  };

  const agreement = approvalMock.length;
  const currentAgreement = approvalMock.filter((i) => i.status === "fulfilled").length;

  if (!student) {
    return (
      <MainLayout>
        <ContentWrapper title="Loading..." description="Memuat data mahasiswa"><div /></ContentWrapper>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ContentWrapper
        title="Detail Revisi & Finalisasi Mahasiswa"
        description="Tinjauan progres revisi dan finalisasi — akses khusus dosen"
        headerRight={
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        }
      >
        <DetailParticipantSection student={student} />

        <LecturerStudentStageTabs activeTab={stage} studentId={studentId} />

        <ExaminerSection
          examiner1={examiner1}
          examiner2={examiner2}
          ketuaSidang={ketuaSidang}
          agenda={activeAgenda}
          actionSlot={
            showAssessment && agendaData.exists ? (
              <button
                className="w-full bg-primary text-primary-foreground font-medium text-sm py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                📝 Isi Form Penilaian
              </button>
            ) : undefined
          }
        />

        <div className="flex sm:flex-col flex-col-reverse gap-4">
          <section className="flex md:flex-row flex-col gap-4">
            <SectionCard
              title="File & Link Revisi Mahasiswa"
              bodyClassName="grid grid-cols-1 xl:grid-cols-2 gap-4"
            >
              <DownloadFileCard
                description="File revisi skripsi yang telah diupload oleh mahasiswa."
                fileName={student.fileSkripsi}
                fileSize="4.1 MB"
              />
              <ViewLinkCard
                description="Link Google Docs revisi yang telah disubmit oleh mahasiswa."
                link={student.linkSkripsi}
              />
            </SectionCard>

            <StatusGuidanceCard
              title="Status Finalisasi"
              agreement={agreement}
              currentAgreement={currentAgreement}
              approvals={approvalMock}
              buttonLabel="Status Revisi & Finalisasi"
              onButtonClick={() => {}}
            />
          </section>

          {/* Catatan Bimbingan — diambil dari database mock */}
          <ProposalNotesSection data={notesData} canAddNote={true} />

          {/* Panel Validasi Tahapan */}
          <TahapanValidationPanel type={roleGroup} tahapan={stage} />
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default LecturerRevisionFinalizationPage;
