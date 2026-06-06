import FromLayout from "../../../layouts/FormLayout";
import ContentWrapper from "../../../components/ContentWrapper";
import FormNonSkripsiSection from "../sections/NonThesisFormSection";

const FormulirRevisiNonSkripsiPage = () => {
  return (
    <FromLayout>
      <ContentWrapper
        title="Revisi Tugas Akhir (Non Skripsi)"
        description="Silakan lakukan revisi pengajuan Tugas Akhir Non Skripsi sesuai dengan catatan yang diberikan."
        bodyClassName="px-0 sm:px-10"
        headerClassName="px-0 sm:px-10"
      >
        <FormNonSkripsiSection />
      </ContentWrapper>
    </FromLayout>
  );
};

export default FormulirRevisiNonSkripsiPage;
