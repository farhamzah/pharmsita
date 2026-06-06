import ContentWrapper from "../../../components/ContentWrapper";
import MainLayout from "../../../layouts/MainLayout";
import DetailParticipantSection from "../../student/sections/detail-profil/ParticipantDetailSection";
import ExaminerSection from "../../student/sections/seminar-proposal/ExaminerSection";
import ProposalNotesSection from "../../student/sections/seminar-proposal/ProposalNotesSection";
import { SectionCard } from "../../../components/ui/SectionCard";
import DownloadFileCard from "../components/DownloadFileCard";
import ViewLinkCard from "../components/ViewLinkCard";
import { ModalPenilaianSidang } from "../components/ModalPenilaianSidang";
import type { ProposalNotesRef } from "../../student/sections/seminar-proposal/ProposalNotesSection";
import { useRef, useState, useEffect } from "react";
import { lecturerWorkflowApi } from "../../../core/api/domain";
import {
  examiner1,
  examiner2,
  ketuaSidang,
} from "../../../mock-data/student-ui-mocks";
import { approvalSidangAkhir as approvalMock } from "../../../mock-data/student-ui-mocks";
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

const LecturerFinalDefensePage = () => {
  const tableRef = useRef<ProposalNotesRef>(null);
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
    
    let revisionText = "";
    if (revisions.length > 0) {
      revisionText = "\nRevisi:\n" + revisions.map((rev, idx) => `${idx + 1}. [${rev.topik}] ${rev.catatan || '(Tanpa catatan)'}`).join("\n");
    } else {
      revisionText = "\nRevisi: Tidak ada.";
    }

    const noteContent = `Penilaian Sidang Akhir:
- Presentasi: ${scores.presentasi}
- Penulisan Tugas Akhir: ${scores.penulisan}
- Tanya Jawab: ${scores.tanyaJawab}
- Rata-rata: ${avg}
${revisionText}`;

    await lecturerWorkflowApi.updateExamAssessment(studentId, "sidang", {
      grade: gradeFromScore(avg),
      resultStatus: revisions.length > 0 ? "lulus-dengan-revisi" : "lulus",
    });

    tableRef.current?.addNote({
      date: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()),
      author: 'Anda',
      topic: 'Evaluasi Sidang Akhir',
      note: noteContent,
      status: revisions.length > 0 ? 'revision' : 'approved'
    });
    setModalPenilaianOpen(false);
  };

  const student = getStudentById(studentId);
  const rawRole = getLecturerRoleForStudent(studentId, CURRENT_LECTURER_ID);
  const roleGroup = rawRole ? getRoleGroup(rawRole) : 'pembimbing';
  
  const stage = 'Sidang Akhir';
  const showAssessment = shouldShowAssessmentButton(roleGroup, stage);
  const agendaData = getAgendaByStage(studentId, stage);
  const notesData = getNotesByStage(studentId, stage);

  const activeAgenda = {
    agenda: "Sidang Akhir",
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
        title="Detail Sidang Akhir Mahasiswa"
        description="Tinjauan progres sidang akhir — akses khusus dosen"
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
                onClick={() => setModalPenilaianOpen(true)}
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
              title="File & Link Skripsi Mahasiswa"
              bodyClassName="grid grid-cols-1 xl:grid-cols-2 gap-4"
            >
              <DownloadFileCard
                description="File skripsi final yang telah diupload oleh mahasiswa."
                fileName={student.fileSkripsi}
                fileSize="3.8 MB"
              />
              <ViewLinkCard
                description="Link Google Docs skripsi yang telah disubmit oleh mahasiswa."
                link={student.linkSkripsi}
              />
            </SectionCard>

            <StatusGuidanceCard
              title="Status Bimbingan"
              agreement={agreement}
              currentAgreement={currentAgreement}
              approvals={approvalMock}
              buttonLabel="Status Sidang Akhir"
              onButtonClick={() => {}}
            />
          </section>

          {/* Catatan Bimbingan — diambil dari mockup */}
          <ProposalNotesSection ref={tableRef} data={notesData} canAddNote={true} />

          {/* Panel Validasi Tahapan */}
          <TahapanValidationPanel type={roleGroup} tahapan={stage} />
        </div>
      </ContentWrapper>

      {/* Modal Penilaian Sidang */}
      <ModalPenilaianSidang
        open={modalPenilaianOpen}
        onClose={() => setModalPenilaianOpen(false)}
        onSave={handleSavePenilaian}
        tahap="Sidang Akhir"
      />
    </MainLayout>
  );
};

export default LecturerFinalDefensePage;
