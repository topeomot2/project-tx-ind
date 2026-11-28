---
id: VERIFY
status: approved
contracts:
  [ApiError, RegisterRequest, VerifyEmailRequest, ResendVerificationRequest]
---

# Email verification

## Why

The api must know that an email address is real and belongs to the person
who registered it, before that person can log in. Registering sends a link
to the address; opening the link proves it.

## Requirements

A **link** is the web app's address `<WEB_URL>/verify-email?token=<token>`,
sent in a plain-text email. The api reads `WEB_URL` from its environment.
Tests read the email from the mail catcher (Mailpit) in `compose.yaml`.

### VERIFY-1: Registering sends a link to the new address

- **Given** no account exists for a fresh email
- **When** a caller registers it (`POST /users`, USER-1)
- **Then** exactly one email reaches that address, with the subject
  "Verify your email" and a body that holds one link

### VERIFY-2: The link verifies the email, and then the user can log in

- **Given** a user registered and got a link with token `K`
- **When** a caller sends `POST /email-verifications` with a
  `VerifyEmailRequest` body `{ token: K }`
- **Then** it gets status `204` with no body, and logging in with that
  email and password now gets `200` and a `Session` (USER-4)

### VERIFY-3: A user who has not verified cannot log in

- **Given** a user registered but has not used the link
- **When** a caller logs in with the right email and password
- **Then** it gets status `403` and an `ApiError` with
  `code: "email_not_verified"`. With a wrong password the answer is still
  `401 invalid_credentials` (USER-5), so a wrong guess learns nothing new

### VERIFY-4: A link works once

- **Given** a user verified with token `K`
- **When** a caller sends `POST /email-verifications` with `K` again, or
  with a token the api never sent
- **Then** each gets status `400` and an `ApiError` with
  `code: "invalid_token"`

### VERIFY-5: A user can ask for a new link

- **Given** a user registered but has not verified
- **When** a caller sends `POST /email-verifications/resend` with a
  `ResendVerificationRequest` body `{ email }`, in any case
- **Then** it gets status `202` with no body, a second email with a new
  link reaches the address, and the new link verifies the email

### VERIFY-6: Asking for a link does not say whether an account exists

- **Given** one email has no account and another is already verified
- **When** a caller asks for a new link for each
- **Then** both get status `202` with no body, and no email is sent

Links expire 24 hours after they are sent; that is checked in
`specs/modules/verification.md`, because an E2E test cannot wait a day.

## Out of scope

- Changing the email address after registering.
- Limits on how often a link can be asked for.
- HTML emails, templates and translations.
- Sending through a real email provider in tests.

## Safeguards

- The api stores only a SHA-256 hash of each token, so a copy of the
  database cannot verify anyone: the hash is not visible through the api.
- Tokens are 32 random bytes from `crypto.randomBytes`, written in
  base64url: randomness cannot be checked by a fast test.

## Open questions

Answered by Temitope, 2026-11-28:

- A user who has not verified cannot log in. They get
  `403 email_not_verified` only when the password is right.
- A link lasts 24 hours. Asking for a new one does not end older links.
- Mail goes out over SMTP (`SMTP_URL`, `MAIL_FROM`). Dev and tests use
  Mailpit from `compose.yaml`; a real provider is set up at deployment.
- Accounts that existed before this change count as not verified; they
  can ask for a link (VERIFY-5).
