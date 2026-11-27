/**
 * Password hashing. Stub: the implementation follows specs/modules/password.md.
 */

/** A salted scrypt hash of the password, safe to store. */
export function hashPassword(password: string): Promise<string> {
  void password;
  return Promise.reject(new Error("NotImplemented"));
}

/** True if the password matches the hash. Never throws. */
export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  void password;
  void hash;
  return Promise.reject(new Error("NotImplemented"));
}
