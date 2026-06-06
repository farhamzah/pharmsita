import Button from "../../../../components/ui/Button";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { ProgressCircle } from "../../../../components/ui/ProgressCircle";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import type { ApprovalItem } from "../../types/approval";

type StatusGuidanceCardProps = {
  title: string;
  agreement: number;
  currentAgreement: number;
  approvals: ApprovalItem[];
  buttonLabel: string;
  onButtonClick?: () => void;
};

export function StatusGuidanceCard({
  title,
  agreement: agreement,
  currentAgreement,
  approvals,
  buttonLabel,
  onButtonClick,
}: StatusGuidanceCardProps) {
  return (
    <SectionCard title={title}>
      <div className="space-y-6 ">
        {/* Section Persetujuan */}
        <div>
          <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-x-8 gap-y-4">
            {/* Row 2 - Circle */}
            <div className="flex flex-col gap-4 items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground text-center px-2 py-2">
                Persetujuan
              </h3>
              <ProgressCircle
                current={currentAgreement}
                total={agreement}
                className="h-40"
              />
              <Button onClick={onButtonClick} size="md">
                {buttonLabel}
              </Button>
            </div>

            {/* Row 2 - List */}
            <div className="space-y-3 text-sm pt-0 xl:pt-13">
              {approvals.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between    ${
                    item.highlight
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{item.label}</span>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Button */}
      </div>
    </SectionCard>
  );
}
