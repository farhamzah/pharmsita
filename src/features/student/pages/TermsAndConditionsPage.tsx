import ContentWrapper from "../../../components/ContentWrapper";
import MainLayout from "../../../layouts/MainLayout";
import PersetujuanSection from "../sections/dashboard/ApprovalSection";
import ProgressPersyaratanSection from "../sections/detail-profil/RequirementProgressSection";

const SyaratDanKetentuanPage = () => {
  return (
    <MainLayout>
      <ContentWrapper
        title="Syarat & Ketentuan Tugas Akhir"
        description="Data detail syarat ketentuan yang berlaku"
      >
        <ProgressPersyaratanSection />
        <PersetujuanSection />
      </ContentWrapper>
    </MainLayout>
  );
};

export default SyaratDanKetentuanPage;
