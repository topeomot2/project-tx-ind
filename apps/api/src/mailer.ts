import { createTransport } from "nodemailer";

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

/** An SMTP Mailer. See specs/modules/mailer.md. */
export function createSmtpMailer({
  url,
  from,
}: {
  url: string;
  from: string;
}): Mailer & { close(): Promise<void> } {
  const transport = createTransport(url);
  return {
    async send({ to, subject, text }) {
      await transport.sendMail({ from, to, subject, text });
    },
    close() {
      transport.close();
      return Promise.resolve();
    },
  };
}
