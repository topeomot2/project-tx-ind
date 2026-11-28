import { describe, expect, it } from "vitest";
import { createApiClient } from "./client.ts";
import { fakeFetch, type Reply } from "./testing/fake-fetch.ts";

const user = {
  id: "0b6c8d62-6f43-4f53-9c4b-3a1d8f2e9a10",
  name: "Ada Lovelace",
  email: "ada@example.com",
};
// A real HS256 JWT shape: header.payload.signature, base64url.
const session = {
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlLXRoYXQtaXMtbG9uZw",
  expiresAt: "2026-11-28T12:00:00.000Z",
};
const ada = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "correct horse battery",
};

function setup(...replies: Reply[]) {
  const fake = fakeFetch(...replies);
  return {
    client: createApiClient({ baseUrl: "/api", fetch: fake.fetch }),
    sent: fake.sent,
  };
}

describe("api client", () => {
  it("WCL-1: register sends the request and returns the new user", async () => {
    const { client, sent } = setup({ status: 201, json: user });

    const result = await client.register(ada);

    expect(result).toEqual({ ok: true, value: user });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: "POST", url: "/api/users" });
    expect(sent[0]?.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(sent[0]?.body ?? "")).toEqual(ada);
  });

  it("WCL-2: register reports a taken email and an invalid body", async () => {
    const { client } = setup(
      { status: 409, json: { code: "email_taken", message: "Taken." } },
      { status: 400, json: { code: "validation_failed", message: "Bad." } },
    );

    const taken = await client.register(ada);
    const invalid = await client.register(ada);

    expect(taken).toEqual({ ok: false, code: "email_taken" });
    expect(invalid).toEqual({ ok: false, code: "validation_failed" });
  });

  it("WCL-3: log in sends the request and returns the session", async () => {
    const { client, sent } = setup({ status: 200, json: session });
    const body = { email: ada.email, password: ada.password };

    const result = await client.logIn(body);

    expect(result).toEqual({ ok: true, value: session });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: "POST", url: "/api/sessions" });
    expect(sent[0]?.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(sent[0]?.body ?? "")).toEqual(body);
  });

  it("WCL-4: log in reports wrong credentials", async () => {
    const { client } = setup({
      status: 401,
      json: { code: "invalid_credentials", message: "Wrong." },
    });

    const result = await client.logIn({ email: ada.email, password: "x" });

    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("WCL-5: me sends the token and returns the user", async () => {
    const { client, sent } = setup({ status: 200, json: user });

    const result = await client.me("T");

    expect(result).toEqual({ ok: true, value: user });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: "GET", url: "/api/users/me" });
    expect(sent[0]?.headers["authorization"]).toBe("Bearer T");
  });

  it("WCL-6: log out sends the token", async () => {
    const { client, sent } = setup({ status: 204 });

    const result = await client.logOut("T");

    expect(result).toEqual({ ok: true, value: null });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      method: "DELETE",
      url: "/api/users/me/sessions",
    });
    expect(sent[0]?.headers["authorization"]).toBe("Bearer T");
  });

  it("WCL-7: me and log out report an invalid session", async () => {
    const unauthenticated = {
      status: 401,
      json: { code: "unauthenticated", message: "No." },
    };
    const { client } = setup(unauthenticated, unauthenticated);

    const fromMe = await client.me("T");
    const fromLogOut = await client.logOut("T");

    expect(fromMe).toEqual({ ok: false, code: "unauthenticated" });
    expect(fromLogOut).toEqual({ ok: false, code: "unauthenticated" });
  });

  it("WCL-8: a success body that breaks its contract throws", async () => {
    const { client, sent } = setup(
      { status: 200, json: { token: "x" } },
      { status: 200, json: { name: "Ada" } },
    );

    await expect(
      client.logIn({ email: ada.email, password: ada.password }),
    ).rejects.toThrow(Error);
    await expect(client.me("T")).rejects.toThrow(Error);
    // The api answered both: the bodies, not the requests, were wrong.
    expect(sent.map((request) => request.url)).toEqual([
      "/api/sessions",
      "/api/users/me",
    ]);
  });

  it("WCL-10: log in reports an unverified email", async () => {
    const { client } = setup({
      status: 403,
      json: { code: "email_not_verified", message: "Verify first." },
    });

    const result = await client.logIn({
      email: ada.email,
      password: ada.password,
    });

    expect(result).toEqual({ ok: false, code: "email_not_verified" });
  });

  it("WCL-11: verify email sends the token", async () => {
    const { client, sent } = setup(
      { status: 204 },
      { status: 400, json: { code: "invalid_token", message: "Bad link." } },
    );

    const first = await client.verifyEmail("K");
    const second = await client.verifyEmail("K");

    expect(first).toEqual({ ok: true, value: null });
    expect(second).toEqual({ ok: false, code: "invalid_token" });
    expect(sent[0]).toMatchObject({
      method: "POST",
      url: "/api/email-verifications",
    });
    expect(sent[0]?.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(sent[0]?.body ?? "")).toEqual({ token: "K" });
  });

  it("WCL-12: resend sends the email", async () => {
    const { client, sent } = setup({ status: 202 });

    const result = await client.resendVerification("ada@example.com");

    expect(result).toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      method: "POST",
      url: "/api/email-verifications/resend",
    });
    expect(JSON.parse(sent[0]?.body ?? "")).toEqual({
      email: "ada@example.com",
    });
  });
});
