import React from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { UnifiedProfileView } from '../../../components/shared/UnifiedProfileView';
import type { LecturerProfile } from '../../../mock-data/profiles';
import { Roles } from '../../../mock-data/enums';
import { useSessionProfile } from '../../shared/hooks/useSessionProfile';

const emptyLecturerProfile: LecturerProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: Roles.LECTURER,
  status: 'Aktif',
  nidn: '',
  programStudi: '',
  bidangKeahlian: [],
  jabatanAkademik: '',
  kuotaPembimbing1: 0,
  kuotaTerpakaiPembimbing1: 0,
  kuotaTersediaPembimbing1: 0,
  kuotaPembimbing2: 0,
  kuotaTerpakaiPembimbing2: 0,
  kuotaTersediaPembimbing2: 0,
  peranSistem: [],
};

export const LecturerProfilePage: React.FC = () => {
  const { profile: lecturerProfile, isLoading, error, saveProfile } = useSessionProfile(
    emptyLecturerProfile
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
