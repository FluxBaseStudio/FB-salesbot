"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import BotSellerLogo from "@/components/brand/BotSellerLogo";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/client-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Nieprawidłowe dane logowania.");
      window.location.replace("/client");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieprawidłowe dane logowania.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-backdrop" aria-hidden="true" />
      <form className="login-panel" onSubmit={login}>
        <div className="login-brand">
          <BotSellerLogo variant="sidebar" />
          <span>Panel klienta</span>
        </div>
        <div className="login-copy">
          <h1>Witaj z powrotem</h1>
          <p>Status kampanii, wysłane wiadomości, leady i abonament w jednym miejscu.</p>
        </div>
        {error ? <div className="notice danger">{error}</div> : null}
        <label className="field">
          <span>Email / login</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Hasło</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="button primary login-submit" type="submit" disabled={loading}>
          {loading ? "Logowanie..." : "Zaloguj się"}
        </button>
        <p className="login-security-note">
          Sesja wygasa automatycznie po godzinie bezczynności. Dla bezpieczeństwa wyloguj się po zakończeniu pracy.
        </p>
        <p className="login-footer-link">
          Nie masz jeszcze konta? <Link href="/botseller">Załóż własnego SalesBota</Link>
        </p>
      </form>
    </main>
  );
}
