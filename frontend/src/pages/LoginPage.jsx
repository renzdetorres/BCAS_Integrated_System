import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { loginUser, ApiError } from "../api/authApi.js";
import { useSession } from "../context/SessionContext.jsx";
import AuthShell from "../components/auth/AuthShell.jsx";
import AuthField from "../components/auth/AuthField.jsx";

const initialForm = { email: "", password: "" };

export default function LoginPage() {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session, isLoading, setSession } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session) {
      navigate("/portal", { replace: true });
    }
  }, [isLoading, session, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await loginUser(form);
      setSession(user);
      navigate("/portal", { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Welcome Back!</h1>
      <p className="mt-1 text-sm text-slate-500">Please log in to your applicant account</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
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
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-forest hover:underline">
              Forgot Password?
            </Link>
          </div>
          <AuthField
            icon={Lock}
            isPassword
            id="password"
            name="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange}
          />
        </div>

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
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-forest hover:underline">
          Register here
        </Link>
      </p>
    </AuthShell>
  );
}
