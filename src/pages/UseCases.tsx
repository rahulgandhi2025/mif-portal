import { useParams, useNavigate } from "react-router-dom";
import { RefreshCw, ClipboardCheck, Pencil, Trash2, Save, Plus, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useAppStore, useProjectArtefacts } from "../store/useAppStore";
import { Modal } from "../components/Modal";
import type { UseCaseStatus } from "../types";

const STATUSES: UseCaseStatus[] = ["Draft", "In Review", "Approved", "Rejected"];

function TextList({
  value,
  onChange,
  rows = 3,
}: {
  value: string[];
  onChange: (next: string[]) => void;
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

export default function UseCases() {
  const { projectId = "" } = useParams();
  const nav = useNavigate();
  const a = useProjectArtefacts(projectId);
  const regen = useAppStore((s) => s.regenerateUseCases);
  const regenTests = useAppStore((s) => s.regenerateTestCases);
  const update = useAppStore((s) => s.updateUseCase);
  const remove = useAppStore((s) => s.removeUseCase);
  const genExceptions = useAppStore((s) => s.generateExceptions);
  const createUC = useAppStore((s) => s.createUseCase);
  const [addOpen, setAddOpen] = useState(false);
  const [draftInterfaceId, setDraftInterfaceId] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const toggleEdit = (id: string) => setEditing((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-4">
      <section className="card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Use Cases</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Auto-drafted per interface using the MIF template — primary/secondary actors, description,
            triggers, preconditions, chain of events, post-conditions. Edit and set status to
            <b> Approved</b> to enable SIT test generation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setAddOpen(true)} disabled={a.interfaces.length === 0} title={a.interfaces.length === 0 ? "Create at least one interface first" : ""}>
            <Plus className="h-4 w-4" /> New Use Case
          </button>
          <button className="btn-secondary" onClick={() => regen(projectId)}>
            <RefreshCw className="h-4 w-4" /> Sync from Interfaces
          </button>
          <button
            className="btn-secondary"
            onClick={() => genExceptions(projectId)}
            disabled={a.useCases.length === 0}
            title="Add default exception steps to every use case that has none"
          >
            <AlertTriangle className="h-4 w-4" /> Add exception steps
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              regenTests(projectId);
              nav(`/projects/${projectId}/sit-tests`);
            }}
          >
            <ClipboardCheck className="h-4 w-4" /> Generate SIT Tests
          </button>
        </div>
      </section>

      {a.useCases.length === 0 ? (
        <div className="card p-8 text-sm text-slate-500">
          No use cases yet. Generate interfaces first, then click Sync.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {a.useCases.map((uc) => {
            const iface = a.interfaces.find((i) => i.id === uc.interfaceId);
            const isEditing = editing.has(uc.id);
            return (
              <article key={uc.id} className="card p-5">
                <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 font-mono">{uc.id} · {iface?.id ?? "?"}</div>
                    <input
                      className="text-base font-semibold w-full bg-transparent focus:outline-none disabled:text-slate-800"
                      value={uc.title}
                      disabled={!isEditing}
                      onChange={(e) => update(projectId, uc.id, { title: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      className="input !w-40 !text-xs"
                      value={uc.status}
                      onChange={(e) => update(projectId, uc.id, { status: e.target.value as UseCaseStatus })}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      className="btn-secondary !py-1 !px-2 text-xs"
                      onClick={() => toggleEdit(uc.id)}
                      title={isEditing ? "Done editing" : "Edit use case"}
                    >
                      {isEditing ? <><Save className="h-3.5 w-3.5" /> Done</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                    </button>
                    <button
                      className="btn-danger !py-1 !px-2 text-xs"
                      onClick={() => {
                        if (confirm(`Delete ${uc.id}? This also removes any SIT tests linked to it.`)) {
                          remove(projectId, uc.id);
                        }
                      }}
                      title="Delete use case"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </header>

                <fieldset disabled={!isEditing} className="grid grid-cols-1 md:grid-cols-2 gap-3 disabled:opacity-70">
                  <div>
                    <div className="label">Primary Actors</div>
                    <TextList
                      value={uc.primaryActors}
                      onChange={(v) => update(projectId, uc.id, { primaryActors: v.filter(Boolean) })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <div className="label">Secondary Actors</div>
                    <TextList
                      value={uc.secondaryActors}
                      onChange={(v) => update(projectId, uc.id, { secondaryActors: v.filter(Boolean) })}
                      rows={2}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="label">Description / Context</div>
                    <textarea
                      className="input !text-xs !py-2"
                      rows={2}
                      value={uc.description}
                      onChange={(e) => update(projectId, uc.id, { description: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="label">Triggers</div>
                    <textarea
                      className="input !text-xs !py-2"
                      rows={2}
                      value={uc.triggers}
                      onChange={(e) => update(projectId, uc.id, { triggers: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="label">Preconditions</div>
                    <TextList
                      value={uc.preconditions}
                      onChange={(v) => update(projectId, uc.id, { preconditions: v.filter(Boolean) })}
                    />
                  </div>
                  <div>
                    <div className="label">Post-Conditions</div>
                    <TextList
                      value={uc.postConditions}
                      onChange={(v) => update(projectId, uc.id, { postConditions: v.filter(Boolean) })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="label">Chain of Events</div>
                    <TextList
                      value={uc.chainOfEvents}
                      onChange={(v) => update(projectId, uc.id, { chainOfEvents: v.filter(Boolean) })}
                      rows={7}
                    />
                    <div className="mt-1 text-[11px] text-slate-500 leading-snug">
                      <span className="font-semibold">Sequence syntax</span> (used in Time Sequence Diagram):
                      write <code className="font-mono">[Phase name]</code> on a line to open a grouping,
                      then lines like <code className="font-mono">Actor A -&gt; Actor B: message</code>
                      to route arrows between any two participants. Actor names must match your Primary or
                      Secondary Actors above. A plain line without <code className="font-mono">-&gt;</code>
                      falls back to the first primary → first secondary actor.
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="label mb-0">Exception Flow</div>
                      <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn-ghost !p-1 text-xs"
                        title="Replace the exceptions below with the default set"
                        onClick={() => genExceptions(projectId, uc.id)}
                      >
                        Generate defaults
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !p-1 text-xs"
                        onClick={() =>
                          update(projectId, uc.id, {
                            exceptions: [
                              ...uc.exceptions,
                              { step: String((uc.chainOfEvents.length || 0) + (uc.exceptions.length + 1) / 10).slice(0, 4), description: "" },
                            ],
                          })
                        }
                      >
                        + Add exception
                      </button>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-snug mb-1">
                      Step = the Chain-of-Events step that fails (e.g. <code className="font-mono">2.1</code>). First line: the cause.
                      Following lines: exception steps in sequence syntax (<code className="font-mono">A -&gt; B: text</code>) — they are drawn inside an
                      <code className="font-mono"> alt Exception</code> frame in the Sequence Diagram.
                    </div>
                    {uc.exceptions.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic">No exceptions defined.</div>
                    ) : (
                      <div className="space-y-2">
                        {uc.exceptions.map((ex, exIdx) => (
                          <div key={exIdx} className="grid grid-cols-[80px_1fr_auto] gap-2 items-start">
                            <input
                              className="input !text-xs !py-1 font-mono"
                              value={ex.step}
                              onChange={(e) => {
                                const next = uc.exceptions.map((x, i) => (i === exIdx ? { ...x, step: e.target.value } : x));
                                update(projectId, uc.id, { exceptions: next });
                              }}
                              placeholder="5.1"
                            />
                            <textarea
                              rows={4}
                              className="input !text-xs !py-1 font-mono"
                              value={ex.description}
                              onChange={(e) => {
                                const next = uc.exceptions.map((x, i) => (i === exIdx ? { ...x, description: e.target.value } : x));
                                update(projectId, uc.id, { exceptions: next });
                              }}
                              placeholder={"Cause: what goes wrong\nActor A --> Actor B: recovery step"}
                            />
                            <button
                              type="button"
                              className="btn-ghost !p-1"
                              title="Remove exception"
                              onClick={() =>
                                update(projectId, uc.id, {
                                  exceptions: uc.exceptions.filter((_, i) => i !== exIdx),
                                })
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </fieldset>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Use Case">
        <div className="space-y-3">
          <div>
            <div className="label">Interface</div>
            <select
              className="input"
              value={draftInterfaceId || (a.interfaces[0]?.id ?? '')}
              onChange={(e) => setDraftInterfaceId(e.target.value)}
            >
              {a.interfaces.map((i) => (
                <option key={i.id} value={i.id}>{i.id} — {i.messageType ?? i.description ?? '?'}</option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 mt-1">Every use case belongs to an interface (message exchange).</div>
          </div>
          <div>
            <div className="label">Title (optional)</div>
            <input className="input" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="e.g. Unloading & Pallet Receiving" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
          <button
            className="btn-primary"
            onClick={async () => {
              const id = draftInterfaceId || (a.interfaces[0]?.id ?? '');
              if (!id) return;
              await createUC(projectId, id, draftTitle || undefined);
              setDraftInterfaceId(''); setDraftTitle(''); setAddOpen(false);
            }}
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>
      </Modal>
    </div>
  );
}
