// components/sidang/PengujiGrid.tsx
import ExaminerCard from "./ExaminerCard";

export type Examiner = {
  name: string;
  nidn: string;
  email?: string;
};

interface ExaminerGridProps {
  examiner1: Examiner;
  examiner2: Examiner;
}

export default function ExaminerGrid({
  examiner1: examiner1,
  examiner2: examiner2,
}: ExaminerGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ExaminerCard label="Penguji 1" {...examiner1} />
      <ExaminerCard label="Penguji 2" {...examiner2} />
    </div>
  );
}
