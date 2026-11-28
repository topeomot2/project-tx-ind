---
id: MAIL
status: approved
contracts: []
---

# SMTP mailer

Where it lives: `apps/api/src/mailer.ts`

## Purpose

Fills the `Mailer` seam with an SMTP sender. Knows nothing about what the
email says. Dev and tests send to Mailpit (`compose.yaml`); deployment
points `SMTP_URL` at a real provider.

## Interface

### Exports

| Export             | Kind     | Summary                                                      |
| ------------------ | -------- | ------------------------------------------------------------ |
| `Mailer`           | type     | `send({ to, subject, text }): Promise<void>`                 |
| `createSmtpMailer` | function | `createSmtpMailer({ url, from })`: a `Mailer` plus `close()` |

- `url`: an SMTP URL such as `smtp://localhost:1025` or
  `smtps://user:pass@smtp.example.com:465`.
- `from`: the sender address, such as `no-reply@example.com`.

### Error modes

| Situation               | Result         |
| ----------------------- | -------------- |
| SMTP server unreachable | `send` rejects |

### Configuration

- `server.ts` reads `SMTP_URL` and `MAIL_FROM` through `parseEnv`.

## Examples

Integration tests against Mailpit, started from `compose.yaml`.

### MAIL-1: A sent email reaches the server

- **Input:** `send({ to: "mail1@example.com", subject: "Hello", text: "Body text" })`
- **Expected:** Mailpit holds one message to `mail1@example.com` from
  `from`, with that subject and text

## Invariants

- None.

## Safeguards

- None.

## Open questions

- None. Production target (Temitope, 2026-11-28): Amazon SES through its
  SMTP interface, by setting `SMTP_URL`; no code change. An SES API
  adapter behind `Mailer` can come later if IAM roles are wanted.
