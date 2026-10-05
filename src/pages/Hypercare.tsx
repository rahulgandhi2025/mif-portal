import { useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useAppStore, useProjectArtefacts, useProject } from "../store/useAppStore";
import type { HypercareIssue, HypercareIssueStatus } from "../types";

const STATUSES: HypercareIssueStatus[] = ["Open", "In Progress", "Mitigated", "Closed"];
const STATUS_CLASS: Record<HypercareIssueStatus, string> = {
  Open:          "bg-rose-50 text-rose-700",
  "In Progress": "bg-amber-50 text-amber-700",
  Mitigated:     "bg-blue-50 text-blue-700",
  Closed:        "bg-emerald-50 text-emerald-700",
};
const RANK: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
const RANK_LABEL = ["Very Low", "Low", "Medium", "High", "Very High"];

function riskScore(i: HypercareIssue): number {
  return i.impact * i.urgency;
}

export default function Hypercare() {
  const { projectId = "" } = useParams();
  const p = useProject(projectId);
  const a = useProjectArtefacts(projectId);
  const updateHc = useAppStore((s) => s.updateHypercare);
  const addIssue = useAppStore((s) => s.addHypercareIssue);
  const updateIssue = useAppStore((s) => s.updateHypercareIssue);
  const removeIssue = useAppStore((s) => s.removeHypercareIssue);

  const hc = a.hypercare;

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">{p?.name ?? "—"} · Issue Log</h2>
        <p className="text-sm text-slate-500 mt-1">
          Post go-live stability tracking. Aligned with the MIF Hypercare workbook —
          Go-Live date, hypercare duration, objective, current status, open issues, and an issue log.
        </p>
      </section>

      <section className="card p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Go-Live date">
          <input
            type="date"
            className="input"
            value={(hc.goLiveDate ?? "").slice(0, 10)}
            onChange={(e) => updateHc(projectId, { goLiveDate: e.target.value })}
          />
        </Field>
        <Field label="Hypercare duration (days)">
          <input
            type="number"
            min={0}
            className="input"
            value={hc.durationDays ?? 30}
            onChange={(e) => updateHc(projectId, { durationDays: Number(e.target.value) })}
          />
        </Field>
        <Field label="Current status">
          <input
            className="input"
            value={hc.currentStatus ?? ""}
            onChange={(e) => updateHc(projectId, { currentStatus: e.target.value })}
            placeholder="Green / Amber / Red …"
          />
        </Field>
        <Field label="Open issues (count / summary)">
          <input
            className="input"
            value={hc.openIssues ?? ""}
            onChange={(e) => updateHc(projectId, { openIssues: e.target.value })}
          />
        </Field>
        <div className="md:col-span-4">
          <div className="label">Objective</div>
          <textarea
            rows={2}
            className="input"
            value={hc.objective ?? ""}
            onChange={(e) => updateHc(projectId, { objective: e.target.value })}
            placeholder="What does success look like during Hypercare?"
          />
        </div>
      </section>

      <section className="card">
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold">Issue Log</h3>
            <p className="text-xs text-slate-500">Impact × Urgency = Risk score.</p>
          </div>
          <button className="btn-primary" onClick={() => addIssue(projectId)}>
            <Plus className="h-4 w-4" /> Add issue
          </button>
        </header>
        {hc.issues.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">No issues logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-2 font-medium">ID</th>
                  <th className="text-left px-2 py-2 font-medium">Date raised</th>
                  <th className="text-left px-2 py-2 font-medium">Title</th>
                  <th className="text-left px-2 py-2 font-medium">Impacted area</th>
                  <th className="text-left px-2 py-2 font-medium">Raised by</th>
                  <th className="text-left px-2 py-2 font-medium">Assignee</th>
                  <th className="text-left px-2 py-2 font-medium">Description</th>
                  <th className="text-left px-2 py-2 font-medium">Impact</th>
                  <th className="text-left px-2 py-2 font-medium">Urgency</th>
                  <th className="text-left px-2 py-2 font-medium">Risk</th>
                  <th className="text-left px-2 py-2 font-medium">Mitigation</th>
                  <th className="text-left px-2 py-2 font-medium">Owner</th>
                  <th className="text-left px-2 py-2 font-medium">Status</th>
                  <th className="text-left px-2 py-2 font-medium">Closure</th>
                  <th className="text-left px-2 py-2 font-medium">Comments</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {hc.issues.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100 align-top">
                    <td className="px-2 py-2 font-mono">{i.id}</td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className="input !py-1 !text-xs"
                        value={(i.dateRaised ?? "").slice(0, 10)}
                        onChange={(e) => updateIssue(projectId, i.id, { dateRaised: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 min-w-[200px]">
                      <input
                        className="input !py-1 !text-xs"
                        value={i.title}
                        onChange={(e) => updateIssue(projectId, i.id, { title: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2"><input className="input !py-1 !text-xs" value={i.impactedArea ?? ""} onChange={(e) => updateIssue(projectId, i.id, { impactedArea: e.target.value })} /></td>
                    <td className="px-2 py-2"><input className="input !py-1 !text-xs" value={i.raisedBy ?? ""} onChange={(e) => updateIssue(projectId, i.id, { raisedBy: e.target.value })} /></td>
                    <td className="px-2 py-2"><input className="input !py-1 !text-xs" value={i.assignee ?? ""} onChange={(e) => updateIssue(projectId, i.id, { assignee: e.target.value })} /></td>
                    <td className="px-2 py-2 min-w-[240px]">
                      <textarea
                        rows={2}
                        className="input !py-1 !text-xs"
                        value={i.description ?? ""}
                        onChange={(e) => updateIssue(projectId, i.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <RankSelect value={i.impact} onChange={(v) => updateIssue(projectId, i.id, { impact: v })} />
                    </td>
                    <td className="px-2 py-2">
                      <RankSelect value={i.urgency} onChange={(v) => updateIssue(projectId, i.id, { urgency: v })} />
                    </td>
                    <td className="px-2 py-2 font-mono">
                      <RiskBadge score={riskScore(i)} />
                    </td>
                    <td className="px-2 py-2 min-w-[200px]">
                      <textarea rows={2} className="input !py-1 !text-xs" value={i.mitigation ?? ""} onChange={(e) => updateIssue(projectId, i.id, { mitigation: e.target.value })} />
                    </td>
                    <td className="px-2 py-2"><input className="input !py-1 !text-xs" value={i.owner ?? ""} onChange={(e) => updateIssue(projectId, i.id, { owner: e.target.value })} /></td>
                    <td className="px-2 py-2">
                      <select
                        className={clsx("input !py-1 !text-xs", STATUS_CLASS[i.status])}
                        value={i.status}
                        onChange={(e) => updateIssue(projectId, i.id, { status: e.target.value as HypercareIssueStatus })}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className="input !py-1 !text-xs"
                        value={(i.actualClosureDate ?? "").slice(0, 10)}
                        onChange={(e) => updateIssue(projectId, i.id, { actualClosureDate: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 min-w-[200px]">
                      <textarea rows={2} className="input !py-1 !text-xs" value={i.comments ?? ""} onChange={(e) => updateIssue(projectId, i.id, { comments: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <button className="btn-ghost !p-1" onClick={() => removeIssue(projectId, i.id)} title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      {children}
    </div>
  );
}

function RankSelect({ value, onChange }: { value: 1 | 2 | 3 | 4 | 5; onChange: (v: 1 | 2 | 3 | 4 | 5) => void }) {
  return (
    <select
      className="input !py-1 !text-xs w-24"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
    >
      {RANK.map((r) => (
        <option key={r} value={r}>{r} — {RANK_LABEL[r - 1]}</option>
      ))}
    </select>
  );
}

function RiskBadge({ score }: { score: number }) {
  const c =
    score >= 20 ? "bg-rose-100 text-rose-800" :
    score >= 12 ? "bg-amber-100 text-amber-800" :
    score >= 6  ? "bg-yellow-50 text-yellow-800" :
                  "bg-emerald-50 text-emerald-800";
  return <span className={"badge " + c}>{score}</span>;
}
