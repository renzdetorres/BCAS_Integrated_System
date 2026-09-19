import { useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import { inputClasses, labelClasses, primaryButtonClasses } from "../lib/formStyles.js";
import { provisionStaff, STAFF_ROLES } from "../api/adminApi.js";
import { ApiError } from "../api/apiClient.js";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: STAFF_ROLES[0],
  department: "",
};

export default function ProvisionStaffPage() {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (form.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await provisionStaff(form);
      setCreatedAccount(result);
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Create Staff Account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Admin-only. Applicant accounts are never created here — applicants self-register.
      </p>

      <Card className="mt-6 max-w-xl">
        {createdAccount && (
          <p className="mb-4 text-sm font-medium text-status-green" role="status">
            Created <strong className="font-semibold">{createdAccount.email}</strong> as {createdAccount.role}. They
            can log in immediately.
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClasses} htmlFor="firstName">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className={inputClasses}
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="lastName">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className={inputClasses}
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className={labelClasses} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              required
              className={inputClasses}
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className={labelClasses} htmlFor="password">
              Temporary password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClasses}
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className={labelClasses} htmlFor="role">
              Role
            </label>
            <select id="role" name="role" className={inputClasses} value={form.role} onChange={handleChange}>
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {form.role === "AcademicHead" && (
            <div>
              <label className={labelClasses} htmlFor="department">
                Department
              </label>
              <input
                id="department"
                name="department"
                type="text"
                placeholder="e.g. BSIT"
                className={inputClasses}
                value={form.department}
                onChange={handleChange}
              />
            </div>
          )}

          {errorMessage && (
            <p className="text-sm font-medium text-status-red" role="alert">
              {errorMessage}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </Card>
    </AppShell>
  );
}
