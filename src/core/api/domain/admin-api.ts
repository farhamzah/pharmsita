import {
  loadAcademicPeriods,
  loadAdminAccounts,
  loadJenisTAList,
  loadRequirementDefinitions,
  loadSupportingDocuments,
  saveAcademicPeriods,
  saveAdminAccounts,
  saveJenisTAList,
  saveRequirementDefinitions,
  saveSupportingDocuments,
  type AdminAccount,
  type AdminMasterRecord,
} from "../../services/admin-data-service";
import { apiClient, mockApiAdapter } from "../api-client";

export interface ListResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const listResponse = <T>(data: T[]): ListResponse<T> => ({
  data,
  meta: {
    page: 1,
    limit: data.length || 20,
    total: data.length,
    totalPages: 1,
  },
});

const itemResponse = <T>(data: T) => ({ data });

mockApiAdapter.register("GET", "/admin/users", () => listResponse(loadAdminAccounts()));
mockApiAdapter.register<AdminAccount>("POST", "/admin/users", ({ body }) => {
  const current = loadAdminAccounts();
  const record = {
    ...(body || {}),
    id: body?.id || `acc_${Date.now()}`,
    status: body?.status || "Aktif",
    passwordStatus: "needs_activation",
    forceChangeOnLogin: true,
    firstLoginCompletedAt: null,
    passwordChangedAt: null,
  };
  saveAdminAccounts([record, ...current]);
  return itemResponse(record);
});
mockApiAdapter.register<Partial<AdminAccount>>("PATCH", "/admin/users/:userId", ({ body, params }) => {
  let updated: AdminAccount | null = null;
  const next = loadAdminAccounts().map((account) => {
    if (account.id !== params.userId) return account;
    updated = {
      ...account,
      ...(body || {}),
      ...(body?.password
        ? {
            passwordStatus: "needs_activation",
            forceChangeOnLogin: true,
            firstLoginCompletedAt: null,
            passwordChangedAt: null,
          }
        : {}),
    };
    return updated;
  });
  saveAdminAccounts(next);
  return itemResponse(updated || next.find((account) => account.id === params.userId) || null);
});
mockApiAdapter.register<{ status: AdminAccount["status"] }>(
  "PATCH",
  "/admin/users/:userId/status",
  ({ body, params }) => {
    let updated: AdminAccount | null = null;
    const next = loadAdminAccounts().map((account) => {
      if (account.id !== params.userId) return account;
      updated = {
        ...account,
        status: body?.status || account.status,
      };
      return updated;
    });
    saveAdminAccounts(next);
    return itemResponse(updated || next.find((account) => account.id === params.userId) || null);
  }
);
mockApiAdapter.register<{ password: string }>(
  "POST",
  "/admin/users/:userId/reset-password",
  ({ params }) => {
    let updated: AdminAccount | null = null;
    const next = loadAdminAccounts().map((account) => {
      if (account.id !== params.userId) return account;
      updated = {
        ...account,
        passwordStatus: "needs_activation",
        forceChangeOnLogin: true,
        firstLoginCompletedAt: null,
        passwordChangedAt: null,
        passwordUpdatedAt: new Date().toISOString(),
      };
      return updated;
    });
    saveAdminAccounts(next);
    return itemResponse(updated || next.find((account) => account.id === params.userId) || null);
  }
);
mockApiAdapter.register("GET", "/master/lecturers", () =>
  listResponse(
    loadAdminAccounts().filter(
      (account) =>
        String(account.role || "").toLowerCase() === "dosen" &&
        account.status === "Aktif"
    )
  )
);
mockApiAdapter.register<AdminAccount[]>("PUT", "/admin/users", ({ body }) =>
  listResponse(saveAdminAccounts(body || []))
);

mockApiAdapter.register("GET", "/admin/master/academic-periods", () =>
  listResponse(loadAcademicPeriods())
);
mockApiAdapter.register<AdminMasterRecord[]>("PUT", "/admin/master/academic-periods", ({ body }) =>
  listResponse(saveAcademicPeriods(body || []))
);

