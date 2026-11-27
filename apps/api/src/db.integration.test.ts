import { startServices, type RunningServices } from "@repo/services";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPostgresDb } from "./db.ts";

describe("Postgres adapter", () => {
  let services: RunningServices | undefined;

  beforeAll(async () => {
    services = await startServices();
  });

  afterAll(async () => {
    await services?.stop();
  });

  it("DB-1: is reachable when Postgres is running", async () => {
    const db = createPostgresDb(services?.databaseUrl ?? "");

    const reachable = await db.isReachable();
    await db.close();

    expect(reachable).toBe(true);
  });

  it("DB-2: is not reachable, without throwing, when nothing listens", async () => {
    // Port 1 is reserved and never runs Postgres.
    const db = createPostgresDb("postgres://app:app@127.0.0.1:1/app");

    const reachable = await db.isReachable();
    await db.close();

    expect(reachable).toBe(false);
  });
});
