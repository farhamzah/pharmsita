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
            nama: 'Dimas Indra Jaya',
            nim: '21103045',
            email: 'dimas@email.com',
            phone: '08123456789',
            tanggalLahir: '2001-06-12',
            angkatan: '2021',
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
