import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Check } from "lucide-react";
import { loginUser, ApiError } from "../api/authApi.js";
import { useSession } from "../context/SessionContext.jsx";
import AuthShell from "../components/auth/AuthShell.jsx";
import AuthField from "../components/auth/AuthField.jsx";

const ROLES = [
  { key: "Admin", name: "Admin", description: "Registrar — manage applications" },
  { key: "Evaluator", name: "Evaluator", description: "Scholarship eligibility screening" },
  { key: "SupportStaff", name: "Support Staff", description: "Document verification & records" },
];

export default function StaffPortalPage() {
  const [selectedRole, setSelectedRole] = useState("Admin");
  const [form, setForm] = useState({ email: "", password: "" });
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
      <Link to="/login" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-forest">
        <ArrowLeft size={16} />
        Back to Applicant Login
      </Link>

      <h1 className="text-2xl font-extrabold text-slate-900">Staff Portal</h1>
      <p className="mt-1 text-sm text-slate-500">Select your role and log in</p>

      <div className="mt-6 space-y-3">
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.key;
          return (
            <button
              key={role.key}
              type="button"
              onClick={() => setSelectedRole(role.key)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "border-forest bg-forest/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span>
                <span className="block text-sm font-bold text-slate-900">{role.name}</span>
                <span className="block text-xs text-slate-500">{role.description}</span>
              </span>
              {isSelected && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-white">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

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
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
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
          {isSubmitting ? "Logging in..." : "Staff Login"}
        </button>
      </form>
    </AuthShell>
  );
}
