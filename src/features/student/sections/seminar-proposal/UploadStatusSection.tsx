import { SectionCard } from "../../../../components/ui/SectionCard";
import type { ApprovalItem } from "../../types/approval";
import LinkInputCard from "../../components/seminar-proposal/LinkInputCard";
import { StatusGuidanceCard } from "../../components/seminar-proposal/StatusGuidanceCard";
import UploadFileCard from "../../components/seminar-proposal/UploadFileCard";

interface Props {
  approvals: ApprovalItem[];
  onSubmit: () => void;
  labelSubmit: string;
}

export default function UploadStatusSection({
  approvals,
  onSubmit,
  labelSubmit,
}: Props) {
  const agreement = approvals.length;
  const currentAgreement = approvals.filter(
    (item) => item.status === "fulfilled",
  ).length;

  return (
    <section className="flex md:flex-row flex-col gap-4">
      <SectionCard
        title="Upload File & Link Skripsi"
        bodyClassName="grid grid-cols-1 xl:grid-cols-2 gap-4"
      >
        <UploadFileCard description="Upload file skripsi yang sudah selesai untuk mengajukan jadwal" />
        <LinkInputCard
          placeholder="https://docs.google.com/..."
          description="Masukan link Google Docs"
        />
      </SectionCard>

      <StatusGuidanceCard
        title="Status Bimbingan"
        agreement={agreement}
        currentAgreement={currentAgreement}
        approvals={approvals}
        buttonLabel={labelSubmit}
        onButtonClick={onSubmit}
      />
    </section>
  );
}
