import FromLayout from "../../../layouts/FormLayout";
import ContentWrapper from "../../../components/ContentWrapper";
import { PendaftaranTACombined } from "../../student/components/dashboard/PendaftaranTACombined";
import BackToHomeButton from "../../../components/ui/BackToHomeButton";

const FormulirPendaftaranPage = () => {
  return (
    <FromLayout>
      <ContentWrapper
        title="Pendaftaran Tugas Akhir"
        description="Syarat dan ketentuan yang perlu di lakukan sebelum melakukan Tugas Akhir"
        bodyClassName="px-0 sm:px-10"
        headerClassName="px-0 sm:px-10"
      >
        <PendaftaranTACombined />
        <BackToHomeButton />
      </ContentWrapper>
    </FromLayout>
  );
};

export default FormulirPendaftaranPage;
