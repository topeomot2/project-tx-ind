import { fileURLToPath } from "node:url";
import { DockerComposeEnvironment, Wait } from "testcontainers";

/** Connection details for the services a test run can use. */
export interface RunningServices {
  databaseUrl: string;
  /** Where the api sends email: Mailpit's SMTP port. */
  smtpUrl: string;
  /** Mailpit's HTTP API, where tests read the emails that were sent. */
  mailpitUrl: string;
  /** Stops and removes everything `startServices` started. */
  stop(): Promise<void>;
}

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * Starts the services in `compose.yaml` for tests, each on a free port, and
 * returns how to reach them. Every call gets its own throwaway containers.
 *
 * If `DATABASE_URL`, `SMTP_URL` and `MAILPIT_URL` are all already set (e.g.
 * CI provides the services), nothing is started and those are used.
 */
export async function startServices(): Promise<RunningServices> {
  const databaseUrl = process.env["DATABASE_URL"] ?? "";
  const smtpUrl = process.env["SMTP_URL"] ?? "";
  const mailpitUrl = process.env["MAILPIT_URL"] ?? "";
  if (databaseUrl !== "" && smtpUrl !== "" && mailpitUrl !== "") {
    return {
      databaseUrl,
      smtpUrl,
      mailpitUrl,
      stop: () => Promise.resolve(),
    };
  }

  const environment = await new DockerComposeEnvironment(
    repoRoot,
    "compose.yaml",
  )
    .withEnvironment({
      POSTGRES_PORTS: "5432",
      MAILPIT_SMTP_PORTS: "1025",
      MAILPIT_HTTP_PORTS: "8025",
    })
    .withWaitStrategy("postgres-1", Wait.forHealthCheck())
    .withWaitStrategy("mailpit-1", Wait.forHealthCheck())
    .up(["postgres", "mailpit"]);

  const postgres = environment.getContainer("postgres-1");
  const mailpit = environment.getContainer("mailpit-1");
  const mailHost = mailpit.getHost();

  return {
    // Credentials match compose.yaml.
    databaseUrl: `postgres://app:app@${postgres.getHost()}:${String(postgres.getMappedPort(5432))}/app`,
    smtpUrl: `smtp://${mailHost}:${String(mailpit.getMappedPort(1025))}`,
    mailpitUrl: `http://${mailHost}:${String(mailpit.getMappedPort(8025))}`,
    stop: async () => {
      await environment.down();
    },
  };
}
