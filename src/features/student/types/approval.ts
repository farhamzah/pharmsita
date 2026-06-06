export type ApprovalStatus = "fulfilled" | 'pending';

export interface ApprovalItem {
  label: string;
  status: ApprovalStatus;
  highlight?: boolean;
}
