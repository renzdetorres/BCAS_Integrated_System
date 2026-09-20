import { useState } from "react";
import { provisionStaff, STAFF_ROLES, DEPARTMENT_OPTIONS } from "../api/adminApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import "./ProvisionStaffPage.css";

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
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout title="Provision Staff">
      <Card className="provision-card">
        <p className="provision-subtitle">
          Admin-only. Applicant accounts are never created here - applicants self-register.
        </p>

        {createdAccount && (
          <p className="form-success" role="status">
            Created <strong>{createdAccount.email}</strong> as {createdAccount.role}. They can log in
            immediately.
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={form.firstName}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={form.lastName}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label htmlFor="password">Temporary password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" value={form.role} onChange={handleChange}>
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {form.role === "AcademicHead" && (
            <div className="form-row">
              <label htmlFor="department">Department</label>
              <select id="department" name="department" value={form.department} onChange={handleChange}>
                <option value="">Select a department</option>
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          )}

          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </Card>
    </AppLayout>
  );
}
