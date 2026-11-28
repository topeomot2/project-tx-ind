import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createApiClient, type ApiClient } from "./client.ts";
import { fakeFetch } from "./testing/fake-fetch.ts";

/** The statuses each method answers with a result (web-client.md). */
const expected: Record<keyof ApiClient, number[]> = {
  register: [201, 400, 409],
  logIn: [200, 401, 403],
  me: [200, 401],
  logOut: [204, 401],
  verifyEmail: [204, 400],
  resendVerification: [202],
};

const calls: Record<keyof ApiClient, (client: ApiClient) => Promise<unknown>> =
  {
    register: (client) =>
      client.register({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "correct horse battery",
      }),
    logIn: (client) =>
      client.logIn({ email: "ada@example.com", password: "x" }),
    me: (client) => client.me("T"),
    logOut: (client) => client.logOut("T"),
    verifyEmail: (client) => client.verifyEmail("K"),
    resendVerification: (client) =>
      client.resendVerification("ada@example.com"),
  };

const methods = Object.keys(expected) as (keyof ApiClient)[];

describe("api client", () => {
  it("WCL-9: unexpected statuses throw", async () => {
    const cases = fc
      .tuple(fc.constantFrom(...methods), fc.integer({ min: 200, max: 599 }))
      .filter(([method, status]) => !expected[method].includes(status));

    await fc.assert(
      fc.asyncProperty(cases, async ([method, status]) => {
        // A body is only allowed with statuses that may carry one.
        const json = [204, 205, 304].includes(status)
          ? undefined
          : { code: "internal_error", message: "Something went wrong." };
        const fake = fakeFetch({ status, json });
        const client = createApiClient({ baseUrl: "/api", fetch: fake.fetch });

        await expect(calls[method](client)).rejects.toThrow(Error);
      }),
    );
  });
});
