import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { emailsTo, linksIn, newestToken, waitForEmails } from "./mail.ts";

// specs/product/web.md: the web app, through the browser. Accounts are set
// up through the api directly, on its own origin (web-access.md).
test.use({ baseURL: process.env["E2E_WEB_URL"] ?? "http://localhost:5173" });
const apiURL = process.env["E2E_API_URL"] ?? "http://localhost:3000";

const name = "Ada Lovelace";
const password = "correct horse battery";

/** A fresh email for each test, so tests never share an account. */
const freshEmail = () => `ada-${randomUUID()}@example.com`;

/** Registers an account through the api, without verifying it. */
async function registerOnly(page: Page, email: string) {
  const response = await page.request.post(`${apiURL}/users`, {
    data: { name, email, password },
  });
  expect(response.status()).toBe(201);
}

/** Registers and verifies an account through the api. */
async function createAccount(page: Page, email: string) {
  await registerOnly(page, email);
  const token = await newestToken(page.request, email);
  const verified = await page.request.post(`${apiURL}/email-verifications`, {
    data: { token },
  });
  expect(verified.status()).toBe(204);
}

async function fillLogIn(page: Page, email: string, withPassword = password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(withPassword);
  await page.getByRole("button", { name: "Log in" }).click();
}

const welcome = (page: Page) =>
  page.getByRole("heading", { name: `Welcome, ${name}` });

test("WEB-1: a visitor can register and is asked to check their email", async ({
  page,
}) => {
  const email = freshEmail();
  await page.goto("/register");

  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await expect(
    page.getByText(`We sent a link to ${email}. Open it to verify your email.`),
  ).toBeVisible();
  expect(await waitForEmails(page.request, email)).toHaveLength(1);
});

test("WEB-2: registering a taken email says so", async ({ page }) => {
  const email = freshEmail();
  await createAccount(page, email);
  await page.goto("/register");

  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email.toUpperCase());
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "An account with this email already exists.",
  );
  await expect(page).toHaveURL(/\/register$/);
});

test("WEB-3: the register form checks the fields before sending", async ({
  page,
}) => {
  await page.goto("/register");
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(apiURL)) {
      sent.push(request.url());
    }
  });

  await page.getByLabel("Name").fill("  ");
  await page.getByLabel("Email").fill("ada");
  await page.getByLabel("Password").fill("p".repeat(14));
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByText("Enter a name of 1 to 100 characters."),
  ).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(
    page.getByText("A password has 15 to 128 characters."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
  expect(sent).toEqual([]);
});

test("WEB-4: a registered visitor can log in", async ({ page }) => {
  const email = freshEmail();
  await createAccount(page, email);

  await fillLogIn(page, email);

  await expect(welcome(page)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("WEB-5: wrong credentials do not say which part was wrong", async ({
  page,
}) => {
  const email = freshEmail();
  await createAccount(page, email);

  await fillLogIn(page, email, "not the password");
  const first = await page.getByRole("alert").textContent();
  await fillLogIn(page, freshEmail());

  expect(first).toBe("The email or password is wrong.");
  await expect(page.getByRole("alert")).toHaveText(
    "The email or password is wrong.",
  );
  await expect(page).toHaveURL(/\/login$/);
});

test("WEB-6: a logged-in visitor stays logged in after a reload", async ({
  page,
}) => {
  const email = freshEmail();
  await createAccount(page, email);
  await fillLogIn(page, email);
  await expect(welcome(page)).toBeVisible();

  await page.reload();

  await expect(welcome(page)).toBeVisible();
});

test("WEB-7: a visitor can log out", async ({ page }) => {
  const email = freshEmail();
  await createAccount(page, email);
  await fillLogIn(page, email);
  await expect(welcome(page)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(welcome(page)).toBeHidden();
});

test("WEB-8: the welcome page needs a logged-in visitor", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("WEB-9: logging out in one browser logs out the others", async ({
  browser,
}) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const email = freshEmail();
  await createAccount(a, email);
  await fillLogIn(a, email);
  await fillLogIn(b, email);
  await expect(welcome(a)).toBeVisible();
  await expect(welcome(b)).toBeVisible();

  await a.getByRole("button", { name: "Log out" }).click();
  await expect(a).toHaveURL(/\/login$/);
  await b.reload();

  await expect(b).toHaveURL(/\/login$/);
  await expect(b.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("WEB-10: a failing api shows a general error", async ({ page }) => {
  await page.route(`${apiURL}/sessions`, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        code: "internal_error",
        message: "Something went wrong.",
      }),
    }),
  );

  await fillLogIn(page, freshEmail());

  await expect(page.getByRole("alert")).toHaveText(
    "Something went wrong. Try again.",
  );
  await expect(page).toHaveURL(/\/login$/);
});

test("WEB-11: opening the link verifies the email", async ({ page }) => {
  const email = freshEmail();
  await registerOnly(page, email);
  const [emailed] = await waitForEmails(page.request, email);
  const link = emailed === undefined ? undefined : linksIn(emailed)[0];

  await page.goto(link?.toString() ?? "/verify-email");

  await expect(
    page.getByRole("heading", { name: "Your email is verified" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Log in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(welcome(page)).toBeVisible();
});

test("WEB-12: a used or broken link says so", async ({ page }) => {
  const email = freshEmail();
  await createAccount(page, email);
  const used = await newestToken(page.request, email);
  const message = "This link is not valid. Ask for a new one by logging in.";

  await page.goto(`/verify-email?token=${encodeURIComponent(used)}`);
  await expect(page.getByRole("alert")).toHaveText(message);
  await page.goto("/verify-email?token=nope");

  await expect(page.getByRole("alert")).toHaveText(message);
});

test("WEB-13: logging in before verifying offers a new link", async ({
  page,
}) => {
  const email = freshEmail();
  await registerOnly(page, email);
  await waitForEmails(page.request, email);

  await fillLogIn(page, email);
  await expect(page.getByRole("alert")).toHaveText(
    "Verify your email first. We sent you a link.",
  );
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Send the link again" }).click();

  await expect(page.getByText("We sent a new link.")).toBeVisible();
  await expect
    .poll(async () => (await emailsTo(page.request, email)).length)
    .toBe(2);
});
