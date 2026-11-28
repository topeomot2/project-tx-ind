/** A message for each register form field that is not valid. */
export interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
}

/** Stub: the implementation follows specs/modules/web-forms.md. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub: the implementation uses it
export function registerErrors(_values: {
  name: string;
  email: string;
  password: string;
}): RegisterErrors {
  const notImplemented = (): RegisterErrors => {
    throw new Error("NotImplemented");
  };
  return notImplemented();
}
