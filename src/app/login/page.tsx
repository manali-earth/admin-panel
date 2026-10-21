"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }
      const next = new URL(window.location.href).searchParams.get("next");
      window.location.assign(next?.startsWith("/") ? next : "/");
    } catch {
      setError("The login request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="auth-kicker">WEBSITE EDITOR</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="auth-intro">Sign in to edit your website. Your changes are only published when you press Save.</p>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
          <label className="auth-show">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-note">This page is private.</p>
      </section>
    </main>
  );
}
