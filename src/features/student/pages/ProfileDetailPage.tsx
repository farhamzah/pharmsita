import ContentWrapper from "../../../components/ContentWrapper";
import MainLayout from "../../../layouts/MainLayout";
import { UnifiedProfileView } from "../../../components/shared/UnifiedProfileView";
import { mockStudentProfiles } from "../../../mock-data/profiles";

const DetailProfilPage = () => {
  // Use the default student profile (Dimas Indra Jaya)
  const studentProfile = mockStudentProfiles[0];

  return (
    <MainLayout>
      <ContentWrapper
        title="Profil Saya"
        description="Pantau detail informasi akun mahasiswa, data kelayakan akademik, serta progres persyaratan Tugas Akhir."
      >
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Unified reusable profile component */}
          <UnifiedProfileView initialProfile={studentProfile} />

          {/* Requirement progress bar */}
          {/* <ProgressPersyaratanSection /> */}
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default DetailProfilPage;
