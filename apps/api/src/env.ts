import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  // Default matches compose.yaml, so `pnpm services:up && pnpm dev` works.
  DATABASE_URL: z.url().default("postgres://app:app@localhost:5432/app"),
});

export type Env = z.infer<typeof EnvSchema>;

/** Reads the api's settings from environment variables. Throws if invalid. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  return EnvSchema.parse(source);
}
