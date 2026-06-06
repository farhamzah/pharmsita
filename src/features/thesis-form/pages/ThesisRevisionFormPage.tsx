import FromLayout from "../../../layouts/FormLayout";
import ContentWrapper from "../../../components/ContentWrapper";
import StepFormSkripsi from "../components/ThesisStepForm";

const FormulirRevisiSkripsiPage = () => {
  const handleSubmit = (values: any) => {
    console.log('submit skripsi', values);
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <FromLayout>
      <ContentWrapper
        title="Pendaftaran Skripsi"
        description="Silakan isi formulir pengajuan skripsi"
        bodyClassName="px-0 sm:px-10"
        headerClassName="px-0 sm:px-10"
      >
        <StepFormSkripsi onBack={handleBack} onSubmit={handleSubmit} />
      </ContentWrapper>
    </FromLayout>
  );
};

export default FormulirRevisiSkripsiPage;
