---
id: WFORM
status: draft
contracts: [RegisterRequest]
---

# Web form checks

Where it lives: `apps/web/src/forms.ts`

## Purpose

Checks the register form in the browser before it is sent, and gives the
message to show next to each field, so the visitor finds mistakes without
a round trip. The api checks again (USER-3); this module only spares the
visitor a request.

## Interface

### Exports

| Export           | Kind     | Summary                                                       |
| ---------------- | -------- | ------------------------------------------------------------- |
| `registerErrors` | function | `registerErrors({ name, email, password })`: `RegisterErrors` |
| `RegisterErrors` | type     | `{ name?: string, email?: string, password?: string }`        |

Inputs are the raw strings from the form. The result has a message for
each field that the `RegisterRequest` contract rejects, and no key for a
field it accepts:

| Field      | Message                                  |
| ---------- | ---------------------------------------- |
| `name`     | `"Enter a name of 1 to 100 characters."` |
| `email`    | `"Enter a valid email address."`         |
| `password` | `"A password has 15 to 128 characters."` |

### Error modes

- None: it returns messages, it does not throw.

### Configuration

- None.

## Examples

### WFORM-1: A valid form has no messages

- **Input:** `{ name: "Ada Lovelace", email: "ada@example.com", password: "correct horse battery" }`
- **Expected:** `{}`

### WFORM-2: Each bad field gets its message

- **Input:** `{ name: "  ", email: "ada", password: "p".repeat(14) }`
- **Expected:** all three messages, under `name`, `email` and `password`

### WFORM-3: Only the bad field gets a message

- **Input:** a valid form with the name `"a".repeat(101)`; then with the
  password `"p".repeat(129)`
- **Expected:** `{ name: <name message> }`; `{ password: <password message> }`

### WFORM-4: Password length counts characters, not code units

- **Input:** a valid form with the password `"🔑".repeat(15)`
- **Expected:** `{}`

## Invariants

### WFORM-5: Any form within the rules has no messages

For every name of 1 to 100 non-space characters (after trimming), every
email built as `<letters>@<letters>.<2 to 6 letters>`, and every password
of 15 to 128 characters, the result is `{}`.

## Safeguards

- None.

## Open questions

- None.
