import { useEffect, useState } from "react";
import type { User } from "@repo/contracts";
import type { ApiClient } from "../client.ts";
import { navigate } from "../navigation.ts";
import type { SessionStore } from "../session.ts";
import { somethingWentWrong } from "./messages.ts";

export function WelcomePage({
  client,
  session,
}: {
  client: ApiClient;
  session: SessionStore;
}) {
  const [user, setUser] = useState<User | undefined>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = session.token();
    if (token === undefined) {
      navigate("/login", { replace: true });
      return;
    }
    let current = true;
    client.me(token).then(
      (result) => {
        if (!current) {
          return;
        }
        if (result.ok) {
          setUser(result.value);
        } else {
          // Logged out elsewhere, or the token is no longer accepted.
          session.clear();
          navigate("/login", { replace: true });
        }
      },
      () => {
        if (current) {
          setFailed(true);
        }
      },
    );
    return () => {
      current = false;
    };
  }, [client, session]);

  async function logOut() {
    const token = session.token();
    try {
      if (token !== undefined) {
        await client.logOut(token);
      }
    } catch {
      // Forget the session here even if the api could not be reached.
    }
    session.clear();
    navigate("/login");
  }

  if (failed) {
    return <p role="alert">{somethingWentWrong}</p>;
  }
  if (user === undefined) {
    return <p>Loading…</p>;
  }
  return (
    <section>
      <h1>Welcome, {user.name}</h1>
      <button type="button" onClick={() => void logOut()}>
        Log out
      </button>
    </section>
  );
}
