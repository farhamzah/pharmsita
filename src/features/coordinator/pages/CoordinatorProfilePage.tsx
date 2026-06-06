import React from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { UnifiedProfileView } from '../../../components/shared/UnifiedProfileView';
import { mockCoordinatorProfiles } from '../../../mock-data/profiles';

export const CoordinatorProfilePage: React.FC = () => {
  // Use default coordinator profile (Dr. Apt. Siti Nurhayati, M.Farm.)
  const coordinatorProfile = mockCoordinatorProfiles[0];

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
        title="Profil Koordinator" 
        description="Kelola informasi pribadi, kontak terdaftar, jabatan struktural, serta tingkat otorisasi akses Anda."
      >
        <div className="animate-in fade-in duration-500">
          <UnifiedProfileView initialProfile={coordinatorProfile} />
        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorProfilePage;
