import { describe, expect, it } from "vitest";
import { registerErrors } from "./forms.ts";

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "correct horse battery",
};
const nameMessage = "Enter a name of 1 to 100 characters.";
const emailMessage = "Enter a valid email address.";
const passwordMessage = "A password has 15 to 128 characters.";

describe("register form checks", () => {
  it("WFORM-1: a valid form has no messages", () => {
    expect(registerErrors(valid)).toEqual({});
  });

  it("WFORM-2: each bad field gets its message", () => {
    const errors = registerErrors({
      name: "  ",
      email: "ada",
      password: "p".repeat(14),
    });

    expect(errors).toEqual({
      name: nameMessage,
      email: emailMessage,
      password: passwordMessage,
    });
  });

  it("WFORM-3: only the bad field gets a message", () => {
    const longName = registerErrors({ ...valid, name: "a".repeat(101) });
    const longPassword = registerErrors({
      ...valid,
      password: "p".repeat(129),
    });

    expect(longName).toEqual({ name: nameMessage });
    expect(longPassword).toEqual({ password: passwordMessage });
  });

  it("WFORM-4: password length counts characters, not code units", () => {
    expect(registerErrors({ ...valid, password: "🔑".repeat(15) })).toEqual({});
  });
});
