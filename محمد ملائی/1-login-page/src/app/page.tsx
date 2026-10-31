"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="page-shell">
      <section className="login-card" aria-labelledby="login-title">
        <header className="login-header">
          <Link className="brand" href="/" aria-label="Muhmol home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2.75 14.5 9.5 21.25 12l-6.75 2.5L12 21.25 9.5 14.5 2.75 12 9.5 9.5 12 2.75Z" fill="currentColor" />
              </svg>
            </span>
            <span>muhmol</span>
          </Link>
          <p className="eyebrow"><span className="eyebrow-dot" /> WORKSPACE SIGN-IN</p>
          <h1 id="login-title">Welcome back</h1>
          <p className="login-description">Sign in with your Muhmol account to pick up where your team left off.</p>
        </header>
        <form
          className="login-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            setIsSubmitting(true);

            try {
              const formData = new FormData(event.currentTarget);
              const identifier = String(formData.get("identifier")).trim();
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  identifier,
                  password: String(formData.get("password")),
                }),
              });

              const result: { role?: "user" | "admin"; error?: string } = await response.json();
              if (!response.ok || !result.role) throw new Error(result.error || "Unable to sign in.");
              if (result.role === "admin") {
                router.push("/admin/");
              } else {
                router.push("/account/");
              }
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="field-group">
            <label htmlFor="identifier">Email address or username</label>
            <div className="input-with-icon">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <rect x="2.5" y="4" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="m3.5 5.5 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input id="identifier" name="identifier" type="text" placeholder="name@example.com or username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-input">
              <svg className="password-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <rect x="3.5" y="8.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" required />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                    <path d="M2.5 10s2.7-5 7.5-5 7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                    <path d="M3 3 17 17M8.6 5.2A7 7 0 0 1 10 5c4.8 0 7.5 5 7.5 5a12 12 0 0 1-2 2.4M5.4 5.9C3.5 7.1 2.5 10 2.5 10s2.7 5 7.5 5a7 7 0 0 0 2-.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
            <div className="password-footer">
              <Link className="text-button" href="/forgot-password/">
                Forgot password?
              </Link>
            </div>
          </div>
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="form-message" role="status" aria-live="polite">{message}</p>
        </form>
        <div className="signup-section">
          <p>New to Muhmol?</p>
          <Link
            className="signup-button"
            href="/signup/"
          >
            Create an account
          </Link>
        </div>
        <p className="login-footer">
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 7v4m0-6h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Accounts are securely stored in the workspace database.
        </p>
      </section>
    </main>
  );
}
