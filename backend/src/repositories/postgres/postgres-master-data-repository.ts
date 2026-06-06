import type {
  PostgresConnectionPool,
  PostgresTransactionClient,
} from "../../database/postgres/connection";
import type {
  AcademicPeriod,
  RequirementDefinition,
  SupportingDocument,
  ThesisType,
} from "../../domain/types";
import type { MasterDataRepository } from "../contracts";
import {
  toAcademicPeriod,
  toRequirementDefinition,
  toSupportingDocument,
  toThesisType,
  type AcademicPeriodRow,
  type RequirementDefinitionRow,
  type SupportingDocumentRow,
  type ThesisTypeRow,
} from "./row-mappers";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const academicPeriodColumns = `
  id,
  name,
  semester,
  start_date,
  end_date,
  status
`;

const thesisTypeColumns = `
  id,
  name,
  skema,
  description,
  status
`;

const supportingDocumentColumns = `
  id,
  name,
  description,
  allowed_types,
  is_required,
  status
`;

const requirementDefinitionColumns = `
  id,
  tahap,
  nama_persyaratan,
  deskripsi_aturan,
  wajib,
  status
`;

const toUuidOrNull = (value: string) => (uuidPattern.test(value) ? value : null);

export class PostgresMasterDataRepository implements MasterDataRepository {
  constructor(private readonly pool: PostgresConnectionPool) {}

  async listAcademicPeriods() {
    const result = await this.pool.query<AcademicPeriodRow>(`
      SELECT ${academicPeriodColumns}
      FROM academic_periods
      ORDER BY start_date DESC, name ASC, semester ASC
    `);

    return result.rows.map(toAcademicPeriod);
  }

  async replaceAcademicPeriods(records: AcademicPeriod[]) {
    return this.withTransaction(async (client) => {
      await this.deleteMissing(
        client,
        "academic_periods",
        records.map((record) => toUuidOrNull(record.id)).filter(Boolean)
      );

      for (const record of records) {
        await client.query(
          `
            INSERT INTO academic_periods (
              id,
              name,
              semester,
              start_date,
              end_date,
              status,
              updated_at
            )
            VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              name = EXCLUDED.name,
              semester = EXCLUDED.semester,
              start_date = EXCLUDED.start_date,
              end_date = EXCLUDED.end_date,
              status = EXCLUDED.status,
              updated_at = NOW()
          `,
          [
            toUuidOrNull(record.id),
            record.name,
            record.semester,
            record.startDate,
            record.endDate,
            record.status,
          ]
        );
      }

      return this.listAcademicPeriodsWith(client);
    });
  }

  async listThesisTypes() {
    const result = await this.pool.query<ThesisTypeRow>(`
      SELECT ${thesisTypeColumns}
      FROM thesis_types
      ORDER BY skema ASC, name ASC
    `);

    return result.rows.map(toThesisType);
  }

  async replaceThesisTypes(records: ThesisType[]) {
    return this.withTransaction(async (client) => {
      await this.deleteMissing(
        client,
        "thesis_types",
        records.map((record) => toUuidOrNull(record.id)).filter(Boolean)
      );

      for (const record of records) {
        await client.query(
          `
            INSERT INTO thesis_types (
              id,
              name,
              skema,
              description,
              status,
              updated_at
            )
            VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              name = EXCLUDED.name,
              skema = EXCLUDED.skema,
              description = EXCLUDED.description,
              status = EXCLUDED.status,
              updated_at = NOW()
          `,
          [
            toUuidOrNull(record.id),
            record.name,
            record.skema,
            record.desc || null,
            record.status,
          ]
        );
      }

      return this.listThesisTypesWith(client);
    });
  }

  async listSupportingDocuments() {
    const result = await this.pool.query<SupportingDocumentRow>(`
      SELECT ${supportingDocumentColumns}
      FROM supporting_documents
      ORDER BY name ASC
    `);

    return result.rows.map(toSupportingDocument);
  }

