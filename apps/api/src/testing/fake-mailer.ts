import type { Email, Mailer } from "../mailer.ts";

/**
 * In-memory adapter for the Mailer seam: keeps every email in `sent`.
 *
 * Locked like the tests: only spec and test work changes it.
 */
export function fakeMailer(): Mailer & { sent: Email[] } {
  const sent: Email[] = [];
  return {
    sent,
    send(email) {
      sent.push({ ...email });
      return Promise.resolve();
    },
  };
}
