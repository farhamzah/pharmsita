import ContentWrapper from "../../../components/ContentWrapper";
import MainLayout from "../../../layouts/MainLayout";
import DetailParticipantSection from "../../student/sections/detail-profil/ParticipantDetailSection";
import ExaminerSection from "../../student/sections/seminar-proposal/ExaminerSection";
import { BimbinganWorkflow } from "../../student/components/dashboard/BimbinganWorkflow";
import { ModalPenilaianSidang } from "../components/ModalPenilaianSidang";
import { useState, useEffect } from "react";
import { lecturerWorkflowApi } from "../../../core/api/domain";
import {
  examiner1,
  examiner2,
  ketuaSidang,
} from "../../../mock-data/student-ui-mocks";
import { ArrowLeft } from "lucide-react";
import { TahapanValidationPanel } from "../components/TahapanValidationPanel";
import { LecturerStudentStageTabs } from "../components/LecturerStudentStageTabs";
import { 
  getStudentById, 
  getLecturerRoleForStudent, 
  getRoleGroup, 
  getAgendaByStage,
  shouldShowAssessmentButton,
  CURRENT_LECTURER_ID,
  formatAgendaLabel
} from "../utils/db-helpers";

const LecturerProposalSeminarPage = () => {
  const [modalPenilaianOpen, setModalPenilaianOpen] = useState(false);
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
 
  const gradeFromScore = (score: number) => {
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "E";
  };

  const handleSavePenilaian = async (data: {
    scores: { presentasi: number; penulisan: number; tanyaJawab: number };
    revisions: { id: string; topik: string; catatan: string }[];
  }) => {
    const { scores, revisions } = data;
    const avg = Math.round(((scores.presentasi + scores.penulisan + scores.tanyaJawab) / 3) * 10) / 10;

    await lecturerWorkflowApi.updateExamAssessment(studentId, "sidang-proposal", {
      grade: gradeFromScore(avg),
      resultStatus: revisions.length > 0 ? "lulus-dengan-revisi" : "lulus",
    });

    setModalPenilaianOpen(false);
  };

  const student = getStudentById(studentId);
  const rawRole = getLecturerRoleForStudent(studentId, CURRENT_LECTURER_ID);
  const roleGroup = rawRole ? getRoleGroup(rawRole) : 'pembimbing';
  
  const stage = 'Seminar Proposal';
  const showAssessment = shouldShowAssessmentButton(roleGroup, stage);
  const agendaData = getAgendaByStage(studentId, stage);
 
  const activeAgenda = {
    agenda: "Seminar Proposal",
    tanggal: agendaData.date,
    waktu: agendaData.time,
    ruang: agendaData.room,
    lokasi: agendaData.location,
    roleLabel: rawRole ? formatAgendaLabel(rawRole) : 'Dosen'
  };

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
        title="Detail Seminar Proposal Mahasiswa"
        description="Tinjauan progres seminar proposal — akses khusus dosen"
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
            showAssessment ? (
              <button
                onClick={() => setModalPenilaianOpen(true)}
                className="w-full bg-primary text-primary-foreground font-medium text-sm py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                📝 Isi Form Penilaian
              </button>
            ) : undefined
          }
        />

        <div className="mt-6 flex flex-col gap-6">
          <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">🩺 Workflow Bimbingan Mahasiswa</h3>
            <BimbinganWorkflow
              stageId="bimbingan-pra-proposal"
              role="pembimbing"
              studentId={studentId}
              useLecturerApi
            />
          </div>

          <div className="flex sm:flex-col flex-col-reverse gap-4">
            {/* Panel Validasi Tahapan */}
            <TahapanValidationPanel type={roleGroup} tahapan={stage} />
          </div>
        </div>
      </ContentWrapper>

      <ModalPenilaianSidang
        open={modalPenilaianOpen}
        onClose={() => setModalPenilaianOpen(false)}
        onSave={handleSavePenilaian}
        tahap="Seminar Proposal"
      />
    </MainLayout>
  );
};

export default LecturerProposalSeminarPage;
