import { ApiErrorSchema, HealthSchema } from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import type { Accounts } from "./accounts.ts";
import { createApp } from "./app.ts";
import type { Db } from "./db.ts";

/** In-memory adapter for the Db seam. */
function fakeDb({ reachable }: { reachable: boolean }): Db {
  return {
    isReachable: () => Promise.resolve(reachable),
    close: () => Promise.resolve(),
  };
}

/** These tests never reach the user routes, so accounts must not be used. */
const unusedAccounts: Accounts = {
  register: () => Promise.reject(new Error("accounts is not used here")),
  logIn: () => Promise.reject(new Error("accounts is not used here")),
  authenticate: () => Promise.reject(new Error("accounts is not used here")),
  changePassword: () => Promise.reject(new Error("accounts is not used here")),
};

const app = () =>
  createApp({ db: fakeDb({ reachable: true }), accounts: unusedAccounts });

describe("api", () => {
  it("API-1: reports healthy on GET /health", async () => {
    const response = await app().request("/health");

    expect(response.status).toBe(200);
    expect(HealthSchema.parse(await response.json())).toEqual({
      status: "ok",
      app: "api",
    });
  });

  it("API-2: answers an unknown route with a not_found error", async () => {
    const response = await app().request("/nope");

    expect(response.status).toBe(404);
    expect(ApiErrorSchema.parse(await response.json()).code).toBe("not_found");
  });

  it("API-3: answers a crash with internal_error and hides the cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const crashing = app();
    crashing.get("/boom", () => {
      throw new Error("database password is hunter2");
    });

    const response = await crashing.request("/boom");
    const body = ApiErrorSchema.parse(await response.json());

    expect(response.status).toBe(500);
    expect(body.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });

  it("API-4: reports ready on GET /ready when the database answers", async () => {
    const response = await app().request("/ready");

    expect(response.status).toBe(200);
    expect(HealthSchema.parse(await response.json())).toEqual({
      status: "ok",
      app: "api",
    });
  });

  it("API-5: answers GET /ready with 503 not_ready when the database does not answer", async () => {
    const response = await createApp({
      db: fakeDb({ reachable: false }),
      accounts: unusedAccounts,
    }).request("/ready");

    expect(response.status).toBe(503);
    expect(ApiErrorSchema.parse(await response.json()).code).toBe("not_ready");
  });

  it("API-6: GET /health does not depend on the database", async () => {
    const response = await createApp({
      db: fakeDb({ reachable: false }),
      accounts: unusedAccounts,
    }).request("/health");

    expect(response.status).toBe(200);
  });
});
