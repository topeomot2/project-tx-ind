import { useEffect, useRef, useState } from "react";
import type { ApiClient } from "../client.ts";
import { navigate } from "../navigation.ts";
import { somethingWentWrong } from "./messages.ts";

type State = "checking" | "verified" | "invalid" | "failed";

export function VerifyEmailPage({ client }: { client: ApiClient }) {
  const [token] = useState(
    () => new URLSearchParams(location.search).get("token") ?? "",
  );
  const [state, setState] = useState<State>(
    token === "" ? "invalid" : "checking",
  );
  // A link works once: never send it twice, even when React runs the
  // effect twice in development.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || token === "") {
      return;
    }
    sent.current = true;
    client.verifyEmail(token).then(
      (result) => {
        setState(result.ok ? "verified" : "invalid");
      },
      () => {
        setState("failed");
      },
    );
  }, [client, token]);

  if (state === "checking") {
    return <p>Checking your link…</p>;
  }
  if (state === "verified") {
    return (
      <section>
        <h1>Your email is verified</h1>
        <p>
          <a
            href="/login"
            onClick={(event) => {
              event.preventDefault();
              navigate("/login");
            }}
          >
            Log in
          </a>
        </p>
      </section>
    );
  }
  return (
    <section>
      <h1>Verify your email</h1>
      <p role="alert">
        {state === "invalid"
          ? "This link is not valid. Ask for a new one by logging in."
          : somethingWentWrong}
      </p>
    </section>
  );
}
