import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RefreshCw, FileText, ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useAppStore, useProjectArtefacts } from "../store/useAppStore";
import type { InterfaceDirection, InterfaceStatus } from "../types";

const STATUSES: InterfaceStatus[] = [
  "Identified", "In Design", "In Development", "In Testing", "Approved", "Deployed",
];
const STATUS_CLASS: Record<InterfaceStatus, string> = {
  Identified: "bg-slate-100 text-slate-700",
  "In Design": "bg-blue-50 text-blue-700",
  "In Development": "bg-amber-50 text-amber-700",
  "In Testing": "bg-purple-50 text-purple-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Deployed: "bg-teal-50 text-teal-700",
};
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export default function Interfaces() {
  const { projectId = "" } = useParams();
  const nav = useNavigate();
  const a = useProjectArtefacts(projectId);
  const regen = useAppStore((s) => s.regenerateInterfaces);
  const regenUseCases = useAppStore((s) => s.regenerateUseCases);
  const updateInterface = useAppStore((s) => s.updateInterface);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const label = (id: string) => a.systems.find((sy) => sy.id === id)?.label ?? "?";
  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <section className="card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Interface Register &amp; Message Table</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Auto-populated from the links marked <b>I</b> in Concept Design / VSM — each interface is
            <b> bidirectional</b> by default (request ⇄ response); switch to Unidirectional for fire-and-forget. Aligned with MIF Message Table columns —
            Seq, Message Type, Use case, FCR Ticket, From/To, API, Method, Body, Success/Error Response, Action.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => regen(projectId)}>
            <RefreshCw className="h-4 w-4" /> Sync from VSM
          </button>
          <button
            className="btn-primary"
            onClick={() => { regenUseCases(projectId); nav(`/projects/${projectId}/use-cases`); }}
          >
            <FileText className="h-4 w-4" /> Generate Use Cases
          </button>
        </div>
      </section>

      <section className="card overflow-x-auto">
        {a.interfaces.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">
            No interfaces yet. Add systems in Concept Design, link them in VSM, then click Sync.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
              <tr>
                <th className="px-2 py-2 w-6"></th>
                <th className="text-left px-3 py-2 font-medium">Seq</th>
                <th className="text-left px-3 py-2 font-medium">ID</th>
                <th className="text-left px-3 py-2 font-medium">Message Type</th>
                <th className="text-left px-3 py-2 font-medium">From ⇄ To</th>
                <th className="text-left px-3 py-2 font-medium">Direction</th>
                <th className="text-left px-3 py-2 font-medium">API</th>
                <th className="text-left px-3 py-2 font-medium">Method</th>
                <th className="text-left px-3 py-2 font-medium">FCR Ticket</th>
                <th className="text-left px-3 py-2 font-medium">Description</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {a.interfaces.map((i, idx) => {
                const isOpen = expanded.has(i.id);
                return (
                  <>
                    <tr key={i.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                      <td className="px-2 py-2">
                        <button className="btn-ghost !p-1" onClick={() => toggle(i.id)} title="Expand row">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        <input
                          className="input !py-1 !text-xs w-14"
                          value={i.seq ?? idx + 1}
                          onChange={(e) => updateInterface(projectId, i.id, { seq: Number(e.target.value) || undefined })}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{i.id}</td>
                      <td className="px-3 py-2">
                        <input
                          className="input !py-1 !text-xs"
                          value={i.messageType ?? ""}
                          onChange={(e) => updateInterface(projectId, i.id, { messageType: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-medium">{label(i.sourceSystemId)}</span>
                        <span className="text-teal-600 mx-1 font-bold">{i.direction === "Unidirectional" ? "→" : "⇄"}</span>
                        <span className="font-medium">{label(i.targetSystemId)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="input !py-1 !text-xs w-36"
                          value={i.direction ?? "Bidirectional"}
                          onChange={(e) => updateInterface(projectId, i.id, { direction: e.target.value as InterfaceDirection })}
                        >
                          <option value="Bidirectional">Bidirectional</option>
                          <option value="Unidirectional">Unidirectional</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="input !py-1 !text-xs font-mono"
                          value={i.api ?? ""}
                          onChange={(e) => updateInterface(projectId, i.id, { api: e.target.value })}
                          placeholder="/fbm/…"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="input !py-1 !text-xs w-24"
                          value={i.method ?? ""}
                          onChange={(e) => updateInterface(projectId, i.id, { method: e.target.value })}
                        >
                          <option value=""></option>
                          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="input !py-1 !text-xs w-28 font-mono"
                          value={i.fcrTicket ?? ""}
                          onChange={(e) => updateInterface(projectId, i.id, { fcrTicket: e.target.value })}
                          placeholder="FCR-…"
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[260px]">
                        <textarea
                          rows={2}
                          className="input !py-1 !text-xs"
                          value={i.description}
                          onChange={(e) => updateInterface(projectId, i.id, { description: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className={clsx("input !py-1 !text-xs", STATUS_CLASS[i.status])}
                          value={i.status}
                          onChange={(e) => updateInterface(projectId, i.id, { status: e.target.value as InterfaceStatus })}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/40 border-t border-slate-100">
                        <td></td>
                        <td colSpan={10} className="px-3 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <TextArea label="Body (JSON / XML)" value={i.body ?? ""} onChange={(v) => updateInterface(projectId, i.id, { body: v })} rows={5} mono />
                            <TextArea label="Example message" value={i.exampleMessage ?? ""} onChange={(v) => updateInterface(projectId, i.id, { exampleMessage: v })} rows={5} mono />
                            <TextArea label="Success response" value={i.successResponse ?? ""} onChange={(v) => updateInterface(projectId, i.id, { successResponse: v })} rows={4} mono />
                            <TextArea label="Error response" value={i.errorResponse ?? ""} onChange={(v) => updateInterface(projectId, i.id, { errorResponse: v })} rows={4} mono />
                            <TextArea label="Action / downstream effect" value={i.action ?? ""} onChange={(v) => updateInterface(projectId, i.id, { action: v })} rows={2} />
                            <TextArea label="Use case (short)" value={i.useCaseSummary ?? ""} onChange={(v) => updateInterface(projectId, i.id, { useCaseSummary: v })} rows={2} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <textarea
        rows={rows}
        className={clsx("input !text-xs !py-2", mono && "font-mono")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
