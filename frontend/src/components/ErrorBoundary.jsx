import { Component } from "react";
import BcasSeal from "./ui/BcasSeal.jsx";
import "./ErrorBoundary.css";

/**
 * Catches a crash while rendering any page so the person sees a way forward
 * instead of a blank white screen.
 */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="error-screen" role="alert">
        <div className="error-screen-card">
          <BcasSeal size={44} />
          <h1>Something went wrong</h1>
          <p>
            This page hit a problem and couldn't load. Your saved work is safe. Reload the page, or go back to
            your dashboard.
          </p>
          <div className="error-screen-actions">
            <button type="button" className="auth-submit" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a className="error-screen-link" href="/portal">
              Go to dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }
}
