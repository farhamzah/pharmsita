import React from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import { UnifiedProfileView } from '../../../components/shared/UnifiedProfileView';
import { mockAdminProfiles } from '../../../mock-data/profiles';

const AdminProfilePage: React.FC = () => {
  // Use default admin profile (Admin Prodi Farmasi)
  const adminProfile = mockAdminProfiles[0];

  return (
    <MainLayout>
      <ContentWrapper
        title="Profil Administrator"
        description="Kelola informasi pribadi, kontak terdaftar, divisi kerja, serta cakupan kelola modul master data Anda."
      >
        <div className="animate-in fade-in duration-500">
          <UnifiedProfileView initialProfile={adminProfile} />
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default AdminProfilePage;
