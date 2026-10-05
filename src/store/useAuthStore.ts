import { create } from "zustand";
import type { Role, Session } from "../types";

const LS_SESSION = "mif.session.v1";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

interface AuthState {
  session: Session | null;
  init(): void;
  login(u: string, p: string): { ok: true } | { ok: false; error: string };
  logout(): void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  init() {
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (raw) set({ session: JSON.parse(raw) as Session });
    } catch { /* ignore */ }
  },
  login(username, password) {
    if (username.trim().toLowerCase() !== ADMIN_USER || password !== ADMIN_PASS) {
      return { ok: false, error: "Invalid username or password" };
    }
    const session: Session = {
      username: ADMIN_USER,
      role: "Admin" as Role,
      loggedInAt: new Date().toISOString(),
    };
    try { localStorage.setItem(LS_SESSION, JSON.stringify(session)); } catch { /* ignore */ }
    set({ session });
    return { ok: true };
  },
  logout() {
    try { localStorage.removeItem(LS_SESSION); } catch { /* ignore */ }
    set({ session: null });
  },
}));
