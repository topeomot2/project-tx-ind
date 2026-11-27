import { startServices, type RunningServices } from "@repo/services";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPostgresAccountStore,
  type PostgresAccountStore,
} from "./account-store.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("Postgres account store", () => {
  let services: RunningServices | undefined;
  let store: PostgresAccountStore;

  beforeAll(async () => {
    services = await startServices();
    store = createPostgresAccountStore(services.databaseUrl);
    await store.migrate();
  });

  afterAll(async () => {
    await store.close();
    await services?.stop();
  });

  it("STORE-1: migrate can run twice", async () => {
    await expect(store.migrate()).resolves.toBeUndefined();
  });

  it("STORE-2: a user that was inserted can be found by email and by id", async () => {
    const inserted = await store.insertUser({
      name: "Store Two",
      email: "store2@example.com",
      passwordHash: "h1",
    });
    const id = inserted === "email_taken" ? "" : inserted.id;

    const byEmail = await store.findUserByEmail("store2@example.com");
    const byId = await store.findUserById(id);

    expect(id).toMatch(uuid);
    const expected = {
      id,
      name: "Store Two",
      email: "store2@example.com",
      passwordHash: "h1",
      tokenVersion: 0,
    };
    expect(byEmail).toEqual(expected);
    expect(byId).toEqual(expected);
  });

  it("STORE-3: inserting an email twice says email_taken", async () => {
    const user = {
      name: "Store Three",
      email: "store3@example.com",
      passwordHash: "h1",
    };
    await store.insertUser(user);

    const second = await store.insertUser(user);

    expect(second).toBe("email_taken");
  });

  it("STORE-4: unknown users are not found", async () => {
    const byEmail = await store.findUserByEmail("nobody@example.com");
    const byId = await store.findUserById(randomUUID());

    expect(byEmail).toBeUndefined();
    expect(byId).toBeUndefined();
  });

  it("STORE-5: a new password hash replaces the old one and bumps the token version", async () => {
    const inserted = await store.insertUser({
      name: "Store Five",
      email: "store5@example.com",
      passwordHash: "h1",
    });
    const id = inserted === "email_taken" ? "" : inserted.id;

    const updated = await store.setPasswordHash(id, "h2");
    const found = await store.findUserById(id);

    expect(updated).toMatchObject({ passwordHash: "h2", tokenVersion: 1 });
    expect(found).toMatchObject({ passwordHash: "h2", tokenVersion: 1 });
  });
});
