---
id: WEB
status: draft
contracts:
  [
    ApiError,
    RegisterRequest,
    User,
    LogInRequest,
    Session,
    VerifyEmailRequest,
    ResendVerificationRequest,
  ]
---

# Web app: register, verify, log in, log out

## Why

People need a page in the browser to create an account, verify their
email, log in and log out, instead of calling the api by hand. After logging in they see a
welcome page with their name. It is the first frontend app, `apps/web`,
and it uses the api only through the routes in `specs/product/users.md`.

## Requirements

A **visitor** is someone using the web app in a browser. The pages are
`/register`, `/verify-email`, `/login` and `/` (the welcome page).
Tests run the web app and the api on different origins
(`specs/product/web-access.md`) and read emails from Mailpit. Labels, headings,
buttons and messages are quoted exactly; tests find elements by their
role and accessible name.

### WEB-1: A visitor can register and is asked to check their email

- **Given** no account exists for a fresh email
- **When** a visitor opens `/register`, fills in "Name" with
  `Ada Lovelace`, "Email" with that email and "Password" with
  `correct horse battery`, and presses "Create account"
- **Then** they see the heading "Check your email" and the text
  "We sent a link to <email>. Open it to verify your email.", and one
  verification email reaches that address (VERIFY-1)

### WEB-2: Registering a taken email says so

- **Given** an account exists for an email
- **When** a visitor registers that email again, in upper case
- **Then** they stay on `/register` and see the alert
  "An account with this email already exists."

### WEB-3: The register form checks the fields before sending

- **Given** the visitor is on `/register`
- **When** they press "Create account" with a blank name, the email `ada`
  and a 14-character password
- **Then** they stay on `/register` and see, next to each field,
  "Enter a name of 1 to 100 characters.",
  "Enter a valid email address." and
  "A password has 15 to 128 characters."; no account is created, so
  logging in with that email afterwards fails

### WEB-4: A registered visitor can log in

- **Given** a verified account for `Ada Lovelace` exists
- **When** a visitor opens `/login`, fills in "Email" and "Password" and
  presses "Log in"
- **Then** they are on `/` and see the heading "Welcome, Ada Lovelace"

### WEB-5: Logging in with wrong credentials does not say which part was wrong

- **Given** an account exists
- **When** a visitor logs in with the right email and a wrong password, or
  with an email that has no account
- **Then** both times they stay on `/login` and see the alert
  "The email or password is wrong."

### WEB-6: A logged-in visitor stays logged in after a reload

- **Given** a visitor has logged in and sees the welcome page
- **When** they reload the page
- **Then** they still see "Welcome, Ada Lovelace"

### WEB-7: A visitor can log out

- **Given** a visitor is logged in and on `/`
- **When** they press "Log out"
- **Then** they are on `/login`, and opening `/` again shows the login
  form, not the welcome page

### WEB-8: The welcome page needs a logged-in visitor

- **Given** a visitor who has not logged in
- **When** they open `/`
- **Then** they are sent to `/login` and see the heading "Log in"

### WEB-9: Logging out in one browser logs out the others

- **Given** the same account is logged in in two browsers, A and B
- **When** the visitor presses "Log out" in A and then reloads `/` in B
- **Then** B is sent to `/login` (logging out ends every session,
  USER-13)

### WEB-10: A failing api shows a general error

- **Given** a visitor is on `/login` and the api answers
  `POST /sessions` with status `500`
- **When** they log in
- **Then** they stay on `/login` and see the alert
  "Something went wrong. Try again."

### WEB-11: Opening the link verifies the email

- **Given** a visitor registered and got the email
- **When** they open its link
- **Then** they see the heading "Your email is verified" and a link
  "Log in"; following it and logging in shows "Welcome, Ada Lovelace"

### WEB-12: A used or broken link says so

- **Given** a link that was already used, or `/verify-email?token=nope`
- **When** a visitor opens it
- **Then** they see the alert "This link is not valid. Ask for a new one
  by logging in."

### WEB-13: Logging in before verifying offers a new link

- **Given** a visitor registered and has not opened the link
- **When** they log in with the right email and password
- **Then** they stay on `/login` and see the alert
  "Verify your email first. We sent you a link." and a button
  "Send the link again"; pressing it shows "We sent a new link." and a
  second email reaches the address

## Out of scope

- Changing the password in the web app.
- Password reset, email verification, "remember me" choices.
- Styling beyond a plain, readable form.
- Hosting the built web app; any static host works (see `web.md`).

## Safeguards

- The web app never logs or shows the password or the token: no test can
  prove a value is absent from every log line.

## Open questions

Answered by Temitope, 2026-11-28:

- Registering does not log the visitor in. It sends a verification link;
  the visitor opens it, then logs in.
- Bearer tokens, not cookies, so the web app and the api can be on
  different origins (`web-access.md`).

Proposed answers, approved with this spec:

- The session (token and `expiresAt`) is kept in the browser's
  `localStorage`, so it survives a reload and closing the tab until it
  expires. The trade-off: script injected into the page could read it, so
  the web app adds no third-party scripts.
