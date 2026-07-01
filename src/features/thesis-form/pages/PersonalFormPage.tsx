import FromLayout from "../../../layouts/FormLayout";
import ContentWrapper from "../../../components/ContentWrapper";
import BackToHomeButton from "../../../components/ui/BackToHomeButton";
import FormPersonalData from "../components/PersonalDataForm";

const FormulirPersonalPage = () => {
  const handleSubmit = (values: any) => {
    console.log('Update Personal Data:', values);

    // nanti bisa dihubungkan ke API update profile
  };

  return (
    <FromLayout>
      <ContentWrapper
        title="Data Personal Mahasiswa"
        description="Silakan perbarui data diri mahasiswa sebelum melanjutkan proses Tugas Akhir."
        bodyClassName="px-0 sm:px-10"
        headerClassName="px-0 sm:px-10"
      >
        <FormPersonalData
          defaultValues={{
            nama: '',
            nim: '',
            email: '',
            phone: '',
            tanggalLahir: '',
            angkatan: '',
            skema: 'skripsi',
          }}
          submitText="Simpan Perubahan"
          onSubmit={handleSubmit}
        />

        <BackToHomeButton />
      </ContentWrapper>
    </FromLayout>
  );
};

export default FormulirPersonalPage;
