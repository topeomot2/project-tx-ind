import { ApiErrorSchema, HealthSchema } from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";

describe("api", () => {
  it("reports healthy on GET /health", async () => {
    const response = await createApp().request("/health");

    expect(response.status).toBe(200);
    expect(HealthSchema.parse(await response.json())).toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("answers an unknown route with a not_found error", async () => {
    const response = await createApp().request("/nope");

    expect(response.status).toBe(404);
    expect(ApiErrorSchema.parse(await response.json()).code).toBe("not_found");
  });

  it("answers a crash with internal_error and hides the cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = createApp();
    app.get("/boom", () => {
      throw new Error("database password is hunter2");
    });

    const response = await app.request("/boom");
    const body = ApiErrorSchema.parse(await response.json());

    expect(response.status).toBe(500);
    expect(body.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });
});
