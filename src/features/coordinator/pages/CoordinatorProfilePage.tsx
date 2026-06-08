import React from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { UnifiedProfileView } from '../../../components/shared/UnifiedProfileView';
import { mockCoordinatorProfiles } from '../../../mock-data/profiles';
import { useSessionProfile } from '../../shared/hooks/useSessionProfile';

export const CoordinatorProfilePage: React.FC = () => {
  const { profile: coordinatorProfile, isLoading, error, saveProfile } = useSessionProfile(
    mockCoordinatorProfiles[0]
  );

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
        title="Profil Koordinator" 
        description="Kelola informasi pribadi, kontak terdaftar, jabatan struktural, serta tingkat otorisasi akses Anda."
      >
        <div className="animate-in fade-in duration-500">
          {isLoading && (
            <p className="mb-4 text-sm text-muted-foreground">Memuat profil session...</p>
          )}
          {error && <p className="mb-4 text-sm text-amber-600">{error}</p>}
          <UnifiedProfileView
            initialProfile={coordinatorProfile}
            isProfileLoading={isLoading}
            onSave={saveProfile}
          />
        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorProfilePage;
