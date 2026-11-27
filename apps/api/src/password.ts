/**
 * Password hashing with scrypt from node:crypto. See specs/modules/password.md.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

interface Settings {
  N: number;
  r: number;
  p: number;
}

/** An OWASP-listed setting: about 32 MiB of work per hash. */
const current: Settings = { N: 2 ** 15, r: 8, p: 3 };
const saltBytes = 16;
const keyBytes = 32;

function derive(
  password: string,
  salt: Buffer,
  { N, r, p }: Settings,
  length: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      Buffer.from(password, "utf16le"),
      salt,
      length,
      { N, r, p, maxmem: 256 * N * r },
      (error, key) => {
        if (error === null) {
          resolve(key);
        } else {
          reject(error);
        }
      },
    );
  });
}

/** A salted scrypt hash of the password, safe to store. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltBytes);
  const key = await derive(password, salt, current, keyBytes);
  const { N, r, p } = current;
  return [
    "scrypt",
    String(N),
    String(r),
    String(p),
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/** True if the password matches the hash. Never throws. */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const [scheme, N, r, p, salt, key, ...rest] = hash.split("$");
  if (
    scheme !== "scrypt" ||
    N === undefined ||
    r === undefined ||
    p === undefined ||
    salt === undefined ||
    key === undefined ||
    rest.length > 0
  ) {
    return false;
  }
  const expected = Buffer.from(key, "base64");
  const settings = { N: Number(N), r: Number(r), p: Number(p) };
  if (expected.length === 0) {
    return false;
  }
  try {
    const actual = await derive(
      password,
      Buffer.from(salt, "base64"),
      settings,
      expected.length,
    );
    return timingSafeEqual(actual, expected);
  } catch {
    // Settings scrypt refuses: not a hash hashPassword made.
    return false;
  }
}
