import type {
  LogInRequest,
  RegisterRequest,
  Session,
  User,
} from "@repo/contracts";

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

/** Stub: the implementation follows specs/modules/web-client.md. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub: the implementation uses it
export function createApiClient(_deps: ApiClientDeps): ApiClient {
  const notImplemented = () => Promise.reject(new Error("NotImplemented"));
  return {
    register: notImplemented,
    logIn: notImplemented,
    me: notImplemented,
    logOut: notImplemented,
    verifyEmail: notImplemented,
    resendVerification: notImplemented,
  };
}
