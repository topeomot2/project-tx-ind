---
id: UCON
status: draft
contracts: [RegisterRequest, User, LogInRequest, Session, ChangePasswordRequest]
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

| Export                        | Kind   | Summary                                    |
| ----------------------------- | ------ | ------------------------------------------ |
| `EmailSchema`                 | schema | An email address, at most 254 characters   |
| `PasswordSchema`              | schema | A password that follows the password rules |
| `RegisterRequestSchema`       | schema | Body of `POST /users`                      |
| `UserSchema`                  | schema | A user as the api shows it                 |
| `LogInRequestSchema`          | schema | Body of `POST /sessions`                   |
| `SessionSchema`               | schema | Body of a successful log in                |
| `ChangePasswordRequestSchema` | schema | Body of `PUT /users/me/password`           |

Each schema `XSchema` has a type `X = z.infer<typeof XSchema>`, except
`EmailSchema` and `PasswordSchema`.

- **Password rules** (`PasswordSchema`): 12 to 128 characters, as
  JavaScript counts string length; any characters, no composition rules.
- `RegisterRequest` is `{ email, password }`; `password` follows the
  password rules.
- `User` is `{ id, email }`: `id` is a UUID. Strict: any other key (such
  as a password hash) makes it invalid.
- `LogInRequest` is `{ email, password }`; `password` is 1 to 128
  characters, so a password set under older rules can still log in.
- `Session` is `{ token, expiresAt }`: `token` is an opaque string of at
  least 32 characters; `expiresAt` is an ISO 8601 UTC time. Strict.
- `ChangePasswordRequest` is `{ currentPassword, newPassword }`:
  `currentPassword` is 1 to 128 characters; `newPassword` follows the
  password rules.

### Error modes

| Situation                | Result                              |
| ------------------------ | ----------------------------------- |
| `parse` on bad input     | throws a `ZodError`                 |
| `safeParse` on bad input | returns `{ success: false, error }` |

### Configuration

- None.

## Examples

### UCON-1: RegisterRequest accepts an email and a password that follows the rules

- **Input:** `{ email: "ada@example.com", password: "correct horse battery" }`
- **Expected:** valid

### UCON-2: RegisterRequest rejects bad emails

- **Input:** email `"ada"`, `"ada@"`, `"@example.com"` or `""`
- **Expected:** invalid

### UCON-3: RegisterRequest enforces the password length limits

- **Input:** passwords of 11, 12, 128 and 129 characters
- **Expected:** invalid, valid, valid, invalid

### UCON-4: RegisterRequest rejects a missing field

- **Input:** `{ email: "ada@example.com" }`; `{ password: "correct horse battery" }`
- **Expected:** invalid; invalid

### UCON-5: User rejects a body with extra keys

- **Input:** `{ id: "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f", email: "ada@example.com" }`,
  and the same with `passwordHash: "x"` added
- **Expected:** valid; invalid

### UCON-6: LogInRequest accepts a short password but not an empty one

- **Input:** password `"short"`; password `""`
- **Expected:** valid; invalid

### UCON-7: Session needs a long token and an ISO time

- **Input:** `{ token: <32 characters>, expiresAt: "2026-11-28T12:00:00.000Z" }`;
  the same with a 31-character token; the same with `expiresAt: "tomorrow"`
- **Expected:** valid; invalid; invalid

### UCON-8: ChangePasswordRequest applies the password rules to the new password only

- **Input:** `currentPassword: "short"` with a 12-character `newPassword`;
  `currentPassword: "correct horse battery"` with an 11-character
  `newPassword`
- **Expected:** valid; invalid

## Invariants

### UCON-9: Length alone decides whether a password follows the rules

For every string, `PasswordSchema` accepts it exactly when its length is
from 12 to 128.

## Open questions

- Password rules follow the answer to "password rules" in
  `specs/product/users.md`.
