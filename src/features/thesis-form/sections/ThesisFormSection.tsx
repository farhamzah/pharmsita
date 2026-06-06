import StepFormSkripsi from "../components/ThesisStepForm";

const FormSkripsiSection = () => {
  const handleSubmit = (values: any) => {
    console.log(values);
  };

  return (
    <StepFormSkripsi
      onBack={() => window.history.back()}
      onSubmit={handleSubmit}
    />
  );
};

export default FormSkripsiSection;
