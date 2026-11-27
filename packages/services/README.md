# @repo/services

Starts the services from `compose.yaml` for integration and E2E tests,
in throwaway containers on free ports (Testcontainers), and stops them
afterwards.

```ts
const services = await startServices();
// services.databaseUrl -> postgres://app:app@localhost:<free port>/app
await services.stop();
```

Needs a running Docker daemon. If `DATABASE_URL` is set, it is used and
nothing is started.
