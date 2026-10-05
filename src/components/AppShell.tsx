import { Link, Outlet, useLocation } from "react-router-dom";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export default function AppShell() {
  const location = useLocation();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-[1400px] px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4">
            <img
              src="/brand/maersk-logo.jpeg"
              alt="Maersk"
              className="h-9 w-auto"
              draggable={false}
            />
            <span className="hidden sm:block h-8 w-px bg-slate-200" />
            <img src="/brand/mcs-logo.png" alt="MCS" className="hidden sm:block h-10 w-10 object-contain" draggable={false} />
            <div className="hidden sm:block">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 leading-none">
                Integration Framework
              </div>
              <div className="text-base font-semibold text-slate-900 leading-tight">
                MIF Portal
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{session?.username}</span>
            <span className="badge bg-maersk-50 text-maersk-800 ring-1 ring-maersk-200">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {session?.role}
            </span>
            <button className="btn-ghost !py-1 !px-2" onClick={() => { logout(); }} title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {location.pathname !== "/" && (
          <nav className="mx-auto max-w-[1400px] px-6 pb-2 text-xs text-slate-500">
            <Link to="/" className="hover:underline">Dashboard</Link>
            <span className="mx-2 opacity-60">/</span>
            <span>Project workspace</span>
          </nav>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-white/40 bg-white/60 backdrop-blur py-3 text-center text-xs text-slate-600">
        MIF Portal · Prototype · MIF v1.1 methodology
      </footer>
    </div>
  );
}
