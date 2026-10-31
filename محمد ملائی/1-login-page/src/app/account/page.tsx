"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AccountProfile = {
  full_name: string;
  email: string;
  username: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountProfile | null>(null);
  const [message, setMessage] = useState("Loading your account...");

  useEffect(() => {
    let isActive = true;

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (response.status === 401) {
          router.replace("/");
          return;
        }
        const result: { user?: AccountProfile; error?: string } = await response.json();
        if (!response.ok || !result.user) throw new Error(result.error || "Unable to load your account.");
        if (isActive) {
          setUser(result.user);
          setMessage("");
        }
      } catch (error) {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "Unable to load your account.");
        }
      }
    }

    void loadAccount();
    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleSignOut() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign out.");
      router.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  return (
    <main className="page-shell">
      <section className="login-card account-card" aria-labelledby="account-title">
        <header className="login-header">
          <Link className="brand" href="/" aria-label="Muhmol home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2.75 14.5 9.5 21.25 12l-6.75 2.5L12 21.25 9.5 14.5 2.75 12 9.5 9.5 12 2.75Z" fill="currentColor" />
              </svg>
            </span>
            <span>muhmol</span>
          </Link>
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR MUHMOL SPACE</p>
          <h1 id="account-title">{user ? `Hello, ${user.full_name}!` : "Welcome"}</h1>
          <p className="login-description">We’re glad you’re here. Here’s a quick look at your account details.</p>
        </header>
        {user ? (
          <dl className="account-details">
            <div>
              <dt>Your name</dt>
              <dd>{user.full_name}</dd>
            </div>
            <div>
              <dt>Email address</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{user.username || "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="admin-message" role="status">{message}</p>
        )}
        {user && (
          <>
            <p className="account-security-note">
              <span aria-hidden="true">🔒 </span>
              Your password is kept private and can’t be viewed here.
            </p>
            <button className="submit-button account-signout" type="button" onClick={handleSignOut}>Sign out of your account</button>
          </>
        )}
      </section>
    </main>
  );
}
