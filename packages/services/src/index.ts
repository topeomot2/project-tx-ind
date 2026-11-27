import { fileURLToPath } from "node:url";
import { DockerComposeEnvironment, Wait } from "testcontainers";

/** Connection details for the services a test run can use. */
export interface RunningServices {
  databaseUrl: string;
  /** Stops and removes everything `startServices` started. */
  stop(): Promise<void>;
}

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * Starts the services in `compose.yaml` for tests, each on a free port, and
 * returns how to reach them. Every call gets its own throwaway containers.
 *
 * If `DATABASE_URL` is already set (e.g. CI provides Postgres), nothing is
 * started and that URL is used.
 */
export async function startServices(): Promise<RunningServices> {
  const existing = process.env["DATABASE_URL"];
  if (existing !== undefined && existing !== "") {
    return { databaseUrl: existing, stop: () => Promise.resolve() };
  }

  const environment = await new DockerComposeEnvironment(
    repoRoot,
    "compose.yaml",
  )
    .withEnvironment({ POSTGRES_PORTS: "5432" })
    .withWaitStrategy("postgres-1", Wait.forHealthCheck())
    .up(["postgres"]);

  const postgres = environment.getContainer("postgres-1");
  // Credentials match compose.yaml.
  const databaseUrl = `postgres://app:app@${postgres.getHost()}:${String(postgres.getMappedPort(5432))}/app`;

  return {
    databaseUrl,
    stop: async () => {
      await environment.down();
    },
  };
}
