import { describe, expect, it } from "vitest";
import { HealthSchema } from "./index.ts";

describe("HealthSchema", () => {
  it("CON-5: accepts an ok status with an app name", () => {
    expect(HealthSchema.safeParse({ status: "ok", app: "api" }).success).toBe(
      true,
    );
  });

  it.each([
    { status: "degraded", app: "api" },
    { status: "ok", app: "" },
    { status: "ok" },
  ])("CON-6: rejects %j", (body) => {
    expect(HealthSchema.safeParse(body).success).toBe(false);
  });
});
