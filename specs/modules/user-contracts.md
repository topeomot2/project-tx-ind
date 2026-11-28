---
id: UCON
status: approved
contracts:
  [
    RegisterRequest,
    User,
    LogInRequest,
    Session,
    ChangePasswordRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
  ]
---

# User contracts

Where it lives: `packages/contracts/src/users.ts`, exported from
`@repo/contracts`

## Purpose

The shapes callers send and receive to register, log in and change a
password. Shapes only: no business logic, no I/O. Email case and password
hashing are the api's job, not the contracts'.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export                            | Kind   | Summary                                    |
| --------------------------------- | ------ | ------------------------------------------ |
| `NameSchema`                      | schema | A user's display name                      |
| `EmailSchema`                     | schema | An email address, at most 254 characters   |
| `PasswordSchema`                  | schema | A password that follows the password rules |
| `RegisterRequestSchema`           | schema | Body of `POST /users`                      |
| `UserSchema`                      | schema | A user as the api shows it                 |
| `LogInRequestSchema`              | schema | Body of `POST /sessions`                   |
| `SessionSchema`                   | schema | Body of a successful log in                |
| `ChangePasswordRequestSchema`     | schema | Body of `PUT /users/me/password`           |
| `VerifyEmailRequestSchema`        | schema | Body of `POST /email-verifications`        |
| `ResendVerificationRequestSchema` | schema | Body of `POST /email-verifications/resend` |

Each schema `XSchema` has a type `X = z.infer<typeof XSchema>`, except
`NameSchema`, `EmailSchema` and `PasswordSchema`.

- **Name** (`NameSchema`): outer spaces are trimmed, then 1 to 100
  characters; any characters; not unique. Parsing returns the trimmed
  name.
- **Password rules** (`PasswordSchema`): 15 to 128 characters, counted as
  Unicode code points (an emoji is one character); any characters; no
  composition rules.
- `RegisterRequest` is `{ name, email, password }`; `password` follows the
  password rules.
- `User` is `{ id, name, email }`: `id` is a UUID. Strict: any other key
  (such as a password hash) makes it invalid.
- `LogInRequest` is `{ email, password }`; `password` is any non-empty
  string up to 512 JavaScript characters, so a password set under older
  rules can still log in.
- `Session` is `{ token, expiresAt }`: `token` is a JWT; `expiresAt` is an
  ISO 8601 UTC time. Strict.
- `ChangePasswordRequest` is `{ currentPassword, newPassword }`:
  `currentPassword` is like `LogInRequest.password`; `newPassword` follows
  the password rules.
- `VerifyEmailRequest` is `{ token }`: any non-empty string up to 512
  characters; the api decides whether it is a real token.
- `ResendVerificationRequest` is `{ email }`, an `Email`.

### Error modes

| Situation                | Result                              |
| ------------------------ | ----------------------------------- |
| `parse` on bad input     | throws a `ZodError`                 |
| `safeParse` on bad input | returns `{ success: false, error }` |

### Configuration

- None.

## Examples

### UCON-1: RegisterRequest accepts a name, an email and a password that follows the rules

- **Input:** `{ name: "Ada Lovelace", email: "ada@example.com", password: "correct horse battery" }`
- **Expected:** valid

### UCON-2: RegisterRequest rejects bad emails

- **Input:** email `"ada"`, `"ada@"`, `"@example.com"` or `""`
- **Expected:** invalid

### UCON-3: RegisterRequest enforces the password length limits

- **Input:** ASCII passwords of 14, 15, 128 and 129 characters
- **Expected:** invalid, valid, valid, invalid

### UCON-4: RegisterRequest rejects a missing field

- **Input:** the UCON-1 body without `name`, without `email`, and without
  `password`
- **Expected:** invalid each time

### UCON-5: User rejects a body with extra keys

- **Input:** `{ id: "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f", name: "Ada Lovelace", email: "ada@example.com" }`,
  and the same with `passwordHash: "x"` added
- **Expected:** valid; invalid

### UCON-6: LogInRequest accepts a short password but not an empty one

- **Input:** password `"short"`; password `""`
- **Expected:** valid; invalid

### UCON-7: Session needs a JWT and an ISO time

- **Input:** `{ token: <a JWT>, expiresAt: "2026-11-28T12:00:00.000Z" }`;
  the same with `token: "not-a-jwt"`; the same with `expiresAt: "tomorrow"`
- **Expected:** valid; invalid; invalid

### UCON-8: ChangePasswordRequest applies the password rules to the new password only

- **Input:** `currentPassword: "short"` with a 15-character `newPassword`;
  `currentPassword: "correct horse battery"` with a 14-character
  `newPassword`
- **Expected:** valid; invalid

### UCON-10: RegisterRequest trims the name and enforces its length

- **Input:** name `"  Ada Lovelace  "`; `""`; `"   "`; 100 `"a"`s; 101
  `"a"`s
- **Expected:** valid with name `"Ada Lovelace"`; invalid; invalid; valid;
  invalid

### UCON-11: Password length counts code points, not JavaScript characters

- **Input:** passwords of 15, 128 and 129 copies of `"🔑"` (each is two
  JavaScript characters); 14 copies
- **Expected:** valid, valid, invalid; invalid

### UCON-12: VerifyEmailRequest needs a non-empty token

- **Input:** `{ token: "abc" }`; `{ token: "" }`; `{}`; a 513-character
  token
- **Expected:** valid; invalid; invalid; invalid

### UCON-13: ResendVerificationRequest needs an email

- **Input:** `{ email: "ada@example.com" }`; `{ email: "ada" }`; `{}`
- **Expected:** valid; invalid; invalid

## Invariants

### UCON-9: Length alone decides whether a password follows the rules

For every string, `PasswordSchema` accepts it exactly when it has 15 to
128 code points.

## Open questions

- None. Password rules answered by Temitope on 2026-11-27 (see
  `specs/product/users.md`).
