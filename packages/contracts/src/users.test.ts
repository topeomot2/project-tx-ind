import { describe, expect, it } from "vitest";
import {
  ChangePasswordRequestSchema,
  LogInRequestSchema,
  RegisterRequestSchema,
  SessionSchema,
  UserSchema,
} from "./index.ts";

const register = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "correct horse battery",
};

/** A well-formed HS256 JWT (header, payload, signature), from jwt.io. */
const jwt =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("RegisterRequestSchema", () => {
  it("UCON-1: accepts a name, an email and a password that follows the rules", () => {
    expect(RegisterRequestSchema.safeParse(register).success).toBe(true);
  });

  it.each(["ada", "ada@", "@example.com", ""])(
    "UCON-2: rejects the email %j",
    (email) => {
      const result = RegisterRequestSchema.safeParse({ ...register, email });

      expect(result.success).toBe(false);
    },
  );

  it.each([
    { length: 14, valid: false },
    { length: 15, valid: true },
    { length: 128, valid: true },
    { length: 129, valid: false },
  ])(
    "UCON-3: a password of $length characters is valid: $valid",
    ({ length, valid }) => {
      const password = "p".repeat(length);

      const result = RegisterRequestSchema.safeParse({ ...register, password });

      expect(result.success).toBe(valid);
    },
  );

  it.each(["name", "email", "password"] as const)(
    "UCON-4: rejects a body without %s",
    (field) => {
      const body: Record<string, string> = { ...register };
      delete body[field];

      expect(RegisterRequestSchema.safeParse(body).success).toBe(false);
    },
  );

  it("UCON-10: trims the name", () => {
    const result = RegisterRequestSchema.parse({
      ...register,
      name: "  Ada Lovelace  ",
    });

    expect(result.name).toBe("Ada Lovelace");
  });

  it.each([
    { name: "", valid: false },
    { name: "   ", valid: false },
    { name: "a".repeat(100), valid: true },
    { name: "a".repeat(101), valid: false },
  ])("UCON-10: the name $name is valid: $valid", ({ name, valid }) => {
    const result = RegisterRequestSchema.safeParse({ ...register, name });

    expect(result.success).toBe(valid);
  });

  it.each([
    { count: 14, valid: false },
    { count: 15, valid: true },
    { count: 128, valid: true },
    { count: 129, valid: false },
  ])(
    "UCON-11: a password of $count key emoji is valid: $valid",
    ({ count, valid }) => {
      const password = "🔑".repeat(count);

      const result = RegisterRequestSchema.safeParse({ ...register, password });

      expect(result.success).toBe(valid);
    },
  );
});

describe("UserSchema", () => {
  const user = {
    id: "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f",
    name: "Ada Lovelace",
    email: "ada@example.com",
  };

  it("UCON-5: accepts an id, a name and an email", () => {
    expect(UserSchema.safeParse(user).success).toBe(true);
  });

  it("UCON-5: rejects a user with a password hash", () => {
    const result = UserSchema.safeParse({ ...user, passwordHash: "x" });

    expect(result.success).toBe(false);
  });
});

describe("LogInRequestSchema", () => {
  it("UCON-6: accepts a short password", () => {
    const result = LogInRequestSchema.safeParse({
      email: "ada@example.com",
      password: "short",
    });

    expect(result.success).toBe(true);
  });

  it("UCON-6: rejects an empty password", () => {
    const result = LogInRequestSchema.safeParse({
      email: "ada@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("SessionSchema", () => {
  const session = { token: jwt, expiresAt: "2026-11-28T12:00:00.000Z" };

  it("UCON-7: accepts a JWT and an ISO time", () => {
    expect(SessionSchema.safeParse(session).success).toBe(true);
  });

  it.each([
    { ...session, token: "not-a-jwt" },
    { ...session, expiresAt: "tomorrow" },
  ])("UCON-7: rejects %j", (body) => {
    expect(SessionSchema.safeParse(body).success).toBe(false);
  });
});

describe("ChangePasswordRequestSchema", () => {
  it("UCON-8: accepts a short current password", () => {
    const result = ChangePasswordRequestSchema.safeParse({
      currentPassword: "short",
      newPassword: "p".repeat(15),
    });

    expect(result.success).toBe(true);
  });

  it("UCON-8: rejects a new password that breaks the rules", () => {
    const result = ChangePasswordRequestSchema.safeParse({
      currentPassword: "correct horse battery",
      newPassword: "p".repeat(14),
    });

    expect(result.success).toBe(false);
  });
});
