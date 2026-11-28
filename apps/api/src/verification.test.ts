import { describe, expect, it } from "vitest";
import type { User } from "@repo/contracts";
import { fakeAccountStore } from "./testing/fake-account-store.ts";
import { fakeMailer } from "./testing/fake-mailer.ts";
import { createVerification } from "./verification.ts";

const linkPattern = /http:\/\/web\.test\/verify-email\?token=([^\s]+)/g;

/** Verification over the fake store and mailer, with a hand-moved clock. */
async function setup(start = "2026-11-27T12:00:00.000Z") {
  const clock = { now: new Date(start) };
  const store = fakeAccountStore();
  const mailer = fakeMailer();
  const verification = createVerification({
    store,
    mailer,
    now: () => clock.now,
    webUrl: "http://web.test",
  });
  const stored = await store.insertUser({
    name: "Ada Lovelace",
    email: "ada@example.com",
    passwordHash: "hash",
  });
  if (stored === "email_taken") {
    throw new Error("setup: email taken");
  }
  const ada: User = { id: stored.id, name: stored.name, email: stored.email };
  return { verification, store, mailer, clock, ada };
}

/** The tokens of every link in an email's text. */
function tokensIn(text: string): string[] {
  return [...text.matchAll(linkPattern)].map(([, token]) => token ?? "");
}

describe("email verification", () => {
  it("EVER-1: send link emails one link to the user", async () => {
    const { verification, mailer, ada } = await setup();

    await verification.sendLink(ada);

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe("ada@example.com");
    expect(mailer.sent[0]?.subject).toBe("Verify your email");
    const tokens = tokensIn(mailer.sent[0]?.text ?? "");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).not.toBe("");
  });

  it("EVER-2: the token from the link verifies the user once", async () => {
    const { verification, mailer, store, ada } = await setup();
    await verification.sendLink(ada);
    const [token = ""] = tokensIn(mailer.sent[0]?.text ?? "");

    const first = await verification.verify(token);
    const user = await store.findUserById(ada.id);
    const second = await verification.verify(token);

    expect(first).toEqual({ ok: true, value: null });
    expect(user?.emailVerified).toBe(true);
    expect(second).toEqual({ ok: false, code: "invalid_token" });
  });

  it("EVER-3: a link expires after 24 hours", async () => {
    const { verification, mailer, clock, ada } = await setup(
      "2026-11-27T12:00:00.000Z",
    );
    await verification.sendLink(ada);
    await verification.sendLink(ada);
    const [early = "", late = ""] = mailer.sent.flatMap((email) =>
      tokensIn(email.text),
    );

    clock.now = new Date("2026-11-28T11:59:59.000Z");
    const before = await verification.verify(early);
    clock.now = new Date("2026-11-28T12:00:00.000Z");
    const at = await verification.verify(late);

    expect(before).toEqual({ ok: true, value: null });
    expect(at).toEqual({ ok: false, code: "invalid_token" });
  });

  it("EVER-4: an unknown token is invalid", async () => {
    const { verification } = await setup();

    const result = await verification.verify("never-sent");

    expect(result).toEqual({ ok: false, code: "invalid_token" });
  });

  it("EVER-5: resend sends only to unverified users", async () => {
    const { verification, mailer, store } = await setup();
    const grace = await store.insertUser({
      name: "Grace Hopper",
      email: "grace@example.com",
      passwordHash: "hash",
    });
    await store.markEmailVerified(grace === "email_taken" ? "" : grace.id);

    await verification.resend("ADA@example.com");
    await verification.resend("grace@example.com");
    await verification.resend("nobody@example.com");

    expect(mailer.sent.map((email) => email.to)).toEqual(["ada@example.com"]);
    expect(tokensIn(mailer.sent[0]?.text ?? "")).toHaveLength(1);
  });

  it("EVER-6: the store never sees the token", async () => {
    const { verification, mailer, store, ada } = await setup();

    await verification.sendLink(ada);
    const [token = ""] = tokensIn(mailer.sent[0]?.text ?? "");
    await verification.verify(token);

    expect(token).not.toBe("");
    expect(JSON.stringify(store.received)).not.toContain(token);
  });
});
