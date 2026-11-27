import { z } from "zod";

/** An email address as callers send it. Compared without case by the api. */
export const EmailSchema = z.email().max(254);

/**
 * A password that follows the password rules: 12 to 128 characters
 * (as JavaScript counts string length), any characters.
 */
export const PasswordSchema = z.string().min(12).max(128);

/**
 * A user's display name: 1 to 100 characters after trimming outer spaces.
 * Any characters; not unique.
 */
export const NameSchema = z.string().trim().min(1).max(100);

/** Body of POST /users. */
export const RegisterRequestSchema = z.object({
  name: NameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/** A user as the api shows it. Never holds the password or its hash. */
export const UserSchema = z.strictObject({
  id: z.uuid(),
  name: NameSchema,
  email: EmailSchema,
});

export type User = z.infer<typeof UserSchema>;

/**
 * Body of POST /sessions. The password is only checked for presence, so a
 * password set under older rules can still log in.
 */
export const LogInRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

export type LogInRequest = z.infer<typeof LogInRequestSchema>;

/** Body of a successful POST /sessions. */
export const SessionSchema = z.strictObject({
  /** A signed JWT: send as `Authorization: Bearer <token>`. */
  token: z.jwt(),
  /** When the token stops working, as an ISO 8601 UTC time. */
  expiresAt: z.iso.datetime(),
});

export type Session = z.infer<typeof SessionSchema>;

/** Body of PUT /users/me/password. */
export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: PasswordSchema,
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
