import { useState } from "react";
import { Mail, Lock, User } from "lucide-react";
import { supabase } from "../db";

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg({ type: "ok", text: "Check your email to confirm your account, then sign in." });
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const isSignIn = mode === "signin";

  return (
    <div className="auth">
      <div className="auth-logo">🥗</div>
      <h1>{isSignIn ? "Welcome back" : "Create account"}</h1>
      <p className="sub">{isSignIn ? "Sign in to see your meals" : "Track every meal, on every device"}</p>

      <form onSubmit={submit}>
        {!isSignIn && (
          <label className="field">
            <User size={18} />
            <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="field">
          <Mail size={18} />
          <input
            type="email" placeholder="Email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <Lock size={18} />
          <input
            type="password" placeholder="Password (6+ characters)" required minLength={6}
            autoComplete={isSignIn ? "current-password" : "new-password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="primary-btn" disabled={busy}>
          {busy ? "Please wait…" : isSignIn ? "Sign in" : "Create account"}
        </button>
      </form>

      {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}

      <p className="auth-switch">
        {isSignIn ? "New here? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(isSignIn ? "signup" : "signin");
            setMsg(null);
          }}
        >
          {isSignIn ? "Create account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
