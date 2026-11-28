import { useState, type SyntheticEvent } from "react";
import type { ApiClient } from "../client.ts";
import { navigate } from "../navigation.ts";
import type { SessionStore } from "../session.ts";
import { somethingWentWrong } from "./messages.ts";

export function LogInPage({
  client,
  session,
}: {
  client: ApiClient;
  session: SessionStore;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState<string | undefined>();
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    setAlert(undefined);
    setUnverified(false);
    setResent(false);
    setBusy(true);
    try {
      const result = await client.logIn({ email, password });
      if (result.ok) {
        session.save(result.value);
        navigate("/");
      } else if (result.code === "email_not_verified") {
        setUnverified(true);
        setAlert("Verify your email first. We sent you a link.");
      } else {
        setAlert("The email or password is wrong.");
      }
    } catch {
      setAlert(somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await client.resendVerification(email);
      setResent(true);
    } catch {
      setAlert(somethingWentWrong);
    }
  }

  return (
    <section>
      <h1>Log in</h1>
      <form onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </div>
        {alert === undefined ? null : <p role="alert">{alert}</p>}
        <button type="submit" disabled={busy}>
          Log in
        </button>
      </form>
      {unverified ? (
        <p>
          <button type="button" onClick={() => void resend()}>
            Send the link again
          </button>
          {resent ? <span role="status"> We sent a new link.</span> : null}
        </p>
      ) : null}
      <p>
        New here?{" "}
        <a
          href="/register"
          onClick={(event) => {
            event.preventDefault();
            navigate("/register");
          }}
        >
          Create an account
        </a>
      </p>
    </section>
  );
}
