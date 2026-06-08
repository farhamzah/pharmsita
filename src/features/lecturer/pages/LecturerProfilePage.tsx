import React from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { UnifiedProfileView } from '../../../components/shared/UnifiedProfileView';
import { mockLecturerProfiles } from '../../../mock-data/profiles';
import { useSessionProfile } from '../../shared/hooks/useSessionProfile';

export const LecturerProfilePage: React.FC = () => {
  const { profile: lecturerProfile, isLoading, error, saveProfile } = useSessionProfile(
    mockLecturerProfiles[0]
  );

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
         title="Profil Dosen" 
         description="Kelola informasi pribadi, kontak terdaftar, keahlian riset, serta kuota akademik bimbingan Tugas Akhir Anda."
      >
        <div className="animate-in fade-in duration-500">
          {isLoading && (
            <p className="mb-4 text-sm text-muted-foreground">Memuat profil session...</p>
          )}
          {error && <p className="mb-4 text-sm text-amber-600">{error}</p>}
          <UnifiedProfileView
            initialProfile={lecturerProfile}
            isProfileLoading={isLoading}
            onSave={saveProfile}
          />
        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default LecturerProfilePage;
