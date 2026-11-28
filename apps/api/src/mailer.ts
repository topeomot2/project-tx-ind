/** One plain-text email. */
export interface Email {
  to: string;
  subject: string;
  text: string;
}

/** What the api needs to send email. The seam for tests. */
export interface Mailer {
  send(email: Email): Promise<void>;
}

/** Stub: the implementation follows specs/modules/mailer.md. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub: the implementation uses it
export function createSmtpMailer(_options: {
  url: string;
  from: string;
}): Mailer & { close(): Promise<void> } {
  const notImplemented = () => Promise.reject(new Error("NotImplemented"));
  return { send: notImplemented, close: notImplemented };
}
