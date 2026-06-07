import { config } from "../config";
import { createJsonDatabaseAdapter } from "../database";
import { getPostgresPool } from "../database/postgres/connection";
import { PersistentAuditLogRepository } from "./persistent-audit-log-repository";
import { PersistentFinalProjectRegistrationRepository } from "./persistent-final-project-registration-repository";
import { PersistentGuidanceRequestRepository } from "./persistent-guidance-request-repository";
import { PersistentMasterDataRepository } from "./persistent-master-data-repository";
import { PersistentRefreshTokenRepository } from "./persistent-refresh-token-repository";
import { PersistentStudentWorkflowRepository } from "./persistent-student-workflow-repository";
import { PersistentUserRepository } from "./persistent-user-repository";
import { createPostgresRepositories } from "./postgres";
import type { RepositoryRegistry } from "./contracts";

const createJsonRepositories = (): RepositoryRegistry => {
  const databaseAdapter = createJsonDatabaseAdapter();

  return {
    userRepository: new PersistentUserRepository(databaseAdapter),
    masterDataRepository: new PersistentMasterDataRepository(databaseAdapter),
    refreshTokenRepository: new PersistentRefreshTokenRepository(databaseAdapter),
    auditLogRepository: new PersistentAuditLogRepository(databaseAdapter),
    studentWorkflowRepository: new PersistentStudentWorkflowRepository(databaseAdapter),
    finalProjectRegistrationRepository: new PersistentFinalProjectRegistrationRepository(databaseAdapter),
    guidanceRequestRepository: new PersistentGuidanceRequestRepository(databaseAdapter),
  };
};

const repositories =
  config.databaseAdapter === "postgres"
    ? createPostgresRepositories(getPostgresPool())
    : createJsonRepositories();

export const repositoryMode = config.databaseAdapter;
export const userRepository = repositories.userRepository;
export const masterDataRepository = repositories.masterDataRepository;
export const refreshTokenRepository = repositories.refreshTokenRepository;
export const auditLogRepository = repositories.auditLogRepository;
export const studentWorkflowRepository = repositories.studentWorkflowRepository;
export const finalProjectRegistrationRepository =
  repositories.finalProjectRegistrationRepository;
export const guidanceRequestRepository = repositories.guidanceRequestRepository;
