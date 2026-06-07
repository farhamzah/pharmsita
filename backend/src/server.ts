import { createServer } from "node:http";
import { config } from "./config";
import {
  assertProductionStartupReady,
  formatStartupGuardResult,
  StartupGuardError,
} from "./startup/production-startup-guard";

const checkProductionEnvOnly = process.argv.includes("--check-production-env");

const start = async () => {
  try {
    const startupGuard = assertProductionStartupReady();
    console.log(formatStartupGuardResult(startupGuard));

    if (checkProductionEnvOnly) {
      return;
    }

    const { createApp } = await import("./app");
    const { auditExportCleanupScheduler } = await import(
      "./schedulers/audit-export-cleanup-scheduler"
    );
    const app = createApp();

    const server = createServer((req, res) => {
      void app.handle(req, res);
    });

    server.listen(config.port, () => {
      console.log(
        `PharmSITA API listening on http://localhost:${config.port}${config.apiPrefix}`
      );
      auditExportCleanupScheduler.start();
    });

    const shutdown = () => {
      auditExportCleanupScheduler.stop();
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    if (error instanceof StartupGuardError) {
      console.error(formatStartupGuardResult(error.result));
      process.exit(1);
    }

    throw error;
  }
};

void start();
