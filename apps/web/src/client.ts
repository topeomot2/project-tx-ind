import {
  SessionSchema,
  UserSchema,
  type LogInRequest,
  type RegisterRequest,
  type Session,
  type User,
} from "@repo/contracts";
import type { z } from "zod";

/** The outcome of a call that can fail in an expected way. */
export type Result<T, E extends string> =
  { ok: true; value: T } | { ok: false; code: E };

/** The web app's calls to the api. See specs/modules/web-client.md. */
export interface ApiClient {
  register(
    request: RegisterRequest,
  ): Promise<Result<User, "email_taken" | "validation_failed">>;
  logIn(
    request: LogInRequest,
  ): Promise<Result<Session, "invalid_credentials" | "email_not_verified">>;
  me(token: string): Promise<Result<User, "unauthenticated">>;
  logOut(token: string): Promise<Result<null, "unauthenticated">>;
  verifyEmail(token: string): Promise<Result<null, "invalid_token">>;
  resendVerification(email: string): Promise<null>;
}

export interface ApiClientDeps {
  /** Joined to each path as given, e.g. "https://api.example.com". */
  baseUrl: string;
  fetch: typeof fetch;
}

/** Thrown when the api answers in a way its interface does not allow. */
class UnexpectedResponse extends Error {
  constructor(method: string, path: string, status: number) {
    super(`Unexpected ${String(status)} from ${method} ${path}`);
    this.name = "UnexpectedResponse";
  }
}

export function createApiClient({ baseUrl, fetch }: ApiClientDeps): ApiClient {
  /** Sends one request and returns the response, whatever its status. */
  async function send(
    method: string,
    path: string,
    { body, token }: { body?: unknown; token?: string } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers["content-type"] = "application/json";
    }
    if (token !== undefined) {
      headers["authorization"] = `Bearer ${token}`;
    }
    return fetch(`${baseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  /** Reads a success body with its contract; throws if it does not match. */
  async function read<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
    return schema.parse(await response.json());
  }

  function unexpected(method: string, path: string, response: Response) {
    return new UnexpectedResponse(method, path, response.status);
  }

  return {
    async register(request) {
      const response = await send("POST", "/users", { body: request });
      switch (response.status) {
        case 201:
          return { ok: true, value: await read(response, UserSchema) };
        case 409:
          return { ok: false, code: "email_taken" };
        case 400:
          return { ok: false, code: "validation_failed" };
        default:
          throw unexpected("POST", "/users", response);
      }
    },
    async logIn(request) {
      const response = await send("POST", "/sessions", { body: request });
      switch (response.status) {
        case 200:
          return { ok: true, value: await read(response, SessionSchema) };
        case 401:
          return { ok: false, code: "invalid_credentials" };
        case 403:
          return { ok: false, code: "email_not_verified" };
        default:
          throw unexpected("POST", "/sessions", response);
      }
    },
    async me(token) {
      const response = await send("GET", "/users/me", { token });
      switch (response.status) {
        case 200:
          return { ok: true, value: await read(response, UserSchema) };
        case 401:
          return { ok: false, code: "unauthenticated" };
        default:
          throw unexpected("GET", "/users/me", response);
      }
    },
    async logOut(token) {
      const response = await send("DELETE", "/users/me/sessions", { token });
      switch (response.status) {
        case 204:
          return { ok: true, value: null };
        case 401:
          return { ok: false, code: "unauthenticated" };
        default:
          throw unexpected("DELETE", "/users/me/sessions", response);
      }
    },
    async verifyEmail(token) {
      const response = await send("POST", "/email-verifications", {
        body: { token },
      });
      switch (response.status) {
        case 204:
          return { ok: true, value: null };
        case 400:
          return { ok: false, code: "invalid_token" };
        default:
          throw unexpected("POST", "/email-verifications", response);
      }
    },
    async resendVerification(email) {
      const response = await send("POST", "/email-verifications/resend", {
        body: { email },
      });
      if (response.status !== 202) {
        throw unexpected("POST", "/email-verifications/resend", response);
      }
      return null;
    },
  };
}
