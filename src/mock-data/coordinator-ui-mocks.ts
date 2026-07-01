import type { SubmissionData, SupervisorQuota } from "../features/coordinator/types/coordinator";

export const academicStageMock: Array<{
  id: string;
  nim: string;
  name: string;
  stage: string;
  submitDate: string;
  status: string;
  note: string;
}> = [];

export const notificationMock: Array<{
  id: string;
  title: string;
  message: string;
  date: string;
  target: string;
}> = [];

export const schedulingMock: Array<{
  id: string;
  nim: string;
  name: string;
  title: string;
  stage: string;
  date: string | null;
  time: string | null;
  room: string | null;
  examiners: string[];
  status: string;
}> = [];

export interface CoordinatorStudent {
  id: string;
  name: string;
  nim: string;
  title: string;
  status: string;
  supervisor1?: string;
  supervisor2?: string;
}

export const submissionMockData: SubmissionData[] = [];
export const supervisorQuotaMock: SupervisorQuota[] = [];
