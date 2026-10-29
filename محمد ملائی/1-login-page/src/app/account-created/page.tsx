"use client";

import Link from "next/link";
import { useState } from "react";

export default function AccountCreatedPage() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="page-shell">
      <section className="login-card confirmation-card" aria-labelledby="confirmation-title">
        <Link className="brand" href="/" aria-label="Muhmol home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2.75 14.5 9.5 21.25 12l-6.75 2.5L12 21.25 9.5 14.5 2.75 12 9.5 9.5 12 2.75Z" fill="currentColor" />
            </svg>
          </span>
          <span>muhmol</span>
        </Link>
        <div className="confirmation-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m7 12.5 3.2 3.2L17.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="eyebrow"><span className="eyebrow-dot" /> ONE LAST STEP</p>
        <h1 id="confirmation-title">Check your inbox</h1>
        <p className="confirmation-description">
          Your account has been created. Follow the confirmation link in your email to finish setting it up, then sign in.
        </p>
        <Link className="submit-button confirmation-submit" href="/">
          <span>Sign in to your account</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <p className="confirmation-footer">
          Your account information is securely stored in your workspace.
        </p>
        <form
          className="login-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            setIsSubmitting(true);
            try {
              const formData = new FormData(event.currentTarget);
              const response = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: String(formData.get("email")).trim() }),
              });
              const result: { message?: string; error?: string } = await response.json();
              if (!response.ok) throw new Error(result.error || "Unable to resend the verification email.");
              setMessage(result.message || "Check your inbox for the verification link.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Unable to resend the verification email.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="field-group">
            <label htmlFor="resend-email">Didn’t receive the email? Enter your address to resend it.</label>
            <div className="input-with-icon">
              <input id="resend-email" name="email" type="email" autoComplete="email" required />
            </div>
          </div>
          <button className="text-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Resend verification email"}
          </button>
          <p className="form-message" role="status" aria-live="polite">{message}</p>
        </form>
      </section>
    </main>
  );
}
