import type { User } from "@repo/contracts";
import type { AccountStore, Result } from "./accounts.ts";
import type { Mailer } from "./mailer.ts";

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

/** Stub: the implementation follows specs/modules/verification.md. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub: the implementation uses it
export function createVerification(_deps: VerificationDeps): Verification {
  const notImplemented = () => Promise.reject(new Error("NotImplemented"));
  return {
    sendLink: notImplemented,
    verify: notImplemented,
    resend: notImplemented,
  };
}
