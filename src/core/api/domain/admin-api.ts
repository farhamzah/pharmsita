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

mockApiAdapter.register("GET", "/admin/users", () => listResponse(loadAdminAccounts()));
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
