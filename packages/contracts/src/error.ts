import { z } from "zod";

/**
 * The one error shape every app returns at its interface
 * (HTTP response body, queue message, worker result).
 */
export const ApiErrorSchema = z.object({
  /** Stable, machine-readable code, e.g. "not_found". Never reworded. */
  code: z.string().regex(/^[a-z][a-z0-9_]*$/),
  /** Human-readable explanation. May change; never branch on it. */
  message: z.string().min(1),
  /** Optional structured detail, e.g. which field failed validation. */
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
