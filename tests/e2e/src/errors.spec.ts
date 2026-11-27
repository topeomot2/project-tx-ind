import { ApiErrorSchema } from "@repo/contracts";
import { expect, test } from "@playwright/test";

test("ERR-1: unknown routes say not_found", async ({ request }) => {
  const response = await request.get("/no-such-route");

  expect(response.status()).toBe(404);
  expect(ApiErrorSchema.parse(await response.json()).code).toBe("not_found");
});
