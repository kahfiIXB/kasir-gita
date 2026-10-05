"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { api, type User } from "@/lib/client";
import Dashboard from "@/app/dashboard";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<"admin" | "cashier">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, role }),
      });
      setUser(data.user);
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tidak dapat masuk.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <main className="loading-screen"><LoaderCircle className="spin" size={28} /><span>Menyiapkan kasir...</span></main>;
  }
  if (user) return <Dashboard user={user} onLogout={() => setUser(null)} />;

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark">G<span>✳</span></div>
        <p className="eyebrow">TOKO ROTI · KASIR</p>
        <h1>Kasir Toko Roti</h1>
        <p className="auth-subtitle">Masuk menggunakan akun staff.</p>
        <form onSubmit={submit} className="auth-form">
          <fieldset className="role-picker">
            <legend>Masuk sebagai</legend>
            <div className="role-options">
              <button type="button" className={`role-option ${role === "admin" ? "active" : ""}`} aria-pressed={role === "admin"} onClick={() => { setRole("admin"); setError(""); }}>
                <ShieldCheck size={17} /> Admin
              </button>
              <button type="button" className={`role-option ${role === "cashier" ? "active" : ""}`} aria-pressed={role === "cashier"} onClick={() => { setRole("cashier"); setError(""); }}>
                <UserRound size={17} /> Kasir
              </button>
            </div>
          </fieldset>
          <label>
            Username
            <span className="input-wrap"><UserRound size={18} /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={`Username ${role}`} autoComplete="username" required minLength={3} /></span>
          </label>
          <label>
            Password
            <span className="input-wrap"><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" autoComplete="current-password" required /></span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={19} /> : <>Masuk sebagai {role === "admin" ? "Admin" : "Kasir"} <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
      <p className="auth-footer">Dibuat dengan hangat, untuk hari yang lebih produktif.</p>
    </main>
  );
}
