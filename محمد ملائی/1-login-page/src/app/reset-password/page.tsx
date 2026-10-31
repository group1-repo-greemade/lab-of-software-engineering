"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  return (
    <main className="page-shell">
      <section className="login-card" aria-labelledby="reset-password-title">
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
          <h1 id="reset-password-title">{isComplete ? "Password updated" : "Choose a new password"}</h1>
          <p className="login-description">
            {isComplete
              ? "Your password has been changed. Sign in with your new password."
              : "Use at least 12 characters for your new password."}
          </p>
        </header>
        {isComplete ? (
          <Link className="submit-button confirmation-submit" href="/">
            <span>Back to sign in</span>
          </Link>
        ) : <form
          className="login-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            setIsSubmitting(true);

            try {
              const formData = new FormData(event.currentTarget);
              const password = String(formData.get("password"));
              if (password !== String(formData.get("confirmPassword"))) {
                throw new Error("The passwords do not match. Please enter them again.");
              }

              const token = new URLSearchParams(window.location.search).get("token");
              if (!token) throw new Error("This reset link is invalid or expired. Request a new one.");
              const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
              });
              const result: { error?: string } = await response.json();
              if (!response.ok) throw new Error(result.error || "Unable to update your password.");
              setIsComplete(true);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Unable to update your password.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="field-group">
            <label htmlFor="password">New password</label>
            <div className="input-with-icon">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <div className="input-with-icon">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </div>
          </div>
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            <span>{isSubmitting ? "Updating password..." : "Update password"}</span>
          </button>
          <p className="form-message" role="status" aria-live="polite">{message}</p>
        </form>}
      </section>
    </main>
  );
}
