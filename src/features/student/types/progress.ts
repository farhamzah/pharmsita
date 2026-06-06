export type StepId =
  | 'pendaftaran-ta'
  | 'bimbingan-pra-proposal'
  | 'sidang-proposal'
  | 'revisi-proposal'
  | 'bimbingan-pra-sidang'
  | 'sidang'
  | 'revisi-sidang';

export type StepStatus = 'pending' | 'active' | 'completed';

export interface StudentStep {
  id: StepId;
  order: number;
  label: string;
  description: string;
  status: StepStatus;
  isLocked: boolean;
}
