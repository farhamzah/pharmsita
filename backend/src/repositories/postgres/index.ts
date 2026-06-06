import type { PostgresConnectionPool } from "../../database/postgres/connection";
import type { RepositoryRegistry } from "../contracts";
import { PostgresAuditLogRepository } from "./postgres-audit-log-repository";
import { PostgresFinalProjectRegistrationRepository } from "./postgres-final-project-registration-repository";
import { PostgresMasterDataRepository } from "./postgres-master-data-repository";
import { PostgresRefreshTokenRepository } from "./postgres-refresh-token-repository";
import { PostgresStudentWorkflowRepository } from "./postgres-student-workflow-repository";
import { PostgresUserRepository } from "./postgres-user-repository";

export const createPostgresRepositories = (
  pool: PostgresConnectionPool
): RepositoryRegistry => {
  return {
    userRepository: new PostgresUserRepository(pool),
    refreshTokenRepository: new PostgresRefreshTokenRepository(pool),
    auditLogRepository: new PostgresAuditLogRepository(pool),
    masterDataRepository: new PostgresMasterDataRepository(pool),
    studentWorkflowRepository: new PostgresStudentWorkflowRepository(pool),
    finalProjectRegistrationRepository:
      new PostgresFinalProjectRegistrationRepository(pool),
  };
};
