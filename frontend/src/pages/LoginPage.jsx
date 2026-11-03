import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, ApiError } from "../api/authApi.js";
import { useSession } from "../context/SessionContext.jsx";
import AuthShowcase from "../components/auth/AuthShowcase.jsx";
import Icon from "../components/ui/Icon.jsx";
import BcasSeal from "../components/ui/BcasSeal.jsx";
import BootScreen from "../components/BootScreen.jsx";
import { markSessionStart } from "../utils/sessionClock.js";
import "../components/auth/AuthForm.css";
import "./LoginPage.css";

const REMEMBERED_EMAIL_KEY = "bcas.login.email";

// Only the email is remembered, never the password.
function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeRememberedEmail(email) {
  try {
    if (email) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Storage blocked (private window): signing in still works, it just isn't remembered.
  }
}

export default function LoginPage() {
  const [rememberedEmail] = useState(readRememberedEmail);
  const [form, setForm] = useState({ email: rememberedEmail, password: "" });
  const [remember, setRemember] = useState(Boolean(rememberedEmail));
  const passwordRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { session, isLoading, setSession } = useSession();
  const navigate = useNavigate();

  // Already signed in (e.g. navigated here directly) - go straight to the portal.
  useEffect(() => {
    if (!isLoading && session) {
      navigate("/portal", { replace: true });
    }
  }, [isLoading, session, navigate]);

  // With the email already filled in, start on the password.
  const showForm = !isLoading && !session;
  useEffect(() => {
    if (showForm && rememberedEmail) passwordRef.current?.focus();
  }, [showForm, rememberedEmail]);

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
      markSessionStart();
      writeRememberedEmail(remember ? form.email.trim() : "");
      setSession(user);
      navigate("/portal", { replace: true });
    } catch (error) {
      // Same generic message regardless of whether the email exists,
      // mirroring the API's no-enumeration behavior.
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || session) {
    return <BootScreen />;
  }

  return (
    <main className="auth-page login-page">
      <div className="auth-shell">
        <AuthShowcase />

        <section className="auth-form-side login-side">
          {/* The panel's curved left edge over the photo: a pale green band that opens into a leaf at the
              top, then white. The corner circles, mountains and soft hill are decoration only, so
              all of it is hidden from screen readers. */}
          <div className="login-fill" aria-hidden="true" />
          <svg className="login-edge" viewBox="0 0 260 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="login-band" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#d3ecdc" />
                <stop offset="1" stopColor="#eef8f1" />
              </linearGradient>
              <linearGradient id="login-white" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e8f5ec" />
                <stop offset="0.26" stopColor="#f6fbf8" />
                <stop offset="0.48" stopColor="#ffffff" />
              </linearGradient>
              <filter id="login-edge-shadow" x="-20%" y="-5%" width="140%" height="110%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
            </defs>
            <path d="M150 0H3000V1000H82C44 820 22 640 17 450C16 300 24 190 80 100C108 56 135 22 150 0Z" transform="translate(-9 0)" fill="#06240f" opacity="0.34" filter="url(#login-edge-shadow)" />
            <path d="M41 0C22 40 10 200 8 450C7 640 30 820 73 1000H82C44 820 22 640 17 450C16 300 24 190 80 100C108 56 135 22 150 0Z" fill="url(#login-band)" />
            <path d="M150 0H3000V1000H82C44 820 22 640 17 450C16 300 24 190 80 100C108 56 135 22 150 0Z" fill="url(#login-white)" />
          </svg>
          <div className="login-deco" aria-hidden="true">
            <svg className="login-deco-top" viewBox="0 0 300 300" focusable="false">
              <circle cx="236" cy="64" r="170" fill="#e4f3e9" />
              <circle cx="268" cy="92" r="108" fill="#d6ecde" />
            </svg>
            <svg className="login-deco-bottom" viewBox="0 0 600 170" preserveAspectRatio="none" focusable="false">
              <defs>
                <linearGradient id="login-range-back" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#d6eadd" />
                  <stop offset="1" stopColor="#f3faf5" />
                </linearGradient>
                <linearGradient id="login-wave-1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#e0f2e7" stopOpacity="0" />
                  <stop offset="0.22" stopColor="#e0f2e7" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="login-wave-2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#cbe8d6" stopOpacity="0" />
                  <stop offset="0.22" stopColor="#cbe8d6" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="login-wave-3" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#b6dcc4" stopOpacity="0" />
                  <stop offset="0.22" stopColor="#b6dcc4" stopOpacity="1" />
                </linearGradient>
              </defs>
              <path d="M170 170L226 96L262 128L330 58L384 112L430 80L500 138L600 92V170Z" fill="url(#login-range-back)" />
              <path d="M0 170V122C90 102 170 142 270 128C390 110 470 72 600 90V170Z" fill="url(#login-wave-1)" />
              <path d="M0 170V140C110 120 200 158 310 144C420 130 500 106 600 116V170Z" fill="url(#login-wave-2)" />
              <path d="M0 170V158C130 142 240 172 360 160C460 150 530 138 600 142V170Z" fill="url(#login-wave-3)" />
            </svg>
          </div>

          <div className="auth-form-panel login-panel">
            <div className="auth-mobile-brand">
              <BcasSeal size={28} />
              BCAS
            </div>

            <div className="login-hero">
              <svg className="login-cap" viewBox="0 0 72 52" width="72" height="52" aria-hidden="true" focusable="false">
                <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M36 4 68 18 36 32 4 18Z" />
                  <path d="M18 27v13c0 6 8 10 18 10s18-4 18-10V27" />
                  <path d="M62 22v16" />
                </g>
                <circle cx="62" cy="41.5" r="3.4" fill="currentColor" />
              </svg>
              <h1>Welcome back</h1>
              <p className="auth-subtitle">Sign in to continue to your application.</p>
              <span className="login-rule" aria-hidden="true" />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label htmlFor="email" className="login-label">Email</label>
                <div className="input-with-icon">
                  <Icon name="mail" size={18} className="input-icon" />
                  <input placeholder="Enter your email address"
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="input-group has-aside-link">
                <label htmlFor="password" className="login-label">Password</label>
                <div className="input-with-icon has-toggle">
                  <Icon name="lock" size={18} className="input-icon" />
                  <input placeholder="Enter your password"
                    id="password"
                    name="password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((show) => !show)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                  </button>
                </div>
                {/* Placed after the input so Tab goes email -> password -> toggle -> link;
                    CSS positions it beside the label. */}
                <Link className="input-group-aside-link" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember this email
              </label>

              {errorMessage && (
                <p className="form-error" role="alert">
                  {errorMessage}
                </p>
              )}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
                {isSubmitting ? "Signing in..." : "Log In"}
              </button>
            </form>

            <p className="auth-switch">
              Need an account? <Link to="/register">Register</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
