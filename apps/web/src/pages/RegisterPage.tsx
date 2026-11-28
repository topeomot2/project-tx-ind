import { useState, type SyntheticEvent } from "react";
import type { ApiClient } from "../client.ts";
import { registerErrors, type RegisterErrors } from "../forms.ts";
import { navigate } from "../navigation.ts";
import { somethingWentWrong } from "./messages.ts";

type Field = keyof RegisterErrors;

const labels: Record<Field, string> = {
  name: "Name",
  email: "Email",
  password: "Password",
};
const types: Record<Field, string> = {
  name: "text",
  email: "email",
  password: "password",
};

export function RegisterPage({ client }: { client: ApiClient }) {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [alert, setAlert] = useState<string | undefined>();
  const [sentTo, setSentTo] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    setAlert(undefined);
    const found = registerErrors(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setBusy(true);
    try {
      const result = await client.register(values);
      if (result.ok) {
        setSentTo(result.value.email);
      } else if (result.code === "email_taken") {
        setAlert("An account with this email already exists.");
      } else {
        setAlert("Check the fields and try again.");
      }
    } catch {
      setAlert(somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  if (sentTo !== undefined) {
    return (
      <section>
        <h1>Check your email</h1>
        <p>We sent a link to {sentTo}. Open it to verify your email.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Create an account</h1>
      <form onSubmit={(event) => void submit(event)} noValidate>
        {(Object.keys(labels) as Field[]).map((field) => (
          <div className="field" key={field}>
            <label htmlFor={field}>{labels[field]}</label>
            <input
              id={field}
              name={field}
              type={types[field]}
              autoComplete={field === "password" ? "new-password" : field}
              value={values[field]}
              aria-invalid={errors[field] !== undefined}
              aria-describedby={
                errors[field] === undefined ? undefined : `${field}-error`
              }
              onChange={(event) => {
                setValues({ ...values, [field]: event.target.value });
              }}
            />
            {errors[field] === undefined ? null : (
              <p className="error" id={`${field}-error`}>
                {errors[field]}
              </p>
            )}
          </div>
        ))}
        {alert === undefined ? null : <p role="alert">{alert}</p>}
        <button type="submit" disabled={busy}>
          Create account
        </button>
      </form>
      <p>
        Have an account?{" "}
        <a
          href="/login"
          onClick={(event) => {
            event.preventDefault();
            navigate("/login");
          }}
        >
          Log in
        </a>
      </p>
    </section>
  );
}
