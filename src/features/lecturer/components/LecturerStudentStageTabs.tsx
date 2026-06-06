import React from 'react';

interface Props {
  activeTab: 'Seminar Proposal' | 'Sidang Akhir' | 'Revisi & Finalisasi';
  studentId: string;
}

export const LecturerStudentStageTabs: React.FC<Props> = ({ activeTab, studentId }) => {
  const tabs = [
    { id: 'Seminar Proposal', label: 'Seminar Proposal', path: `#/dosen/mahasiswa-bimbingan/detail/${studentId}` },
    { id: 'Sidang Akhir', label: 'Sidang Akhir', path: `#/dosen/mahasiswa-bimbingan/sidang-akhir/${studentId}` },
    { id: 'Revisi & Finalisasi', label: 'Revisi & Finalisasi', path: `#/dosen/mahasiswa-bimbingan/revisi/${studentId}` },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-border/50 pb-4 mb-6">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.path}
          className={`px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 cursor-pointer ${
            activeTab === tab.id
              ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-border'
              : 'text-muted-foreground bg-muted/40 border border-border/50 hover:bg-muted hover:text-foreground'
          }`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
};
