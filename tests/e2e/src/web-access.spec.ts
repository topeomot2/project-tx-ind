import { expect, test } from "@playwright/test";

// specs/product/web-access.md. The api is started with WEB_ORIGINS set to
// the web app's origin (playwright.config.ts).
const webOrigin = new URL(process.env["E2E_WEB_URL"] ?? "http://localhost:5173")
  .origin;

const preflight = (origin: string) => ({
  Origin: origin,
  "Access-Control-Request-Method": "POST",
  "Access-Control-Request-Headers": "content-type, authorization",
});

test("ACCESS-1: an allowed origin may call the api", async ({ request }) => {
  const response = await request.fetch("/sessions", {
    method: "OPTIONS",
    headers: preflight(webOrigin),
  });
  const headers = response.headers();

  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(300);
  expect(headers["access-control-allow-origin"]).toBe(webOrigin);
  expect(headers["access-control-allow-methods"]).toContain("POST");
  const allowed = (headers["access-control-allow-headers"] ?? "").toLowerCase();
  expect(allowed).toContain("content-type");
  expect(allowed).toContain("authorization");
});

test("ACCESS-2: answers to an allowed origin say so", async ({ request }) => {
  const response = await request.get("/health", {
    headers: { Origin: webOrigin },
  });

  expect(response.headers()["access-control-allow-origin"]).toBe(webOrigin);
});

test("ACCESS-3: other origins are not allowed", async ({ request }) => {
  const evil = "https://evil.example";

  const options = await request.fetch("/sessions", {
    method: "OPTIONS",
    headers: preflight(evil),
  });
  const get = await request.get("/health", { headers: { Origin: evil } });

  expect(options.headers()["access-control-allow-origin"]).toBeUndefined();
  expect(get.headers()["access-control-allow-origin"]).toBeUndefined();
});
