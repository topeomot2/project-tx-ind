/**
 * A fake `fetch` for the api client tests (unit and property). It records
 * each request as plain values and answers with the next scripted reply.
 * `fetch` is the platform's, not ours, so it is faked at this seam.
 *
 * Locked like the tests: only spec and test work changes it.
 */
export interface SentRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
}

export interface Reply {
  status: number;
  /** Sent as JSON; leave out for an empty body. */
  json?: unknown;
}

export function fakeFetch(...replies: Reply[]): {
  fetch: typeof fetch;
  sent: SentRequest[];
} {
  const sent: SentRequest[] = [];
  const queue = [...replies];
  const fake = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const request = new Request(
      typeof input === "string" && input.startsWith("/")
        ? `http://web.test${input}`
        : input,
      init,
    );
    const url = new URL(request.url);
    const body = await request.text();
    sent.push({
      method: request.method,
      url: url.origin === "http://web.test" ? url.pathname : request.url,
      headers: Object.fromEntries(request.headers),
      body: body === "" ? undefined : body,
    });
    const reply = queue.shift();
    if (reply === undefined) {
      throw new Error("fakeFetch: no reply scripted");
    }
    return reply.json === undefined
      ? new Response(null, { status: reply.status })
      : Response.json(reply.json, { status: reply.status });
  };
  return { fetch: fake, sent };
}
