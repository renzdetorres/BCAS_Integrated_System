import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Mail, Lock } from "lucide-react";
import { registerApplicant, ApiError } from "../api/authApi.js";
import AuthShell from "../components/auth/AuthShell.jsx";
import AuthField from "../components/auth/AuthField.jsx";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  agreeToTerms: false,
};

function splitFullName(fullName) {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { firstName: trimmed, lastName: trimmed };
  return { firstName: trimmed.slice(0, spaceIndex), lastName: trimmed.slice(spaceIndex + 1) };
}

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState(null);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (!form.agreeToTerms) {
      setErrorMessage("You must agree to the Terms and Conditions.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { firstName, lastName } = splitFullName(form.fullName);
      const result = await registerApplicant({
        firstName,
        lastName,
        email: form.email.trim(),
        password: form.password,
      });
      setRegisteredEmail(result.email);
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <AuthShell>
        <h1 className="text-2xl font-extrabold text-slate-900">Registration complete</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your applicant account for <strong className="text-slate-700">{registeredEmail}</strong> has
          been created. You can now log in.
        </p>
        <Link
          to="/login"
          className="mt-6 block w-full rounded-lg bg-forest py-2.5 text-center text-sm font-semibold text-white hover:bg-forest-dark"
        >
          Go to login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Create Your Account</h1>
      <p className="mt-1 text-sm text-slate-500">Fill in the details below to register</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <AuthField
            icon={User}
            id="fullName"
            name="fullName"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email Address
          </label>
          <AuthField
            icon={Mail}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <AuthField
            icon={Lock}
            isPassword
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
            Confirm Password
          </label>
          <AuthField
            icon={Lock}
            isPassword
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={form.agreeToTerms}
            onChange={handleChange}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-forest focus:ring-forest"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" className="font-medium text-forest underline">
              Terms and Conditions
            </Link>
          </span>
        </label>

        {errorMessage && (
          <p className="text-sm font-medium text-status-red" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-forest py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-dark disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-forest hover:underline">
          Login here
        </Link>
      </p>
    </AuthShell>
  );
}
