import { X } from "lucide-react";
import type { PropsWithChildren } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
}>) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={"card w-full " + (wide ? "max-w-4xl" : "max-w-lg") + " mt-16"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn-ghost !p-1" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
