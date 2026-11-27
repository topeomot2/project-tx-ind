import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.ts";

describe("parseEnv", () => {
  it("API-7: uses defaults that match compose.yaml when nothing is set", () => {
    expect(parseEnv({})).toEqual({
      PORT: 3000,
      DATABASE_URL: "postgres://app:app@localhost:5432/app",
    });
  });

  it("API-8: reads PORT and DATABASE_URL when set", () => {
    expect(
      parseEnv({ PORT: "8080", DATABASE_URL: "postgres://u:p@db:5432/x" }),
    ).toEqual({ PORT: 8080, DATABASE_URL: "postgres://u:p@db:5432/x" });
  });

  it.each([{ PORT: "zero" }, { PORT: "0" }, { DATABASE_URL: "not a url" }])(
    "API-9: rejects invalid settings %j",
    (source) => {
      expect(() => parseEnv(source)).toThrow();
    },
  );
});
