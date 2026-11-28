import type { User } from "@repo/contracts";
import { createHash, randomBytes } from "node:crypto";
import type { AccountStore, Result } from "./accounts.ts";
import type { Mailer } from "./mailer.ts";

const linkMilliseconds = 24 * 60 * 60 * 1000;

/** Sends and checks verification links. See specs/modules/verification.md. */
export interface Verification {
  sendLink(user: User): Promise<void>;
  verify(token: string): Promise<Result<null, "invalid_token">>;
  resend(email: string): Promise<void>;
}

export interface VerificationDeps {
  store: AccountStore;
  mailer: Mailer;
  now: () => Date;
  /** The web app's base URL, with no trailing "/". */
  webUrl: string;
}

/** Safeguard: only this hash is stored, never the token. */
function hashOf(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createVerification({
  store,
  mailer,
  now,
  webUrl,
}: VerificationDeps): Verification {
  async function sendLink(user: { id: string; email: string }) {
    // Safeguard: 32 random bytes, base64url.
    const token = randomBytes(32).toString("base64url");
    await store.insertVerification({
      userId: user.id,
      tokenHash: hashOf(token),
      expiresAt: new Date(now().getTime() + linkMilliseconds),
    });
    const link = `${webUrl}/verify-email?token=${token}`;
    await mailer.send({
      to: user.email,
      subject: "Verify your email",
      text: `Open this link to verify your email:\n\n${link}\n\nIt works once, for 24 hours.\n`,
    });
  }

  return {
    sendLink,
    async verify(token) {
      const stored = await store.takeVerification(hashOf(token));
      if (
        stored === undefined ||
        now().getTime() >= stored.expiresAt.getTime()
      ) {
        return { ok: false, code: "invalid_token" };
      }
      await store.markEmailVerified(stored.userId);
      return { ok: true, value: null };
    },
    async resend(email) {
      const user = await store.findUserByEmail(email.toLowerCase());
      if (user !== undefined && !user.emailVerified) {
        await sendLink(user);
      }
    },
  };
}
