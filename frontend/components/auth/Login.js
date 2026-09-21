"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { Logo } from "../layout/Logo";
import { Field } from "../ui/Primitives";

export default function Login({ done }) {
  const [form, setForm] = useState({ email: "", password: "" }),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify(form) });
      done();
    } catch (x) {
      setError(x.message);
    }
  }
  return (
    <div className="login-shell">
      <div className="login-glow" />
      <form className="login-card" onSubmit={submit}>
        <Logo />
        <span className="tag">● NEXORA OPERATIONS</span>
        <h1>Good to see you.</h1>
        <p>Manage every client workspace, plan and invoice from one place.</p>
        <Field label="Email address">
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        {error && <div className="notice error">{error}</div>}
        <button className="primary">
          Sign in <span>→</span>
        </button>
      </form>
    </div>
  );
}
