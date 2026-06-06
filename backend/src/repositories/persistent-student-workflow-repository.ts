import type { DatabaseAdapter, DatabaseState } from "../database/schema";
import { createDefaultStudentWorkflowState } from "../database/default-student-workflow-state";
import type {
  ExamStage,
  ExamWorkflow,
  GuidanceStage,
  GuidanceWorkflow,
  RequirementBundle,
  RevisionStage,
  RevisionWorkflow,
  StepId,
  StepStatus,
  StudentStep,
  ThesisSubmission,
} from "../domain/types";
import type { StudentWorkflowRepository } from "./contracts";

const withLockState = (steps: Omit<StudentStep, "isLocked">[]): StudentStep[] =>
  steps.map((step, index) => ({
    ...step,
    isLocked: steps.slice(0, index).some((previous) => previous.status !== "completed"),
  }));

export class PersistentStudentWorkflowRepository implements StudentWorkflowRepository {
  constructor(private readonly database: DatabaseAdapter) {}

  private getWorkflow(studentId: string) {
    const state = this.database.read();
    return state.studentWorkflows[studentId] || createDefaultStudentWorkflowState();
  }

  private ensureWorkflow(state: DatabaseState, studentId: string) {
    state.studentWorkflows[studentId] ||= createDefaultStudentWorkflowState();
    return state.studentWorkflows[studentId];
  }

  getProgressSteps(studentId: string) {
    return withLockState(this.getWorkflow(studentId).progressSteps);
  }

  updateProgressStep(studentId: string, stepId: StepId, status: StepStatus) {
    return withLockState(
      this.database.update((state) => {
        const steps = this.ensureWorkflow(state, studentId).progressSteps;
        const targetIndex = steps.findIndex((step) => step.id === stepId);

        if (targetIndex === -1) {
          return;
        }

        steps[targetIndex].status = status;

        if (status === "completed" && targetIndex + 1 < steps.length) {
          if (steps[targetIndex + 1].status === "pending") {
            steps[targetIndex + 1].status = "active";
          }
        }

        if (status === "active") {
          for (let i = 0; i < targetIndex; i += 1) {
            steps[i].status = "completed";
          }
        }
      }).studentWorkflows[studentId].progressSteps
    );
  }

  resetProgressSteps(studentId: string) {
    return withLockState(
      this.database.update((state) => {
        this.ensureWorkflow(state, studentId).progressSteps =
          createDefaultStudentWorkflowState().progressSteps;
      }).studentWorkflows[studentId].progressSteps
    );
  }

  getInitialRequirements(studentId: string) {
    return this.getWorkflow(studentId).requirements.initial;
  }

  saveInitialRequirements(studentId: string, bundle: RequirementBundle) {
    return this.database.update((state) => {
      this.ensureWorkflow(state, studentId).requirements.initial = bundle;
    }).studentWorkflows[studentId].requirements.initial;
  }

  getStageRequirements(studentId: string, stageId: string) {
    const requirements = this.getWorkflow(studentId).requirements;
    return requirements.stages[stageId] || { driveLink: "", requirements: [] };
  }

  saveStageRequirements(studentId: string, stageId: string, bundle: RequirementBundle) {
    return this.database.update((state) => {
      this.ensureWorkflow(state, studentId).requirements.stages[stageId] = bundle;
    }).studentWorkflows[studentId].requirements.stages[stageId];
  }

  listThesisSubmissions(studentId: string) {
    return this.getWorkflow(studentId).thesisSubmissions;
  }

  replaceThesisSubmissions(studentId: string, submissions: ThesisSubmission[]) {
    return this.database.update((state) => {
      this.ensureWorkflow(state, studentId).thesisSubmissions = submissions;
    }).studentWorkflows[studentId].thesisSubmissions;
  }

  getGuidance(studentId: string, stageId: GuidanceStage) {
    return this.getWorkflow(studentId).guidance[stageId];
  }

  updateGuidance(studentId: string, stageId: GuidanceStage, mutator: (workflow: GuidanceWorkflow) => void) {
    return this.database.update((state) => {
      mutator(this.ensureWorkflow(state, studentId).guidance[stageId]);
    }).studentWorkflows[studentId].guidance[stageId];
  }

  resetGuidance(studentId: string, stageId: GuidanceStage) {
    return this.database.update((state) => {
      this.ensureWorkflow(state, studentId).guidance[stageId] =
        createDefaultStudentWorkflowState().guidance[stageId];
    }).studentWorkflows[studentId].guidance[stageId];
  }

  getExam(studentId: string, stageId: ExamStage) {
    return this.getWorkflow(studentId).exams[stageId];
  }

  updateExam(studentId: string, stageId: ExamStage, mutator: (workflow: ExamWorkflow) => void) {
    return this.database.update((state) => {
      mutator(this.ensureWorkflow(state, studentId).exams[stageId]);
    }).studentWorkflows[studentId].exams[stageId];
  }

  resetExam(studentId: string, stageId: ExamStage) {
    return this.database.update((state) => {
      this.ensureWorkflow(state, studentId).exams[stageId] =
        createDefaultStudentWorkflowState().exams[stageId];
    }).studentWorkflows[studentId].exams[stageId];
  }

  getRevision(studentId: string, stageId: RevisionStage) {
    return this.getWorkflow(studentId).revisions[stageId];
  }

  updateRevision(studentId: string, stageId: RevisionStage, mutator: (workflow: RevisionWorkflow) => void) {
    return this.database.update((state) => {
      mutator(this.ensureWorkflow(state, studentId).revisions[stageId]);
    }).studentWorkflows[studentId].revisions[stageId];
  }

  resetRevision(studentId: string, stageId: RevisionStage) {
    return this.database.update((state) => {
      this.ensureWorkflow(state, studentId).revisions[stageId] =
        createDefaultStudentWorkflowState().revisions[stageId];
    }).studentWorkflows[studentId].revisions[stageId];
  }
}
