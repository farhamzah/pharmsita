import React from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import { UnifiedProfileView } from '../../../components/shared/UnifiedProfileView';
import { mockAdminProfiles } from '../../../mock-data/profiles';
import { useSessionProfile } from '../../shared/hooks/useSessionProfile';

const AdminProfilePage: React.FC = () => {
  const { profile: adminProfile, isLoading, error, saveProfile } = useSessionProfile(
    mockAdminProfiles[0]
  );

  return (
    <MainLayout>
      <ContentWrapper
        title="Profil Administrator"
        description="Kelola informasi pribadi, kontak terdaftar, divisi kerja, serta cakupan kelola modul master data Anda."
      >
        <div className="animate-in fade-in duration-500">
          {isLoading && (
            <p className="mb-4 text-sm text-muted-foreground">Memuat profil session...</p>
          )}
          {error && <p className="mb-4 text-sm text-amber-600">{error}</p>}
          <UnifiedProfileView initialProfile={adminProfile} onSave={saveProfile} />
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default AdminProfilePage;
