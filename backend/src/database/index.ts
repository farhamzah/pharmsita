import { config } from "../config";
import { JsonFileDatabaseAdapter } from "./json-file-database-adapter";

export const createJsonDatabaseAdapter = () =>
  new JsonFileDatabaseAdapter(config.databaseFile);

export const databaseAdapter = createJsonDatabaseAdapter();
