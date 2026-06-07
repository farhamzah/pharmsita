import type {
  FinalProjectRegistrationRepository,
  StudentWorkflowRepository,
} from "../contracts";

const notImplemented = (area: string): never => {
  throw new Error(`${area} PostgreSQL repository is not implemented yet.`);
};

export class UnsupportedPostgresStudentWorkflowRepository implements StudentWorkflowRepository {
  getProgressSteps() {
    return notImplemented("Student workflow");
  }

  updateProgressStep() {
    return notImplemented("Student workflow");
  }

  resetProgressSteps() {
    return notImplemented("Student workflow");
  }

  getInitialRequirements() {
    return notImplemented("Student workflow");
  }

  saveInitialRequirements() {
    return notImplemented("Student workflow");
  }

  getStageRequirements() {
    return notImplemented("Student workflow");
  }

  saveStageRequirements() {
    return notImplemented("Student workflow");
  }

  listThesisSubmissions() {
    return notImplemented("Student workflow");
  }

  replaceThesisSubmissions() {
    return notImplemented("Student workflow");
  }

  getGuidance() {
    return notImplemented("Student workflow");
  }

  updateGuidance() {
    return notImplemented("Student workflow");
  }

  resetGuidance() {
    return notImplemented("Student workflow");
  }

  getExam() {
    return notImplemented("Student workflow");
  }

  updateExam() {
    return notImplemented("Student workflow");
  }

  resetExam() {
    return notImplemented("Student workflow");
  }

  getRevision() {
    return notImplemented("Student workflow");
  }

  updateRevision() {
    return notImplemented("Student workflow");
  }

  resetRevision() {
    return notImplemented("Student workflow");
  }
}

export class UnsupportedPostgresFinalProjectRegistrationRepository
  implements FinalProjectRegistrationRepository
{
  getActiveByStudentId() {
    return notImplemented("Final project registration");
  }

  findById() {
    return notImplemented("Final project registration");
  }

  list() {
    return notImplemented("Final project registration");
  }

  saveStudentRegistration() {
    return notImplemented("Final project registration");
  }

  validateRegistration() {
    return notImplemented("Final project registration");
  }

  replaceSupervisorAssignmentsByStudentId() {
    return notImplemented("Final project registration");
  }
}
