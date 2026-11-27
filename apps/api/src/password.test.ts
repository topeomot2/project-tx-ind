import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.ts";

describe("password hashing", () => {
  it("PWD-1: a password verifies against its own hash", async () => {
    const hash = await hashPassword("correct horse battery");

    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
  });

  it("PWD-2: a different password does not verify", async () => {
    const hash = await hashPassword("correct horse battery");

    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  it("PWD-3: the hash does not hold the password, and is salted", async () => {
    const first = await hashPassword("correct horse battery");
    const second = await hashPassword("correct horse battery");

    expect(first).not.toContain("correct horse battery");
    expect(second).not.toContain("correct horse battery");
    expect(first).not.toBe(second);
  });

  it.each(["", "not a hash", "scrypt$1$2$3$x$y"])(
    "PWD-4: the malformed hash %j does not verify, and does not throw",
    async (hash) => {
      expect(await verifyPassword("correct horse battery", hash)).toBe(false);
    },
  );

  it("PWD-7: an accent written two ways matches", async () => {
    const hash = await hashPassword("café au lait please");

    expect(await verifyPassword("café au lait please", hash)).toBe(true);
  });

  it("PWD-7: a ligature matches the letters it stands for", async () => {
    const hash = await hashPassword("ﬁrst password here");

    expect(await verifyPassword("first password here", hash)).toBe(true);
  });
});
