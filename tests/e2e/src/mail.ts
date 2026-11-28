// Reads the emails the api sent, from Mailpit (compose.yaml), through its
// HTTP API. Mailpit is a service we do not own, so tests may read it.
import { expect, type APIRequestContext } from "@playwright/test";
import { z } from "zod";

const mailpitURL = process.env["MAILPIT_URL"] ?? "http://localhost:8025";

const SearchSchema = z.object({
  messages: z.array(z.object({ ID: z.string() })),
});
const MessageSchema = z.object({ Subject: z.string(), Text: z.string() });

export interface Email {
  subject: string;
  text: string;
}

/** Every email sent to an address so far, oldest first. */
export async function emailsTo(
  request: APIRequestContext,
  address: string,
): Promise<Email[]> {
  const search = await request.get(`${mailpitURL}/api/v1/search`, {
    params: { query: `to:"${address}"` },
  });
  expect(search.ok()).toBe(true);
  const { messages } = SearchSchema.parse(await search.json());
  const emails: Email[] = [];
  // Mailpit lists the newest first.
  for (const { ID } of messages.toReversed()) {
    const response = await request.get(`${mailpitURL}/api/v1/message/${ID}`);
    const message = MessageSchema.parse(await response.json());
    emails.push({ subject: message.Subject, text: message.Text });
  }
  return emails;
}

/** Waits until `count` emails have reached an address, and returns them. */
export async function waitForEmails(
  request: APIRequestContext,
  address: string,
  count = 1,
): Promise<Email[]> {
  await expect
    .poll(async () => (await emailsTo(request, address)).length)
    .toBeGreaterThanOrEqual(count);
  return emailsTo(request, address);
}

/** Every verification link in an email's text. */
export function linksIn(email: Email): URL[] {
  return [
    ...email.text.matchAll(/https?:\/\/\S+\/verify-email\?token=\S+/g),
  ].map(([link]) => new URL(link));
}

/** The token of the newest verification link sent to an address. */
export async function newestToken(
  request: APIRequestContext,
  address: string,
  count = 1,
): Promise<string> {
  const emails = await waitForEmails(request, address, count);
  const newest = emails.at(-1);
  const link = newest === undefined ? undefined : linksIn(newest)[0];
  const token = link?.searchParams.get("token");
  if (token === undefined || token === null) {
    throw new Error(`No verification link sent to ${address}`);
  }
  return token;
}
