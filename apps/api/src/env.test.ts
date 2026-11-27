import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.ts";

const JWT_SECRET = "a-test-secret-of-at-least-32-chars";

describe("parseEnv", () => {
  it("API-7: uses defaults that match compose.yaml when nothing else is set", () => {
    expect(parseEnv({ JWT_SECRET })).toEqual({
      PORT: 3000,
      DATABASE_URL: "postgres://app:app@localhost:5432/app",
      JWT_SECRET,
    });
  });

  it("API-8: reads PORT and DATABASE_URL when set", () => {
    expect(
      parseEnv({
        PORT: "8080",
        DATABASE_URL: "postgres://u:p@db:5432/x",
        JWT_SECRET,
      }),
    ).toEqual({
      PORT: 8080,
      DATABASE_URL: "postgres://u:p@db:5432/x",
      JWT_SECRET,
    });
  });

  it.each([{ PORT: "zero" }, { PORT: "0" }, { DATABASE_URL: "not a url" }])(
    "API-9: rejects invalid settings %j",
    (source) => {
      expect(() => parseEnv({ ...source, JWT_SECRET })).toThrow();
    },
  );

  it.each([{}, { JWT_SECRET: "x".repeat(31) }])(
    "API-10: rejects a missing or short JWT_SECRET %j",
    (source) => {
      expect(() => parseEnv(source)).toThrow();
    },
  );

  it("API-10: accepts a JWT_SECRET of 32 characters", () => {
    const secret = "x".repeat(32);

    expect(parseEnv({ JWT_SECRET: secret })).toMatchObject({
      JWT_SECRET: secret,
    });
  });
});
