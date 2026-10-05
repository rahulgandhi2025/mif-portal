import { useParams } from "react-router-dom";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import { useAppStore, useProjectArtefacts } from "../store/useAppStore";
import type { TestStatus } from "../types";

const STATUSES: TestStatus[] = ["Not Run", "Passed", "Failed", "Blocked", "In Progress"];
const STATUS_CLASS: Record<TestStatus, string> = {
  "Not Run": "bg-slate-100 text-slate-700",
  Passed: "bg-emerald-50 text-emerald-700",
  Failed: "bg-rose-50 text-rose-700",
  Blocked: "bg-amber-50 text-amber-700",
  "In Progress": "bg-blue-50 text-blue-700",
};

function TextList({
  value,
  onChange,
  rows = 3,
}: {
  value: string[];
  onChange: (n: string[]) => void;
  rows?: number;
}) {
  return (
    <textarea
      className="input !text-xs !py-2 font-mono"
      rows={rows}
      value={value.join("\n")}
      onChange={(e) => onChange(e.target.value.split("\n"))}
    />
  );
}

export default function SITTests() {
  const { projectId = "" } = useParams();
  const a = useProjectArtefacts(projectId);
  const regen = useAppStore((s) => s.regenerateTestCases);
  const update = useAppStore((s) => s.updateTestCase);
  const addTest = useAppStore((s) => s.addTestCase);
  const removeTest = useAppStore((s) => s.removeTestCase);

  const approvedCount = a.useCases.filter((u) => u.status === "Approved").length;

  return (
    <div className="space-y-4">
      <section className="card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Site Integration Test Cases</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Auto-generated from <b>Approved</b> use cases. Each case includes scenario, preconditions,
            steps, expected results and execution status. Currently {approvedCount} approved use case
            {approvedCount === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="sit-new-uc"
            className="input !w-44 !text-xs"
            defaultValue=""
            disabled={a.useCases.length === 0}
          >
            <option value="" disabled>Add test for use case…</option>
            {a.useCases.map((u) => <option key={u.id} value={u.id}>{u.id} — {u.title.slice(0, 30)}</option>)}
          </select>
          <button
            className="btn-secondary"
            disabled={a.useCases.length === 0}
            onClick={() => {
              const el = document.getElementById("sit-new-uc") as HTMLSelectElement | null;
              if (el?.value) { addTest(projectId, el.value); el.value = ""; }
            }}
          >
            <Plus className="h-4 w-4" /> New test case
          </button>
          <button className="btn-secondary" onClick={() => regen(projectId)}>
            <RefreshCw className="h-4 w-4" /> Sync from Use Cases
          </button>
        </div>
      </section>

      {a.testCases.length === 0 ? (
        <div className="card p-8 text-sm text-slate-500">
          No SIT cases yet. Approve at least one use case, then Sync.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {a.testCases.map((t) => {
            const uc = a.useCases.find((u) => u.id === t.useCaseId);
            return (
              <article key={t.id} className="card p-5">
                <header className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs text-slate-500 font-mono">{t.id} · {uc?.id ?? "?"}</div>
                    <input
                      className="text-base font-semibold w-full bg-transparent focus:outline-none"
                      value={t.scenario}
                      onChange={(e) => update(projectId, t.id, { scenario: e.target.value })}
                    />
                  </div>
                  <select
                    className={"input !w-40 !text-xs " + STATUS_CLASS[t.status]}
                    value={t.status}
                    onChange={(e) => update(projectId, t.id, { status: e.target.value as TestStatus })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    className="btn-danger !py-1 !px-2 ml-2"
                    title="Delete test case"
                    onClick={() => { if (confirm(`Delete ${t.id}?`)) removeTest(projectId, t.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="label">Preconditions</div>
                    <TextList value={t.preconditions} onChange={(v) => update(projectId, t.id, { preconditions: v.filter(Boolean) })} />
                  </div>
                  <div>
                    <div className="label">Expected Results</div>
                    <TextList value={t.expectedResults} onChange={(v) => update(projectId, t.id, { expectedResults: v.filter(Boolean) })} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="label">Steps</div>
                    <TextList value={t.steps} onChange={(v) => update(projectId, t.id, { steps: v.filter(Boolean) })} rows={5} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
