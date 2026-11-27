import { describe, expect, it } from "vitest";
import { HealthSchema } from "./index.ts";

describe("HealthSchema", () => {
  it("CON-5: accepts an ok status with a service name", () => {
    expect(
      HealthSchema.safeParse({ status: "ok", service: "api" }).success,
    ).toBe(true);
  });

  it.each([
    { status: "degraded", service: "api" },
    { status: "ok", service: "" },
    { status: "ok" },
  ])("CON-6: rejects %j", (body) => {
    expect(HealthSchema.safeParse(body).success).toBe(false);
  });
});
