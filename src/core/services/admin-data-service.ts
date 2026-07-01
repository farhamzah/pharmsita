import { storageService } from "./storage-service";

export const ADMIN_STORAGE_KEYS = {
  accounts: "pharmsita_accounts",
  academicPeriods: "pharmsita_periods",
  jenisTA: "pharmsita_jenis_ta",
  documents: "pharmsita_documents",
  requirements: "pharmsita_master_requirements",
} as const;

export type AdminAccount = Record<string, any>;
export type AdminMasterRecord = Record<string, any>;

export const initialSupportingDocuments: AdminMasterRecord[] = [];

export const sanitizeAdminAccount = (account: AdminAccount): AdminAccount => {
  const { password, ...safeAccount } = account;
  return safeAccount;
};

export const sanitizeAdminAccounts = (accounts: AdminAccount[] = []) =>
  accounts.map(sanitizeAdminAccount);

const loadList = <T>(key: string, fallback: T[]): T[] => {
  const saved = storageService.get<T[]>(key);
  if (Array.isArray(saved)) return saved;

  storageService.set(key, fallback);
  return fallback;
};

const buildInitialAccounts = (): AdminAccount[] => [];

export const loadAdminAccounts = (): AdminAccount[] => {
  const saved = storageService.get<AdminAccount[]>(ADMIN_STORAGE_KEYS.accounts);
  if (Array.isArray(saved)) {
    const sanitized = sanitizeAdminAccounts(saved);
    storageService.set(ADMIN_STORAGE_KEYS.accounts, sanitized);
    return sanitized;
  }

  const initial = buildInitialAccounts();
  storageService.set(ADMIN_STORAGE_KEYS.accounts, initial);
  return initial;
};

export const saveAdminAccounts = (accounts: AdminAccount[]) => {
  const sanitized = sanitizeAdminAccounts(accounts);
  storageService.set(ADMIN_STORAGE_KEYS.accounts, sanitized);
  return sanitized;
};

export const loadAcademicPeriods = () =>
  loadList(ADMIN_STORAGE_KEYS.academicPeriods, []);

export const saveAcademicPeriods = (periods: AdminMasterRecord[]) => {
  storageService.set(ADMIN_STORAGE_KEYS.academicPeriods, periods);
  return periods;
};

export const loadJenisTAList = () =>
  loadList(ADMIN_STORAGE_KEYS.jenisTA, []);

export const saveJenisTAList = (items: AdminMasterRecord[]) => {
  storageService.set(ADMIN_STORAGE_KEYS.jenisTA, items);
  return items;
};

export const loadSupportingDocuments = () =>
  loadList(ADMIN_STORAGE_KEYS.documents, initialSupportingDocuments);

export const saveSupportingDocuments = (documents: AdminMasterRecord[]) => {
  storageService.set(ADMIN_STORAGE_KEYS.documents, documents);
  return documents;
};

export const loadRequirementDefinitions = () => {
  const saved = storageService.get<AdminMasterRecord[]>(ADMIN_STORAGE_KEYS.requirements);
  if (Array.isArray(saved)) return saved;

  storageService.set(ADMIN_STORAGE_KEYS.requirements, []);
  return [];
};

export const saveRequirementDefinitions = (requirements: AdminMasterRecord[]) => {
  storageService.set(ADMIN_STORAGE_KEYS.requirements, requirements);
  return requirements;
};

export const adminDataService = {
  loadAccounts: loadAdminAccounts,
  saveAccounts: saveAdminAccounts,
  loadAcademicPeriods,
  saveAcademicPeriods,
  loadJenisTAList,
  saveJenisTAList,
  loadSupportingDocuments,
  saveSupportingDocuments,
  loadRequirementDefinitions,
  saveRequirementDefinitions,
};
