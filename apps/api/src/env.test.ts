import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.ts";

const JWT_SECRET = "a-test-secret-of-at-least-32-chars";

/** The web and mail defaults (API-11). */
const webAndMailDefaults = {
  WEB_URL: "http://localhost:5173",
  WEB_ORIGINS: ["http://localhost:5173"],
  SMTP_URL: "smtp://localhost:1025",
  MAIL_FROM: "no-reply@localhost",
};

describe("parseEnv", () => {
  it("API-7: uses defaults that match compose.yaml when nothing else is set", () => {
    expect(parseEnv({ JWT_SECRET })).toEqual({
      PORT: 3000,
      DATABASE_URL: "postgres://app:app@localhost:5432/app",
      JWT_SECRET,
      ...webAndMailDefaults,
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
      ...webAndMailDefaults,
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

  it("API-11: uses the web and mail defaults when they are not set", () => {
    expect(parseEnv({ JWT_SECRET })).toMatchObject(webAndMailDefaults);
  });

  it("API-11: reads the web and mail settings when set", () => {
    expect(
      parseEnv({
        JWT_SECRET,
        WEB_URL: "https://app.example.com",
        WEB_ORIGINS: "https://app.example.com, https://admin.example.com",
        SMTP_URL: "smtps://u:p@smtp.example.com:465",
        MAIL_FROM: "hello@example.com",
      }),
    ).toMatchObject({
      WEB_URL: "https://app.example.com",
      WEB_ORIGINS: ["https://app.example.com", "https://admin.example.com"],
      SMTP_URL: "smtps://u:p@smtp.example.com:465",
      MAIL_FROM: "hello@example.com",
    });
  });

  it.each([
    { WEB_URL: "app" },
    { WEB_ORIGINS: "not a url" },
    { MAIL_FROM: "nobody" },
  ])("API-12: rejects bad web and mail settings %j", (source) => {
    expect(() => parseEnv({ ...source, JWT_SECRET })).toThrow();
  });
});
