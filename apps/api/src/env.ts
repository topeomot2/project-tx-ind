import { z } from "zod";

/** A comma-separated list of origins, such as "https://a.example, https://b.example". */
const OriginsSchema = z
  .string()
  .transform((list) =>
    list
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ""),
  )
  .pipe(z.array(z.url()));

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  // Default matches compose.yaml, so `pnpm services:up && pnpm dev` works.
  DATABASE_URL: z.url().default("postgres://app:app@localhost:5432/app"),
  /** HS256 signing key for session tokens. No default: it is a secret. */
  JWT_SECRET: z.string().min(32),
  /** The web app's base URL, used in verification links. */
  WEB_URL: z.url().default("http://localhost:5173"),
  /** Origins allowed by CORS (specs/product/web-access.md). */
  WEB_ORIGINS: OriginsSchema.default(["http://localhost:5173"]),
  // Default matches Mailpit in compose.yaml.
  SMTP_URL: z.url().default("smtp://localhost:1025"),
  MAIL_FROM: z
    .string()
    .regex(/^[^\s@]+@[^\s@]+$/)
    .default("no-reply@localhost"),
});

export type Env = z.infer<typeof EnvSchema>;

/** Reads the api's settings from environment variables. Throws if invalid. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  return EnvSchema.parse(source);
}
