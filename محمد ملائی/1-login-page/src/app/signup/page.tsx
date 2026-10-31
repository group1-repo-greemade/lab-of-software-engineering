"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

export default function SignupPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <main className="page-shell">
      <section className="login-card" aria-labelledby="signup-title">
        <header className="login-header">
          <Link className="brand" href="/" aria-label="Muhmol home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2.75 14.5 9.5 21.25 12l-6.75 2.5L12 21.25 9.5 14.5 2.75 12 9.5 9.5 12 2.75Z" fill="currentColor" />
              </svg>
            </span>
            <span>muhmol</span>
          </Link>
          <p className="eyebrow"><span className="eyebrow-dot" /> CREATE YOUR ACCOUNT</p>
          <h1 id="signup-title">Join Muhmol</h1>
          <p className="login-description">Create an account to get started with your workspace.</p>
        </header>
        <form
          className="login-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            setIsSubmitting(true);
            const form = event.currentTarget;

            try {
              if (!captchaToken) {
                setMessage("Please complete the CAPTCHA before creating your account.");
                return;
              }

              const formData = new FormData(form);
              const password = String(formData.get("password"));
              const confirmPassword = String(formData.get("confirmPassword"));

              if (password !== confirmPassword) {
                setMessage("The passwords do not match. Please enter them again.");
                return;
              }

              const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fullName: String(formData.get("fullName")).trim(),
                  email: String(formData.get("email")).trim(),
                  username: String(formData.get("username")).trim(),
                  password,
                  captchaToken,
                }),
              });
              const result: { error?: string } = await response.json();
              if (!response.ok) throw new Error(result.error || "Unable to create your account.");

              router.push("/account-created/");
            } catch (error) {
              turnstileRef.current?.reset();
              setCaptchaToken("");
              setMessage(error instanceof Error ? error.message : "Unable to create your account. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="field-group">
            <label htmlFor="fullName">Full name</label>
            <div className="input-with-icon">
              <input id="fullName" name="fullName" type="text" placeholder="Your name" autoComplete="name" maxLength={100} required />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="email">Email address</label>
            <div className="input-with-icon">
              <input id="email" name="email" type="email" placeholder="name@company.com" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="username">Username</label>
            <div className="input-with-icon">
              <input id="username" name="username" type="text" placeholder="Choose a username" autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" title="Use 3–24 letters, numbers, or underscores." required />
            </div>
            <span className="field-hint">3–24 letters, numbers, or underscores.</span>
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <input id="password" name="password" type="password" placeholder="At least 12 characters" autoComplete="new-password" minLength={12} maxLength={128} required />
            </div>
            <span className="field-hint">Use at least 12 characters.</span>
          </div>
          <div className="field-group">
            <label htmlFor="confirmPassword">Enter password again</label>
            <div className="input-with-icon">
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter your password" autoComplete="new-password" minLength={12} maxLength={128} required />
            </div>
          </div>
          <div className="captcha-field">
            {turnstileSiteKey ? (
              <Turnstile
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setCaptchaError("");
                }}
                onExpire={() => setCaptchaToken("")}
                onError={() => {
                  setCaptchaToken("");
                  setCaptchaError("CAPTCHA could not load. Refresh the page and try again.");
                }}
                options={{ theme: "light", size: "flexible" }}
              />
            ) : (
              <p className="captcha-error" role="alert">
                CAPTCHA is not configured. Add the Turnstile site key to enable sign-up.
              </p>
            )}
            {captchaError && <p className="captcha-error" role="alert">{captchaError}</p>}
          </div>
          <button className="submit-button" type="submit" disabled={isSubmitting || !captchaToken}>
            <span>{isSubmitting ? "Creating account..." : "Create account"}</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="form-message" role="status" aria-live="polite">{message}</p>
        </form>
        <div className="signup-section">
          <p>Already have an account?</p>
          <Link className="signup-button" href="/">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
