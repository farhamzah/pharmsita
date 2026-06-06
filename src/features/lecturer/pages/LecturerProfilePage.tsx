import React from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { UnifiedProfileView } from '../../../components/shared/UnifiedProfileView';
import { mockLecturerProfiles } from '../../../mock-data/profiles';

export const LecturerProfilePage: React.FC = () => {
  // Use default lecturer profile (Dr. Apt. Rina Marlina, M.Farm.)
  const lecturerProfile = mockLecturerProfiles[0];

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
         title="Profil Dosen" 
         description="Kelola informasi pribadi, kontak terdaftar, keahlian riset, serta kuota akademik bimbingan Tugas Akhir Anda."
      >
        <div className="animate-in fade-in duration-500">
          <UnifiedProfileView initialProfile={lecturerProfile} />
        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default LecturerProfilePage;
