import fs from "node:fs";
import path from "node:path";
import { createDefaultDatabaseState } from "./default-state";
import { createDefaultStudentWorkflowState } from "./default-student-workflow-state";
import type { DatabaseAdapter, DatabaseState } from "./schema";
import type { UserRoleAssignment } from "../domain/types";
import { hashPassword } from "../security/password";

const cloneState = (state: DatabaseState): DatabaseState =>
  JSON.parse(JSON.stringify(state)) as DatabaseState;

const cloneWorkflow = (workflow: DatabaseState["studentWorkflow"]) =>
  JSON.parse(JSON.stringify(workflow)) as DatabaseState["studentWorkflow"];

const mergePermissionsByRole = (
  currentPermissions: Partial<DatabaseState["permissionsByRole"]> | undefined,
  defaultPermissions: DatabaseState["permissionsByRole"]
): DatabaseState["permissionsByRole"] => {
  const roles = Object.keys(defaultPermissions) as Array<
    keyof DatabaseState["permissionsByRole"]
  >;

  return roles.reduce((merged, role) => {
    merged[role] = Array.from(
      new Set([
        ...defaultPermissions[role],
        ...(currentPermissions?.[role] || []),
      ])
    );
    return merged;
  }, {} as DatabaseState["permissionsByRole"]);
};

const mergeUserRoles = (
  users: DatabaseState["users"],
  currentRoles: UserRoleAssignment[] | undefined,
  defaultRoles: UserRoleAssignment[]
) => {
  const roleByKey = new Map<string, UserRoleAssignment>();

  users.forEach((user) => {
    roleByKey.set(`${user.id}:${user.role}`, {
      userId: user.id,
      role: user.role,
      status: user.status,
      createdAt: "2026-06-06T00:00:00.000Z",
      createdBy: null,
    });
  });

  [...defaultRoles, ...(currentRoles || [])].forEach((assignment) => {
    roleByKey.set(`${assignment.userId}:${assignment.role}`, {
      ...assignment,
      status: assignment.status || "Aktif",
      createdAt: assignment.createdAt || "2026-06-06T00:00:00.000Z",
      createdBy: assignment.createdBy ?? null,
    });
  });

  return Array.from(roleByKey.values());
};

export class JsonFileDatabaseAdapter implements DatabaseAdapter {
  constructor(private readonly filePath: string) {}

  read() {
    this.ensureDatabaseFile();
    const raw = fs.readFileSync(this.filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return this.migrate(parsed);
  }

  write(nextState: DatabaseState) {
    this.ensureDatabaseDirectory();
    fs.writeFileSync(this.filePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
    return nextState;
  }

  update(mutator: (state: DatabaseState) => void) {
    const state = cloneState(this.read());
    mutator(state);
    return this.write(state);
  }

  private ensureDatabaseFile() {
    this.ensureDatabaseDirectory();

    if (!fs.existsSync(this.filePath)) {
      this.write(createDefaultDatabaseState());
    }
  }

  private ensureDatabaseDirectory() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  private migrate(state: Partial<DatabaseState>) {
    const defaults = createDefaultDatabaseState();
    const defaultStudentWorkflow = createDefaultStudentWorkflowState();
    const legacyWorkflow = {
      ...defaultStudentWorkflow,
      ...state.studentWorkflow,
      requirements: {
        ...defaultStudentWorkflow.requirements,
        ...state.studentWorkflow?.requirements,
        stages: state.studentWorkflow?.requirements?.stages || {},
      },
      guidance: {
        ...defaultStudentWorkflow.guidance,
        ...state.studentWorkflow?.guidance,
      },
      exams: {
        ...defaultStudentWorkflow.exams,
        ...state.studentWorkflow?.exams,
      },
      revisions: {
        ...defaultStudentWorkflow.revisions,
        ...state.studentWorkflow?.revisions,
      },
    };

    const currentStudentWorkflows = state.studentWorkflows || {};
    const migratedStudentWorkflows =
      Object.keys(currentStudentWorkflows).length > 0
        ? Object.fromEntries(
            Object.entries(currentStudentWorkflows).map(([studentId, workflow]) => [
              studentId,
              {
                ...legacyWorkflow,
                ...workflow,
                requirements: {
                  ...legacyWorkflow.requirements,
                  ...workflow.requirements,
                  stages: workflow.requirements?.stages || {},
                },
                guidance: {
                  ...legacyWorkflow.guidance,
                  ...workflow.guidance,
                },
                exams: {
                  ...legacyWorkflow.exams,
                  ...workflow.exams,
                },
                revisions: {
                  ...legacyWorkflow.revisions,
                  ...workflow.revisions,
                },
              },
            ])
          )
        : {
            usr_mhs_01: cloneWorkflow(legacyWorkflow),
            "1": cloneWorkflow(legacyWorkflow),
          };

    const usersById = new Map(defaults.users.map((user) => [user.id, user]));
    (state.users || []).forEach((user) => {
      usersById.set(user.id, user);
    });
    const migratedUsers = Array.from(usersById.values()).map((user) => ({
      ...user,
      passwordHash: user.passwordHash || hashPassword("demo"),
      passwordStatus: user.passwordStatus || "active",
      forceChangeOnLogin: user.forceChangeOnLogin ?? false,
      lastLoginAt: user.lastLoginAt ?? null,
      firstLoginCompletedAt: user.firstLoginCompletedAt ?? null,
      passwordChangedAt: user.passwordChangedAt ?? null,
    }));

    const migrated: DatabaseState = {
      ...defaults,
      ...state,
      schemaVersion: 9,
      users: migratedUsers,
      userRoles: mergeUserRoles(
        migratedUsers,
        state.userRoles as UserRoleAssignment[] | undefined,
        defaults.userRoles
      ),
      lecturerProfiles: {
        ...defaults.lecturerProfiles,
        ...(state.lecturerProfiles || {}),
      },
      finalProjectRegistrations: state.finalProjectRegistrations || [],
      guidanceRequests: state.guidanceRequests || [],
      guidanceMaterials: state.guidanceMaterials || [],
      refreshTokens: state.refreshTokens || [],
      auditLogs: state.auditLogs || [],
      auditExportAttempts: state.auditExportAttempts || [],
      permissionsByRole: mergePermissionsByRole(
        state.permissionsByRole,
        defaults.permissionsByRole
      ),
      masterData: {
        ...defaults.masterData,
        ...state.masterData,
      },
      studentWorkflows: migratedStudentWorkflows,
      studentWorkflow: legacyWorkflow,
    };

    if (JSON.stringify(state) !== JSON.stringify(migrated)) {
      this.write(migrated);
    }

    return migrated;
  }
}
