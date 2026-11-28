import {
  ApiErrorSchema,
  SessionSchema,
  UserSchema,
  type ApiError,
} from "@repo/contracts";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

const password = "correct horse battery";
const newPassword = "tr0ub4dor & 3 more";

/** A fresh email for each test, so tests never share an account. */
const freshEmail = () => `ada-${randomUUID()}@example.com`;

async function register(request: APIRequestContext, email: string) {
  return request.post("/users", {
    data: { name: "Ada Lovelace", email, password },
  });
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

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await logIn(request, email);
  expect(response.status()).toBe(200);
  return SessionSchema.parse(await response.json()).token;
}

async function changePassword(
  request: APIRequestContext,
  token: string | undefined,
  body: { currentPassword: string; newPassword: string },
) {
  return request.put("/users/me/password", {
    data: body,
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  });
}

async function errorCode(response: {
  json(): Promise<unknown>;
}): Promise<ApiError["code"]> {
  return ApiErrorSchema.parse(await response.json()).code;
}

test("USER-1: a new user can register", async ({ request }) => {
  const email = freshEmail();

  const response = await register(request, email);
  const body: unknown = await response.json();

  expect(response.status()).toBe(201);
  const user = UserSchema.parse(body);
  expect(user).toEqual({ id: user.id, name: "Ada Lovelace", email });
});

test("USER-2: registering an email that is taken fails", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);

  const response = await register(request, email.toUpperCase());

  expect(response.status()).toBe(409);
  expect(await errorCode(response)).toBe("email_taken");
});

/** Bodies that are not a valid RegisterRequest, for a given fresh email. */
const invalidBodies: Record<string, (email: string) => object> = {
  "a blank name": (email) => ({ name: "  ", email, password }),
  "a name over 100 characters": (email) => ({
    name: "a".repeat(101),
    email,
    password,
  }),
  "a malformed email": () => ({ name: "Ada", email: "ada", password }),
  "a 14-character password": (email) => ({
    name: "Ada",
    email,
    password: "p".repeat(14),
  }),
  "a 129-character password": (email) => ({
    name: "Ada",
    email,
    password: "p".repeat(129),
  }),
  "a missing name": (email) => ({ email, password }),
};

for (const [label, body] of Object.entries(invalidBodies)) {
  test(`USER-3: registering with ${label} fails`, async ({ request }) => {
    const email = freshEmail();

    const response = await request.post("/users", { data: body(email) });
    const later = await logIn(request, email);

    expect(response.status()).toBe(400);
    expect(await errorCode(response)).toBe("validation_failed");
    expect(later.status()).toBe(401);
  });
}

test("USER-3: registering with a body that is not JSON fails", async ({
  request,
}) => {
  const response = await request.post("/users", {
    data: "not json",
    headers: { "content-type": "application/json" },
  });

  expect(response.status()).toBe(400);
  expect(await errorCode(response)).toBe("validation_failed");
});

test("USER-4: a registered user can log in", async ({ request }) => {
  const email = freshEmail();
  await register(request, email);
  const before = Date.now();

  const response = await logIn(request, email);
  const after = Date.now();

  expect(response.status()).toBe(200);
  const session = SessionSchema.parse(await response.json());
  const day = 24 * 60 * 60 * 1000;
  const expires = Date.parse(session.expiresAt);
  // Seconds precision: a JWT's exp is in whole seconds.
  expect(expires).toBeGreaterThanOrEqual(before + day - 1000);
  expect(expires).toBeLessThanOrEqual(after + day + 1000);
  const works = await changePassword(request, session.token, {
    currentPassword: "wrong password",
    newPassword,
  });
  expect(await errorCode(works)).not.toBe("unauthenticated");
});

test("USER-5: wrong credentials do not say which part was wrong", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);

  const wrongPassword = await logIn(request, email, "not the password");
  const unknownEmail = await logIn(request, freshEmail());

  expect(wrongPassword.status()).toBe(401);
  expect(unknownEmail.status()).toBe(401);
  const first: unknown = await wrongPassword.json();
  const second: unknown = await unknownEmail.json();
  expect(ApiErrorSchema.parse(first).code).toBe("invalid_credentials");
  expect(second).toEqual(first);
});

test("USER-6: a logged-in user can change their password", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);
  const token = await tokenFor(request, email);

  const response = await changePassword(request, token, {
    currentPassword: password,
    newPassword,
  });
  const withNew = await logIn(request, email, newPassword);
  const withOld = await logIn(request, email, password);

  expect(response.status()).toBe(200);
  SessionSchema.parse(await response.json());
  expect(withNew.status()).toBe(200);
  expect(withOld.status()).toBe(401);
  expect(await errorCode(withOld)).toBe("invalid_credentials");
});

test("USER-7: changing the password needs the current password", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);
  const token = await tokenFor(request, email);

  const response = await changePassword(request, token, {
    currentPassword: "wrong password",
    newPassword,
  });
  const withOld = await logIn(request, email, password);

  expect(response.status()).toBe(401);
  expect(await errorCode(response)).toBe("invalid_credentials");
  expect(withOld.status()).toBe(200);
});

test("USER-8: changing the password needs a valid token", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);
  const token = await tokenFor(request, email);
  // Change the first signature character, so the signature is wrong.
  const at = token.lastIndexOf(".") + 1;
  const forged =
    token.slice(0, at) + (token[at] === "A" ? "B" : "A") + token.slice(at + 1);
  const body = { currentPassword: password, newPassword };

  const responses = [
    await changePassword(request, undefined, body),
    await changePassword(request, "not-a-jwt", body),
    await changePassword(request, forged, body),
  ];

  for (const response of responses) {
    expect(response.status()).toBe(401);
    expect(await errorCode(response)).toBe("unauthenticated");
  }
});

test("USER-9: changing the password ends every older token", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);
  const t1 = await tokenFor(request, email);
  const t2 = await tokenFor(request, email);

  const response = await changePassword(request, t1, {
    currentPassword: password,
    newPassword,
  });
  const t3 = SessionSchema.parse(await response.json()).token;
  const body = { currentPassword: "wrong password", newPassword };

  for (const old of [t1, t2]) {
    const result = await changePassword(request, old, body);
    expect(result.status()).toBe(401);
    expect(await errorCode(result)).toBe("unauthenticated");
  }
  const withT3 = await changePassword(request, t3, body);
  expect(await errorCode(withT3)).toBe("invalid_credentials");
});

test("USER-10: the new password must follow the password rules", async ({
  request,
}) => {
  const email = freshEmail();
  await register(request, email);
  const token = await tokenFor(request, email);

  const response = await changePassword(request, token, {
    currentPassword: password,
    newPassword: "p".repeat(14),
  });
  const withOld = await logIn(request, email, password);

  expect(response.status()).toBe(400);
  expect(await errorCode(response)).toBe("validation_failed");
  expect(withOld.status()).toBe(200);
});
