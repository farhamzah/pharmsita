import ContentWrapper from "../../../components/ContentWrapper";
import MainLayout from "../../../layouts/MainLayout";
import { UnifiedProfileView } from "../../../components/shared/UnifiedProfileView";
import { mockStudentProfiles } from "../../../mock-data/profiles";
import { useSessionProfile } from "../../shared/hooks/useSessionProfile";

const DetailProfilPage = () => {
  const { profile: studentProfile, isLoading, error, saveProfile } = useSessionProfile(
    mockStudentProfiles[0]
  );

  return (
    <MainLayout>
      <ContentWrapper
        title="Profil Saya"
        description="Pantau detail informasi akun mahasiswa, data kelayakan akademik, serta progres persyaratan Tugas Akhir."
      >
        <div className="space-y-6 animate-in fade-in duration-500">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Memuat profil session...</p>
          )}
          {error && <p className="text-sm text-amber-600">{error}</p>}
          <UnifiedProfileView
            initialProfile={studentProfile}
            isProfileLoading={isLoading}
            onSave={saveProfile}
          />
        </div>
      </ContentWrapper>
    </MainLayout>
  );
};

export default DetailProfilPage;
