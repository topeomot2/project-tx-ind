import { ApiErrorSchema, SessionSchema } from "@repo/contracts";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { emailsTo, linksIn, newestToken, waitForEmails } from "./mail.ts";

// specs/product/email-verification.md
const password = "correct horse battery";
const webURL = process.env["E2E_WEB_URL"] ?? "http://localhost:5173";

const freshEmail = () => `ada-${randomUUID()}@example.com`;

async function register(request: APIRequestContext, email: string) {
  const response = await request.post("/users", {
    data: { name: "Ada Lovelace", email, password },
  });
  expect(response.status()).toBe(201);
}

async function verify(request: APIRequestContext, token: string) {
  return request.post("/email-verifications", { data: { token } });
}

async function logIn(
  request: APIRequestContext,
  email: string,
  withPassword = password,
) {
  return request.post("/sessions", {
    data: { email, password: withPassword },
  });
}

async function resend(request: APIRequestContext, email: string) {
  return request.post("/email-verifications/resend", { data: { email } });
}

async function errorCode(response: { json(): Promise<unknown> }) {
  return ApiErrorSchema.parse(await response.json()).code;
}

/**
 * Gives a wrong, late email time to arrive before a test counts emails:
 * waits until the email for a later registration has reached Mailpit.
 */
async function settle(request: APIRequestContext) {
  const other = freshEmail();
  await register(request, other);
  await waitForEmails(request, other);
}

test("VERIFY-1: registering sends a link to the new address", async ({
  request,
}) => {
  const email = freshEmail();

  await register(request, email);
  const emails = await waitForEmails(request, email);
  await settle(request);

  expect(await emailsTo(request, email)).toHaveLength(1);
  expect(emails[0]?.subject).toBe("Verify your email");
  const links = emails[0] === undefined ? [] : linksIn(emails[0]);
  expect(links).toHaveLength(1);
  expect(links[0]?.origin).toBe(new URL(webURL).origin);
  expect(links[0]?.pathname).toBe("/verify-email");
  expect(links[0]?.searchParams.get("token")).toBeTruthy();
});

test("VERIFY-2: the link verifies the email, and then the user can log in", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);
  const token = await newestToken(request, email);

  const response = await verify(request, token);
  const later = await logIn(request, email);

  expect(response.status()).toBe(204);
  expect(await response.body()).toHaveLength(0);
  expect(later.status()).toBe(200);
  SessionSchema.parse(await later.json());
});

test("VERIFY-3: a user who has not verified cannot log in", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);

  const right = await logIn(request, email);
  const wrong = await logIn(request, email, "not the password");

  expect(right.status()).toBe(403);
  expect(await errorCode(right)).toBe("email_not_verified");
  expect(wrong.status()).toBe(401);
  expect(await errorCode(wrong)).toBe("invalid_credentials");
});

test("VERIFY-4: a link works once", async ({ request }) => {
  const email = freshEmail();
  await register(request, email);
  const token = await newestToken(request, email);
  await verify(request, token);

  const again = await verify(request, token);
  const unknown = await verify(request, "a-token-the-api-never-sent");

  for (const response of [again, unknown]) {
    expect(response.status()).toBe(400);
    expect(await errorCode(response)).toBe("invalid_token");
  }
});

test("VERIFY-5: a user can ask for a new link", async ({ request }) => {
  const email = freshEmail();
  await register(request, email);
  const first = await newestToken(request, email);

  const response = await resend(request, email.toUpperCase());
  const second = await newestToken(request, email, 2);
  const verified = await verify(request, second);

  expect(response.status()).toBe(202);
  expect(await response.body()).toHaveLength(0);
  expect(second).not.toBe(first);
  expect(verified.status()).toBe(204);
  expect((await logIn(request, email)).status()).toBe(200);
});

test("VERIFY-6: asking for a link does not say whether an account exists", async ({
  request,
}) => {
  const nobody = freshEmail();
  const verifiedEmail = freshEmail();
  await register(request, verifiedEmail);
  await verify(request, await newestToken(request, verifiedEmail));

  const forNobody = await resend(request, nobody);
  const forVerified = await resend(request, verifiedEmail);
  await settle(request);

  for (const response of [forNobody, forVerified]) {
    expect(response.status()).toBe(202);
    expect(await response.body()).toHaveLength(0);
  }
  expect(await emailsTo(request, nobody)).toHaveLength(0);
  expect(await emailsTo(request, verifiedEmail)).toHaveLength(1);
});
