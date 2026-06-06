import React, { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';

// Sections
import DetailParticipantSection from '../../features/student/sections/detail-profil/ParticipantDetailSection';
import DetailProfilSection from '../../features/student/sections/detail-profil/ProfileDetailSection';
import ProgressPersyaratanSection from '../../features/student/sections/detail-profil/RequirementProgressSection';

import ExaminerSection from '../../features/student/sections/seminar-proposal/ExaminerSection';
import ProposalNotesSection from '../../features/student/sections/seminar-proposal/ProposalNotesSection';
import UploadStatusSection from '../../features/student/sections/seminar-proposal/UploadStatusSection';

// Mocks
import {
  examiner1,
  examiner2,
  ketuaSidang,
  agendaSidang,
  agendaSidangKosong,
  approvalSeminarProposal,
  approvalSidangAkhir,
  approvalFinalisasi,
  proposalNotesMock,
  proposalNotesKosong,
} from '../../mock-data/student-ui-mocks';

type TabType = 'profil' | 'sempro' | 'sidang' | 'revisi';

interface SharedStudentDetailProps {
  student: {
    id: string;
    name: string;
    nim: string;
    title?: string;
    judulTA?: string;
  };
  onBack: () => void;
  showValidationPanel?: boolean;
}

export const SharedStudentDetail: React.FC<SharedStudentDetailProps> = ({ student, onBack, showValidationPanel = false }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profil');

  // fallback to ensure title is present
  const studentTitle = student.title || student.judulTA || 'Belum mengajukan judul';

  const renderValidationPanel = (stageName: string) => {
    if (!showValidationPanel) return null;
    return (
      <SectionCard title={`Panel Validasi: ${stageName}`} className="border-primary border shadow-sm mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2 mb-1 text-foreground">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Validasi Koordinator ({stageName})
            </h3>
            <p className="text-sm text-muted-foreground">Berikan keputusan validasi akhir untuk mahasiswa ini.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-4 py-2 border border-amber-200 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium rounded-md hover:bg-amber-100 transition-colors">
              Kembalikan Berkas
            </button>
            <button className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors">
              Setujui Tahapan
            </button>
          </div>
        </div>
      </SectionCard>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-input bg-card px-3 py-1.5 rounded-md hover:bg-muted shadow-sm transition">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Detail Mahasiswa</h2>
        <p className="text-muted-foreground text-sm">
          Tinjau progres tugas akhir: <span className="font-semibold text-foreground">{student.name} ({student.nim})</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-4 mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'profil', label: 'Data Profil' },
          { id: 'sempro', label: 'Seminar Proposal' },
          { id: 'sidang', label: 'Sidang Akhir' },
          { id: 'revisi', label: 'Revisi & Finalisasi' },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as TabType)} 
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'profil' && (
          <div className="flex flex-col lg:flex-row items-center lg:items-start w-full gap-4 relative">
            <div className="block lg:sticky top-16">
              <DetailProfilSection />
            </div>
            <div className="w-full space-y-4">
              <ProgressPersyaratanSection />
              <DetailParticipantSection student={{ nama: student.name, nim: student.nim, judulTA: studentTitle }} />
            </div>
          </div>
        )}

        {activeTab === 'sempro' && (
          <div className="space-y-4">
            <DetailParticipantSection student={{ nama: student.name, nim: student.nim, judulTA: studentTitle }} />
            <ExaminerSection examiner1={examiner1} examiner2={examiner2} ketuaSidang={ketuaSidang} agenda={agendaSidang} />
            <div className="flex sm:flex-col flex-col-reverse gap-4">
              <UploadStatusSection approvals={approvalSeminarProposal} onSubmit={() => {}} labelSubmit="Status Berkas Sempro" />
              <ProposalNotesSection data={proposalNotesMock} canAddNote={true} />
            </div>
            {renderValidationPanel('Seminar Proposal')}
          </div>
        )}

        {activeTab === 'sidang' && (
          <div className="space-y-4">
            <DetailParticipantSection student={{ nama: student.name, nim: student.nim, judulTA: studentTitle }} />
            <ExaminerSection examiner1={examiner1} examiner2={examiner2} ketuaSidang={ketuaSidang} agenda={agendaSidangKosong} />
            <div className="flex sm:flex-col flex-col-reverse gap-4">
              <UploadStatusSection approvals={approvalSidangAkhir} onSubmit={() => {}} labelSubmit="Status Berkas Sidang" />
              <ProposalNotesSection data={proposalNotesMock} canAddNote={true} />
            </div>
            {renderValidationPanel('Sidang Akhir')}
          </div>
        )}

        {activeTab === 'revisi' && (
          <div className="space-y-4">
            <DetailParticipantSection student={{ nama: student.name, nim: student.nim, judulTA: studentTitle }} />
            <ExaminerSection examiner1={examiner1} examiner2={examiner2} ketuaSidang={ketuaSidang} agenda={agendaSidangKosong} />
            <div className="flex sm:flex-col flex-col-reverse gap-4">
              <UploadStatusSection approvals={approvalFinalisasi} onSubmit={() => {}} labelSubmit="Status Berkas Finalisasi" />
              <ProposalNotesSection data={proposalNotesKosong} canAddNote={true} />
            </div>
            {renderValidationPanel('Revisi & Finalisasi')}
          </div>
        )}
      </div>
    </div>
  );
};
