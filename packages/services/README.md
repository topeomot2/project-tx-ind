# @repo/services

Starts the services from `compose.yaml` for integration and E2E tests,
in throwaway containers on free ports (Testcontainers), and stops them
afterwards.

```ts
const services = await startServices();
// services.databaseUrl -> postgres://app:app@localhost:<free port>/app
// services.smtpUrl     -> smtp://localhost:<free port>   (Mailpit)
// services.mailpitUrl  -> http://localhost:<free port>   (Mailpit's API)
await services.stop();
```

Needs a running Docker daemon. If `DATABASE_URL`, `SMTP_URL` and
`MAILPIT_URL` are all set, they are used and nothing is started.
