import { RegisterRequestSchema } from "@repo/contracts";

/** A message for each register form field that is not valid. */
export interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
}

const messages = {
  name: "Enter a name of 1 to 100 characters.",
  email: "Enter a valid email address.",
  password: "A password has 15 to 128 characters.",
} as const;

/** Checks the register form. See specs/modules/web-forms.md. */
export function registerErrors(values: {
  name: string;
  email: string;
  password: string;
}): RegisterErrors {
  const result = RegisterRequestSchema.safeParse(values);
  if (result.success) {
    return {};
  }
  const errors: RegisterErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field === "name" || field === "email" || field === "password") {
      errors[field] = messages[field];
    }
  }
  return errors;
}
