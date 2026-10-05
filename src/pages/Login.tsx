import { useState } from "react";
import { LogIn } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useAppStore } from "../store/useAppStore";

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await login(username.trim(), password);
    if (!res.ok) { setErr(res.error); return; }
    const sess = useAuthStore.getState().session;
    if (sess) useAppStore.getState().setCurrentUser({ name: sess.username, role: sess.role });
    try { await useAppStore.getState().loadProjects(); } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <img src="/brand/maersk-logo.jpeg" alt="Maersk" className="h-10 w-auto" />
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-slate-800">Sign in to MIF Portal</h1>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <div className="label">Username</div>
              <input
                className="input"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <div className="label">Password</div>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {err && <div className="text-sm text-rose-600">{err}</div>}
            <button className="btn-primary w-full justify-center" type="submit">
              <LogIn className="h-4 w-4" /> Sign in
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-slate-500 mt-4">
          MIF Portal · Prototype · Session stored locally on this device.
        </p>
      </div>
    </div>
  );
}
