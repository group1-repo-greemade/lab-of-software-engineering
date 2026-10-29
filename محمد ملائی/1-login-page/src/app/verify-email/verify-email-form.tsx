"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function VerifyEmailForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function verifyEmail() {
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result: { role?: "user" | "admin"; error?: string } = await response.json();
      if (!response.ok || !result.role) throw new Error(result.error || "Unable to verify your email.");
      router.replace(result.role === "admin" ? "/admin/" : "/account/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to verify your email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="login-card confirmation-card" aria-labelledby="verify-title">
        <Link className="brand" href="/" aria-label="Muhmol home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2.75 14.5 9.5 21.25 12l-6.75 2.5L12 21.25 9.5 14.5 2.75 12 9.5 9.5 12 2.75Z" fill="currentColor" />
            </svg>
          </span>
          <span>muhmol</span>
        </Link>
        <p className="eyebrow"><span className="eyebrow-dot" /> EMAIL VERIFICATION</p>
        <h1 id="verify-title">Verify your email</h1>
        <p className="confirmation-description">Confirm your email address to activate your account and securely sign in.</p>
        <button className="submit-button confirmation-submit" type="button" onClick={verifyEmail} disabled={!token || isSubmitting}>
          <span>{isSubmitting ? "Verifying..." : "Verify email and continue"}</span>
        </button>
        <p className="form-message" role="status" aria-live="polite">
          {message || (!token ? "This verification link is missing or expired. Please sign up again." : "")}
        </p>
      </section>
    </main>
  );
}
