import StepFormNonSkripsi from "../components/NonThesisStepForm";

const FormNonSkripsiSection = () => {
  const handleSubmit = (values: any) => {
    console.log('Revisi Non Skripsi:', values);
  };

  const handleBack = () => {
    window.history.back();
  };

  return <StepFormNonSkripsi onBack={handleBack} onSubmit={handleSubmit} />;
};

export default FormNonSkripsiSection;
