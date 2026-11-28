// Starts the services, runs Playwright against them, then removes them.
// Extra arguments go to Playwright: pnpm test:e2e -- --grep HEALTH
import { spawn } from "node:child_process";
import { startServices } from "@repo/services";

const services = await startServices();

const playwright = spawn("playwright", ["test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: services.databaseUrl,
    SMTP_URL: services.smtpUrl,
    MAILPIT_URL: services.mailpitUrl,
    // Test-only signing key; the api needs one to start (API-10).
    JWT_SECRET:
      process.env["JWT_SECRET"] ?? "e2e-only-secret-not-for-production-use",
  },
});

const exitCode = await new Promise<number>((resolve) => {
  playwright.on("exit", (code) => {
    resolve(code ?? 1);
  });
});

await services.stop();
process.exitCode = exitCode;
