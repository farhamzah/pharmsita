import type { DatabaseAdapter } from "../database/schema";
import type {
  AcademicPeriod,
  RequirementDefinition,
  SupportingDocument,
  ThesisType,
} from "../domain/types";
import type { MasterDataRepository } from "./contracts";

export class PersistentMasterDataRepository implements MasterDataRepository {
  constructor(private readonly database: DatabaseAdapter) {}

  listAcademicPeriods() {
    return this.database.read().masterData.academicPeriods;
  }

  replaceAcademicPeriods(records: AcademicPeriod[]) {
    return this.database.update((state) => {
      state.masterData.academicPeriods = records;
    }).masterData.academicPeriods;
  }

  listThesisTypes() {
    return this.database.read().masterData.thesisTypes;
  }

  replaceThesisTypes(records: ThesisType[]) {
    return this.database.update((state) => {
      state.masterData.thesisTypes = records;
    }).masterData.thesisTypes;
  }

  listSupportingDocuments() {
    return this.database.read().masterData.supportingDocuments;
  }

  replaceSupportingDocuments(records: SupportingDocument[]) {
    return this.database.update((state) => {
      state.masterData.supportingDocuments = records;
    }).masterData.supportingDocuments;
  }

  listRequirementDefinitions(filter?: { tahap?: string | null }) {
    const requirements = this.database.read().masterData.requirements;

    if (!filter?.tahap) {
      return requirements;
    }

    return requirements.filter((item) => item.tahap === filter.tahap);
  }

  replaceRequirementDefinitions(records: RequirementDefinition[]) {
    return this.database.update((state) => {
      state.masterData.requirements = records;
    }).masterData.requirements;
  }
}
