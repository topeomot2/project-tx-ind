---
id: PWD
status: approved
contracts: []
---

# Password hashing

Where it lives: `apps/api/src/password.ts`

## Purpose

Turns a password into a string that is safe to store, and checks a
password against one. Knows nothing about users, HTTP or the database.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export           | Kind     | Summary                                                            |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `hashPassword`   | function | `hashPassword(password)`: `Promise<string>`, a salted hash         |
| `verifyPassword` | function | `verifyPassword(password, hash)`: `Promise<boolean>`; never throws |

### Error modes

| Situation                                  | Result                           |
| ------------------------------------------ | -------------------------------- |
| `hash` is not a string `hashPassword` made | `verifyPassword` returns `false` |

### Configuration

- scrypt from `node:crypto`, no new dependency: `N = 2^15`, `r = 8`,
  `p = 3` (an OWASP-listed setting, about 32 MiB per hash), a 16-byte
  random salt, a 32-byte key.
- The hash string carries its own settings and salt, so the settings can
  change later and old hashes still verify. Its exact format is not part
  of the interface.
- Both functions normalize the password with Unicode NFKC before hashing,
  so passwords that look the same but are encoded differently match.

## Examples

### PWD-1: A password verifies against its own hash

- **Input:** `verifyPassword("correct horse battery", await hashPassword("correct horse battery"))`
- **Expected:** `true`

### PWD-2: A different password does not verify

- **Input:** `verifyPassword("correct horse batterY", await hashPassword("correct horse battery"))`
- **Expected:** `false`

### PWD-3: The hash does not hold the password, and is salted

- **Input:** `hashPassword("correct horse battery")`, called twice
- **Expected:** neither result contains `"correct horse battery"`, and the
  two results differ

### PWD-4: A malformed hash does not verify, and does not throw

- **Input:** `verifyPassword("correct horse battery", h)` for `h` of `""`,
  `"not a hash"` and `"scrypt$1$2$3$x$y"`
- **Expected:** `false` each time

### PWD-7: Passwords that differ only in Unicode encoding match

- **Input:** hash `"café au lait please"` written with `é` as one code
  point (U+00E9); verify it written as `e` + U+0301. Hash
  `"\uFB01rst password here"` (the `ﬁ` ligature); verify
  `"first password here"`
- **Expected:** `true` both times

## Invariants

### PWD-5: Every password verifies against its own hash

For every string of 1 to 128 code points, `verifyPassword(p, await hashPassword(p))` is `true`.

### PWD-6: No other password verifies against a hash

For every two different strings `p` and `q` of 1 to 128 code points whose NFKC forms differ,
`verifyPassword(q, await hashPassword(p))` is `false`.

Hashing is slow on purpose, so these two run with few generated inputs
(for example `numRuns: 10`).

## Safeguards

- `verifyPassword` compares hashes in constant time
  (`crypto.timingSafeEqual`): timing tests are not deterministic.

## Open questions

- None. scrypt from `node:crypto` agreed by Temitope on 2026-11-27.
