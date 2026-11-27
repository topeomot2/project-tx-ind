import { z } from "zod";

/** Body of GET /health on every HTTP app. "ok" means it can take traffic. */
export const HealthSchema = z.object({
  status: z.literal("ok"),
  /** Name of the app that answered, e.g. "api". */
  app: z.string().min(1),
});

export type Health = z.infer<typeof HealthSchema>;
