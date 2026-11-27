/**
 * Password hashing. Stub: the implementation follows specs/modules/password.md.
 */

/** A salted scrypt hash of the password, safe to store. */
export const hashPassword: (password: string) => Promise<string> = () =>
  Promise.reject(new Error("NotImplemented"));

/** True if the password matches the hash. Never throws. */
export const verifyPassword: (
  password: string,
  hash: string,
) => Promise<boolean> = () => Promise.reject(new Error("NotImplemented"));
