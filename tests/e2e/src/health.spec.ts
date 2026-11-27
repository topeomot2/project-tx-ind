import { HealthSchema } from "@repo/contracts";
import { expect, test } from "@playwright/test";

test("HEALTH-1: the api reports healthy", async ({ request }) => {
  const response = await request.get("/health");

  expect(response.status()).toBe(200);
  expect(HealthSchema.parse(await response.json())).toMatchObject({
    app: "api",
  });
});
