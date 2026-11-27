---
id: USER
status: draft
contracts:
  [
    ApiError,
    RegisterRequest,
    User,
    LogInRequest,
    Session,
    ChangePasswordRequest,
  ]
---

# User accounts

## Why

People need an account on the api: they register with a name, an email
and a password, log in to get a signed token (a JWT), and change their password. Later
endpoints use the token, sent as `Authorization: Bearer <token>`, to know
who is calling.

## Requirements

### USER-1: A new user can register

- **Given** no account exists for `ada@example.com`
- **When** a caller sends `POST /users` with a `RegisterRequest` body
  `{ name: "Ada Lovelace", email: "ada@example.com", password: "correct horse battery" }`
- **Then** it gets status `201` and a `User` body with a new `id`,
  `name: "Ada Lovelace"` and `email: "ada@example.com"`, and the body
  holds no password or hash

### USER-2: Registering an email that is taken fails

- **Given** an account exists for `ada@example.com`
- **When** a caller registers `Ada@Example.com` with any valid password
- **Then** it gets status `409` and an `ApiError` with
  `code: "email_taken"` (emails compare without case)

### USER-3: Registering with an invalid body fails

- **Given** the api is running
- **When** a caller registers with a body that is not a valid
  `RegisterRequest`: a missing or blank name, a name longer than 100
  characters, a malformed email, a password shorter than 12 or longer
  than 128 characters, a missing field, or a body that is not JSON
- **Then** it gets status `400` and an `ApiError` with
  `code: "validation_failed"`, and no account is created

### USER-4: A registered user can log in

- **Given** `ada@example.com` registered with `correct horse battery`
- **When** a caller sends `POST /sessions` with a `LogInRequest` body
  `{ email: "ada@example.com", password: "correct horse battery" }`
- **Then** it gets status `200` and a `Session` body with a `token` (a JWT)
  and an `expiresAt` 24 hours later, and the token works on
  `PUT /users/me/password`

### USER-5: Logging in with wrong credentials does not say which part was wrong

- **Given** `ada@example.com` registered with `correct horse battery`
- **When** a caller logs in with the right email and a wrong password, or
  with an email that has no account
- **Then** both get status `401` and an `ApiError` with
  `code: "invalid_credentials"`, and the two bodies are identical

### USER-6: A logged-in user can change their password

- **Given** `ada@example.com` is logged in with token `T`
- **When** a caller sends `PUT /users/me/password` with
  `Authorization: Bearer T` and a `ChangePasswordRequest` body
  `{ currentPassword: "correct horse battery", newPassword: "tr0ub4dor & 3 more" }`
- **Then** it gets status `200` and a new `Session` body; after that, logging in with the new
  password succeeds and logging in with the old one fails with
  `invalid_credentials`

### USER-7: Changing the password needs the current password

- **Given** `ada@example.com` is logged in with token `T`
- **When** a caller changes the password with token `T` and a wrong
  `currentPassword`
- **Then** it gets status `401` and an `ApiError` with
  `code: "invalid_credentials"`, and the old password still logs in

### USER-8: Changing the password needs a valid session

- **Given** the api is running
- **When** a caller sends `PUT /users/me/password` with no `Authorization`
  header, with a value that is not a JWT, with a JWT the api did not
  sign (wrong signature), or with an expired JWT
- **Then** it gets status `401` and an `ApiError` with
  `code: "unauthenticated"`

### USER-9: Changing the password ends every older token

- **Given** `ada@example.com` is logged in twice, with tokens `T1` and `T2`
- **When** the user changes the password using `T1`, and gets a new token
  `T3` in the response
- **Then** changing the password with `T1` or `T2` gets `401` and
  `code: "unauthenticated"`, and `T3` works

### USER-10: The new password must follow the password rules

- **Given** `ada@example.com` is logged in with token `T`
- **When** a caller changes the password with a `newPassword` shorter than
  12 characters
- **Then** it gets status `400` and an `ApiError` with
  `code: "validation_failed"`, and the old password still logs in

## Out of scope

- Logging out, password reset by email, email verification.
- Rate limiting and account lockout after failed logins.
- Checking passwords against breach lists.
- Roles and permissions.
- Changing the name after registering.

## Open questions

Answered:

- Auth style: a signed JWT (HS256), sent as a bearer token. The api keeps
  no session table. Each user has a token version; a password change
  bumps it, which ends every older token (USER-9).
- Token lifetime: 24 hours, no refresh.

Still open (the requirements above assume the default):

- NEEDS_CLARIFICATION (password length): 12 to 128 characters (current
  draft), or 15 to 128 as NIST SP 800-63B-4 asks when a password is the
  only factor (recommended)? Either way any characters, no composition
  rules.
- NEEDS_CLARIFICATION (password characters): normalize passwords with
  Unicode NFKC before hashing, so the same password typed on different
  devices matches, and count length in characters (code points), not
  UTF-16 units (recommended)?
- NEEDS_CLARIFICATION (email): compared without case and stored
  lowercased (assumed); no verification email for now?
- NEEDS_CLARIFICATION (enumeration on register): `409 email_taken` does
  reveal that an email has an account. Hiding it needs email verification,
  which is out of scope. Accept that for now (assumed)?
- NEEDS_CLARIFICATION (register logs in): registering returns only the
  `User`, and the caller logs in next (assumed), or should it also return
  a `Session`?
- NEEDS_CLARIFICATION (name): one display name field, required, 1 to 100
  characters after trimming outer spaces, any characters, not unique, and
  returned in every `User` (assumed)? Or separate first and last names?
