"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      setError("That email and password do not match.");
      setLoading(false);
      return;
    }
    router.replace("/");
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-mark">
          <CalendarDays size={20} />
        </div>
        <p className="kicker">Holibobs</p>
        <h1>Welcome back</h1>
        <p className="login-copy"></p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button login-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