mockApiAdapter.register("GET", "/admin/master/thesis-types", () =>
  listResponse(loadJenisTAList())
);
mockApiAdapter.register("GET", "/master/thesis-types", () =>
  listResponse(loadJenisTAList())
);
mockApiAdapter.register<AdminMasterRecord[]>("PUT", "/admin/master/thesis-types", ({ body }) =>
  listResponse(saveJenisTAList(body || []))
);

mockApiAdapter.register("GET", "/admin/master/supporting-documents", () =>
  listResponse(loadSupportingDocuments())
);
mockApiAdapter.register<AdminMasterRecord[]>("PUT", "/admin/master/supporting-documents", ({ body }) =>
  listResponse(saveSupportingDocuments(body || []))
);

mockApiAdapter.register("GET", "/admin/master/requirements", () =>
  listResponse(loadRequirementDefinitions())
);
mockApiAdapter.register<AdminMasterRecord[]>("PUT", "/admin/master/requirements", ({ body }) =>
  listResponse(saveRequirementDefinitions(body || []))
);

export const adminApi = {
  listUsers() {
    return apiClient.get<ListResponse<AdminAccount>>("/admin/users");
  },
  createUser(account: AdminAccount) {
    return apiClient.post<{ data: AdminAccount }, AdminAccount>("/admin/users", account);
  },
  updateUser(userId: string, account: Partial<AdminAccount>) {
    return apiClient.patch<{ data: AdminAccount }, Partial<AdminAccount>>(
      `/admin/users/${encodeURIComponent(userId)}`,
      account
    );
  },
  updateUserStatus(userId: string, status: AdminAccount["status"]) {
    return apiClient.patch<{ data: AdminAccount }, { status: AdminAccount["status"] }>(
      `/admin/users/${encodeURIComponent(userId)}/status`,
      { status }
    );
  },
  resetUserPassword(userId: string, password: string) {
    return apiClient.post<{ data: AdminAccount }, { password: string }>(
      `/admin/users/${encodeURIComponent(userId)}/reset-password`,
      { password }
    );
  },
  listPublicLecturers() {
    return apiClient.get<ListResponse<AdminAccount>>("/master/lecturers");
  },
  replaceUsers(accounts: AdminAccount[]) {
    return apiClient.put<ListResponse<AdminAccount>, AdminAccount[]>("/admin/users", accounts);
  },
  listAcademicPeriods() {
    return apiClient.get<ListResponse<AdminMasterRecord>>("/admin/master/academic-periods");
  },
  replaceAcademicPeriods(periods: AdminMasterRecord[]) {
    return apiClient.put<ListResponse<AdminMasterRecord>, AdminMasterRecord[]>(
      "/admin/master/academic-periods",
      periods
    );
  },
  listThesisTypes() {
    return apiClient.get<ListResponse<AdminMasterRecord>>("/admin/master/thesis-types");
  },
  listPublicThesisTypes() {
    return apiClient.get<ListResponse<AdminMasterRecord>>("/master/thesis-types");
  },
  replaceThesisTypes(items: AdminMasterRecord[]) {
    return apiClient.put<ListResponse<AdminMasterRecord>, AdminMasterRecord[]>(
      "/admin/master/thesis-types",
      items
    );
  },
  listSupportingDocuments() {
    return apiClient.get<ListResponse<AdminMasterRecord>>("/admin/master/supporting-documents");
  },
  replaceSupportingDocuments(documents: AdminMasterRecord[]) {
    return apiClient.put<ListResponse<AdminMasterRecord>, AdminMasterRecord[]>(
      "/admin/master/supporting-documents",
      documents
    );
  },
  listRequirementDefinitions() {
    return apiClient.get<ListResponse<AdminMasterRecord>>("/admin/master/requirements");
  },
  replaceRequirementDefinitions(requirements: AdminMasterRecord[]) {
    return apiClient.put<ListResponse<AdminMasterRecord>, AdminMasterRecord[]>(
      "/admin/master/requirements",
      requirements
    );
  },
};