  async replaceSupportingDocuments(records: SupportingDocument[]) {
    return this.withTransaction(async (client) => {
      await this.deleteMissing(
        client,
        "supporting_documents",
        records.map((record) => toUuidOrNull(record.id)).filter(Boolean)
      );

      for (const record of records) {
        await client.query(
          `
            INSERT INTO supporting_documents (
              id,
              name,
              description,
              allowed_types,
              is_required,
              status,
              updated_at
            )
            VALUES (
              COALESCE($1::uuid, gen_random_uuid()),
              $2,
              $3,
              $4::jsonb,
              $5,
              $6,
              NOW()
            )
            ON CONFLICT (id) DO UPDATE
            SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              allowed_types = EXCLUDED.allowed_types,
              is_required = EXCLUDED.is_required,
              status = EXCLUDED.status,
              updated_at = NOW()
          `,
          [
            toUuidOrNull(record.id),
            record.name,
            record.description || null,
            JSON.stringify(record.allowedTypes),
            record.isRequired,
            record.status,
          ]
        );
      }

      return this.listSupportingDocumentsWith(client);
    });
  }

  async listRequirementDefinitions(filter?: { tahap?: string | null }) {
    const values: unknown[] = [];
    const where = filter?.tahap ? "WHERE tahap = $1" : "";

    if (filter?.tahap) {
      values.push(filter.tahap);
    }

    const result = await this.pool.query<RequirementDefinitionRow>(
      `
        SELECT ${requirementDefinitionColumns}
        FROM requirement_definitions
        ${where}
        ORDER BY tahap ASC, nama_persyaratan ASC
      `,
      values
    );

    return result.rows.map(toRequirementDefinition);
  }

  async replaceRequirementDefinitions(records: RequirementDefinition[]) {
    return this.withTransaction(async (client) => {
      await this.deleteMissing(
        client,
        "requirement_definitions",
        records.map((record) => toUuidOrNull(record.id)).filter(Boolean)
      );

      for (const record of records) {
        await client.query(
          `
            INSERT INTO requirement_definitions (
              id,
              tahap,
              nama_persyaratan,
              deskripsi_aturan,
              wajib,
              status,
              updated_at
            )
            VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              tahap = EXCLUDED.tahap,
              nama_persyaratan = EXCLUDED.nama_persyaratan,
              deskripsi_aturan = EXCLUDED.deskripsi_aturan,
              wajib = EXCLUDED.wajib,
              status = EXCLUDED.status,
              updated_at = NOW()
          `,
          [
            toUuidOrNull(record.id),
            record.tahap,
            record.namaPersyaratan,
            record.deskripsiAturan || null,
            record.wajib,
            record.status,
          ]
        );
      }

      return this.listRequirementDefinitionsWith(client);
    });
  }

  private async listAcademicPeriodsWith(client: PostgresTransactionClient) {
    const result = await client.query<AcademicPeriodRow>(`
      SELECT ${academicPeriodColumns}
      FROM academic_periods
      ORDER BY start_date DESC, name ASC, semester ASC
    `);

    return result.rows.map(toAcademicPeriod);
  }

  private async listThesisTypesWith(client: PostgresTransactionClient) {
    const result = await client.query<ThesisTypeRow>(`
      SELECT ${thesisTypeColumns}
      FROM thesis_types
      ORDER BY skema ASC, name ASC
    `);

    return result.rows.map(toThesisType);
  }

  private async listSupportingDocumentsWith(client: PostgresTransactionClient) {
    const result = await client.query<SupportingDocumentRow>(`
      SELECT ${supportingDocumentColumns}
      FROM supporting_documents
      ORDER BY name ASC
    `);

    return result.rows.map(toSupportingDocument);
  }

  private async listRequirementDefinitionsWith(client: PostgresTransactionClient) {
    const result = await client.query<RequirementDefinitionRow>(`
      SELECT ${requirementDefinitionColumns}
      FROM requirement_definitions
      ORDER BY tahap ASC, nama_persyaratan ASC
    `);

    return result.rows.map(toRequirementDefinition);
  }

  private async deleteMissing(
    client: PostgresTransactionClient,
    tableName: string,
    idsToKeep: (string | null)[]
  ) {
    await client.query(
      `
        DELETE FROM ${tableName}
        WHERE NOT (id = ANY($1::uuid[]))
      `,
      [idsToKeep.filter((id): id is string => Boolean(id))]
    );
  }

  private async withTransaction<T>(
    callback: (client: PostgresTransactionClient) => Promise<T>
  ) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
