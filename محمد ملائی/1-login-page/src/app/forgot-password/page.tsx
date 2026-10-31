"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  return (
    <main className="page-shell">
      <section className="login-card" aria-labelledby="forgot-password-title">
        <header className="login-header">
          <Link className="brand" href="/" aria-label="Muhmol home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2.75 14.5 9.5 21.25 12l-6.75 2.5L12 21.25 9.5 14.5 2.75 12 9.5 9.5 12 2.75Z" fill="currentColor" />
              </svg>
            </span>
            <span>muhmol</span>
          </Link>
          <p className="eyebrow"><span className="eyebrow-dot" /> ACCOUNT RECOVERY</p>
          <h1 id="forgot-password-title">Reset your password</h1>
          <p className="login-description">
            Enter your account email and we’ll send you a secure password reset link.
          </p>
        </header>
        {emailSent ? (
          <p className="admin-message" role="status">
            We’ll send a password reset link if a verified account exists for that email. Check your inbox.
          </p>
        ) : (
          <form
            className="login-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              setIsSubmitting(true);

              try {
                const formData = new FormData(event.currentTarget);
                const email = String(formData.get("email")).trim();
                const response = await fetch("/api/auth/forgot-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                const result: { message?: string; error?: string } = await response.json();
                if (!response.ok) throw new Error(result.error || "Unable to send a password reset email.");
                setEmailSent(true);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Unable to send a password reset email.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <div className="input-with-icon">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                />
              </div>
            </div>
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Sending link..." : "Send reset link"}</span>
            </button>
            <p className="form-message" role="status" aria-live="polite">{message}</p>
          </form>
        )}
        <div className="signup-section">
          <Link className="signup-button" href="/">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
