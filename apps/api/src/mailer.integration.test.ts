import { startServices, type RunningServices } from "@repo/services";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { createSmtpMailer } from "./mailer.ts";

const SearchSchema = z.object({
  messages: z.array(
    z.object({
      ID: z.string(),
      From: z.object({ Address: z.string() }),
      To: z.array(z.object({ Address: z.string() })),
      Subject: z.string(),
    }),
  ),
});
const MessageSchema = z.object({ Text: z.string() });

describe("smtp mailer", () => {
  let services: RunningServices;

  beforeAll(async () => {
    services = await startServices();
  });

  afterAll(async () => {
    await services.stop();
  });

  it("MAIL-1: a sent email reaches the server", async () => {
    const mailer = createSmtpMailer({
      url: services.smtpUrl,
      from: "no-reply@example.com",
    });

    await mailer.send({
      to: "mail1@example.com",
      subject: "Hello",
      text: "Body text",
    });
    await mailer.close();
    const search = await fetch(
      `${services.mailpitUrl}/api/v1/search?query=${encodeURIComponent('to:"mail1@example.com"')}`,
    );
    const { messages } = SearchSchema.parse(await search.json());
    const message = await fetch(
      `${services.mailpitUrl}/api/v1/message/${messages[0]?.ID ?? ""}`,
    );
    const { Text } = MessageSchema.parse(await message.json());

    expect(messages).toHaveLength(1);
    expect(messages[0]?.From.Address).toBe("no-reply@example.com");
    expect(messages[0]?.To.map((to) => to.Address)).toEqual([
      "mail1@example.com",
    ]);
    expect(messages[0]?.Subject).toBe("Hello");
    expect(Text.trim()).toBe("Body text");
  });
});
