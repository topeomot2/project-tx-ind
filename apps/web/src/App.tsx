import type { ApiClient } from "./client.ts";
import { usePath } from "./navigation.ts";
import { LogInPage } from "./pages/LogInPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { VerifyEmailPage } from "./pages/VerifyEmailPage.tsx";
import { WelcomePage } from "./pages/WelcomePage.tsx";
import type { SessionStore } from "./session.ts";

export interface AppProps {
  client: ApiClient;
  session: SessionStore;
}

/** The pages of specs/product/web.md, by path. */
export function App({ client, session }: AppProps) {
  const path = usePath();
  return (
    <main>
      {path === "/register" ? (
        <RegisterPage client={client} />
      ) : path === "/verify-email" ? (
        <VerifyEmailPage client={client} />
      ) : path === "/login" ? (
        <LogInPage client={client} session={session} />
      ) : (
        <WelcomePage client={client} session={session} />
      )}
    </main>
  );
}
