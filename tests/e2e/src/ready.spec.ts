import { HealthSchema } from "@repo/contracts";
import { expect, test } from "@playwright/test";

test("HEALTH-2: the api reports ready when its database is up", async ({
  request,
}) => {
  const response = await request.get("/ready");

  expect(response.status()).toBe(200);
  expect(HealthSchema.parse(await response.json())).toMatchObject({
    app: "api",
  });
});
