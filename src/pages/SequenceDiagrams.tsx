import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, Info, Pencil, Save, Undo2, Users, Plus, X, Download,
} from "lucide-react";
import { MermaidChart } from "../components/MermaidChart";
import { useAppStore, useProjectArtefacts } from "../store/useAppStore";
import { downloadText } from "../lib/download";
import type { UseCase, InterfaceItem } from "../types";

// ---- helpers ------------------------------------------------------------
function actorId(name: string): string {
  return (name || "").replace(/[^A-Za-z0-9]/g, "_") || "Actor";
}
function trim(s: string) { return s.replace(/\s+/g, " ").trim(); }
function clean(s: string) { return s.replace(/[\n\r]/g, " ").replace(/[:;]/g, ","); }

function resolveActor(name: string, actors: string[]): string {
  const t = trim(name).toLowerCase();
  if (!t) return actors[0] ?? "System";
  const exact = actors.find((a) => a.toLowerCase() === t);
  if (exact) return exact;
  const prefix = actors.find((a) => a.toLowerCase().startsWith(t) || t.startsWith(a.toLowerCase()));
  return prefix || actors[0] || name;
}

type ParsedStep =
  | { kind: "phase"; label: string }
  | { kind: "message"; from: string; to: string; arrow: "->>" | "-->>"; text: string };

function parseStep(raw: string, actors: string[], defaultFrom: string, defaultTo: string): ParsedStep | null {
  const line = trim(raw);
  if (!line) return null;
  const phase = line.match(/^\[(.+)\]\s*$/);
  if (phase) return { kind: "phase", label: trim(phase[1]) };
  const dashed = line.match(/^(.+?)\s*-->\s*(.+?)\s*:\s*(.+)$/);
  if (dashed) return { kind: "message", arrow: "-->>", from: resolveActor(dashed[1], actors), to: resolveActor(dashed[2], actors), text: dashed[3] };
  const arrow = line.match(/^(.+?)\s*->\s*(.+?)\s*:\s*(.+)$/);
  if (arrow) return { kind: "message", arrow: "->>", from: resolveActor(arrow[1], actors), to: resolveActor(arrow[2], actors), text: arrow[3] };
  return { kind: "message", arrow: "->>", from: defaultFrom, to: defaultTo, text: line };
}

// ---- Build merged Mermaid from all use cases ----------------------------
function collectActors(useCases: UseCase[], extraActors: string[]): string[] {
  const actors: string[] = [];
  const add = (n: string) => { const t = trim(n); if (t && !actors.includes(t)) actors.push(t); };
  for (const uc of useCases) {
    uc.primaryActors.forEach(add);
    uc.secondaryActors.forEach(add);
  }
  extraActors.forEach(add);
  if (actors.length < 2) add("System");
  return actors;
}

/**
 * Build the merged Time Sequence Diagram for all use cases, revealing only
 * the first `revealTotal` messages across the whole document.
 * Every use case becomes its own `rect` block; every exception becomes an
 * `alt Exception <step>` frame inside its owning block; phase markers open
 * nested rectangles.
 */
function buildMerged(
  useCases: UseCase[],
  interfaces: InterfaceItem[],
  extraActors: string[],
  revealTotal: number
): { chart: string; totalSteps: number } {
  const actors = collectActors(useCases, extraActors);
  const first = actorId(actors[0]);
  const last  = actorId(actors[actors.length - 1]);
  const lines: string[] = ["sequenceDiagram", "  autonumber"];
  for (const a of actors) lines.push(`  participant ${actorId(a)} as ${a}`);

  let revealed = 0;
  let totalSteps = 0;
  // first count total messages so caller knows the upper bound
  useCases.forEach((uc) => {
    for (const raw of uc.chainOfEvents) {
      const s = parseStep(raw, actors, "", "");
      if (s && s.kind === "message") totalSteps++;
    }
  });

  useCases.forEach((uc) => {
    if (revealed >= revealTotal && revealTotal > 0) return;
    const iface = interfaces.find((i) => i.id === uc.interfaceId);
    const proto = iface?.protocol ?? "REST";
    const msg   = iface?.messageType ?? "Message";
    const defaultFrom = trim(uc.primaryActors[0] ?? actors[0]);
    const defaultTo   = trim(uc.secondaryActors[0] ?? actors[1] ?? actors[0]);

    const bodyLines: string[] = [];
    let inRect = false;
    let ucMessages = 0;
    let firstOverall = revealed === 0;

    for (const raw of uc.chainOfEvents) {
      if (revealTotal > 0 && revealed >= revealTotal) break;
      const step = parseStep(raw, actors, defaultFrom, defaultTo);
      if (!step) continue;
      if (step.kind === "phase") {
        if (inRect) bodyLines.push("    end");
        bodyLines.push(`    rect rgb(226, 240, 253)`);
        bodyLines.push(`      Note over ${first},${last}: ${clean(step.label)}`);
        inRect = true;
        continue;
      }
      revealed++;
      ucMessages++;
      const indent = inRect ? "      " : "    ";
      const annotation = firstOverall ? ` [${proto}/${msg}]` : "";
      firstOverall = false;
      bodyLines.push(`${indent}${actorId(step.from)}${step.arrow}${actorId(step.to)}: ${clean(step.text)}${annotation}`);
    }
    if (inRect) bodyLines.push("    end");

    // Exceptions after the messages, if any
    const exBlock: string[] = [];
    if (uc.exceptions && uc.exceptions.length > 0) {
      for (const ex of uc.exceptions) {
        if (!ex.description && !ex.step) continue;
        exBlock.push(`    alt Exception ${clean(ex.step || "")}`);
        const exLines = (ex.description || "").split("\n").map(trim).filter(Boolean);
        if (exLines.length === 0) exLines.push("Exception");
        for (const raw of exLines) {
          if (/->/.test(raw)) {
            const st = parseStep(raw, actors, defaultFrom, defaultTo);
            if (st && st.kind === "message") {
              exBlock.push(`      ${actorId(st.from)}${st.arrow}${actorId(st.to)}: ${clean(st.text)}`);
              continue;
            }
          }
          exBlock.push(`      Note over ${actorId(defaultFrom)},${actorId(defaultTo)}: ${clean(raw)}`);
        }
        exBlock.push(`    end`);
      }
    }

    if (bodyLines.length === 0 && exBlock.length === 0 && ucMessages === 0) return;

    lines.push(`  rect rgb(244, 248, 253)`);
    lines.push(`    Note over ${first},${last}: ${uc.id} — ${clean(uc.title)}`);
    lines.push(...bodyLines);
    lines.push(...exBlock);
    lines.push(`  end`);
  });

  return { chart: lines.join("\n"), totalSteps };
}

// ---- Autoplay hook ------------------------------------------------------
function useAutoplay(playing: boolean, onTick: () => void, ms = 900) {
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) { if (ref.current) window.clearInterval(ref.current); ref.current = null; return; }
    ref.current = window.setInterval(() => onTick(), ms);
    return () => { if (ref.current) window.clearInterval(ref.current); ref.current = null; };
  }, [playing, onTick, ms]);
}

// ---- Page ---------------------------------------------------------------
export default function SequenceDiagrams() {
  const { projectId = "" } = useParams();
  const a = useProjectArtefacts(projectId);
  const updateTsd = useAppStore((s) => s.updateTsd);

  const tsd = a.tsd ?? { extraActors: [] as string[], customSource: undefined as string | undefined };

  const generated = useMemo(
    () => buildMerged(a.useCases, a.interfaces, tsd.extraActors, 0),
    [a.useCases, a.interfaces, tsd.extraActors]
  );
  const totalSteps = generated.totalSteps;

  // reveal is only meaningful when we're rendering the auto-generated source
  const [revealed, setRevealed] = useState<number>(totalSteps);
  const [playing, setPlaying] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<string>(tsd.customSource ?? generated.chart);
  const [extraActorInput, setExtraActorInput] = useState("");

  // Keep revealed bounded when the total changes
  useEffect(() => { setRevealed(totalSteps); }, [totalSteps]);
  useEffect(() => { setDraft(tsd.customSource ?? generated.chart); /* keep draft in sync */ }, [tsd.customSource, generated.chart]);

  useAutoplay(playing, () => {
    setRevealed((r) => {
      const next = r + 1;
      if (next >= totalSteps) { setPlaying(false); return totalSteps; }
      return next;
    });
  });

  const isCustom = !!tsd.customSource;
  const revealed01 = isCustom ? totalSteps : Math.min(revealed, totalSteps);
  const partialSource = useMemo(
    () => isCustom
      ? (tsd.customSource || generated.chart)
      : buildMerged(a.useCases, a.interfaces, tsd.extraActors, revealed01).chart,
    [isCustom, tsd.customSource, generated.chart, a.useCases, a.interfaces, tsd.extraActors, revealed01]
  );

  function addExtraActor() {
    const name = trim(extraActorInput);
    if (!name) return;
    if (tsd.extraActors.includes(name)) { setExtraActorInput(""); return; }
    updateTsd(projectId, { extraActors: [...tsd.extraActors, name] });
    setExtraActorInput("");
  }
  function removeExtraActor(name: string) {
    updateTsd(projectId, { extraActors: tsd.extraActors.filter((x) => x !== name) });
  }
  function saveDraft() {
    updateTsd(projectId, { customSource: draft });
    setEditMode(false);
  }
  function resetToGenerated() {
    updateTsd(projectId, { customSource: undefined });
    setDraft(generated.chart);
    setEditMode(false);
  }

  return (
    <div className="space-y-4">
      {/* ---------- Header + syntax help ---------- */}
      <section className="card p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Time Sequence Diagram</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              One consolidated TSD derived from every Use Case on this project. Each use case is a
              nested block; exceptions become <span className="font-mono">alt</span> frames after
              their steps. You can add extra actors, edit the Mermaid source directly, and animate
              message-by-message.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={() => downloadText(`tsd_${projectId}.mmd`, partialSource, "text/plain")}
            >
              <Download className="h-4 w-4" /> Download .mmd
            </button>
            {!editMode ? (
              <button className="btn-primary" onClick={() => setEditMode(true)}>
                <Pencil className="h-4 w-4" /> Edit Diagram
              </button>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => { setDraft(tsd.customSource ?? generated.chart); setEditMode(false); }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={saveDraft}>
                  <Save className="h-4 w-4" /> Save Diagram
                </button>
              </>
            )}
            {isCustom && !editMode && (
              <button className="btn-secondary" onClick={resetToGenerated} title="Discard custom source and regenerate from use cases">
                <Undo2 className="h-4 w-4" /> Reset to auto
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 rounded-md bg-slate-50 ring-1 ring-slate-200 p-3 text-xs text-slate-700 flex gap-2">
          <Info className="h-4 w-4 mt-0.5 text-slate-500 shrink-0" />
          <div>
            <div className="font-semibold mb-1">Sequence syntax (in Use Cases → Chain of Events)</div>
            <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
              <li><code>[Phase name]</code> — opens a nested rectangle</li>
              <li><code>Actor A -&gt; Actor B: message text</code> — solid arrow</li>
              <li><code>Actor A --&gt; Actor B: return text</code> — dashed reply</li>
              <li>plain text — default primary → secondary actor</li>
            </ul>
            <div className="mt-1">Exceptions from Use Cases render as <code className="font-mono">alt Exception &lt;step&gt;</code> frames.</div>
          </div>
        </div>
      </section>

      {/* ---------- Extra actors ---------- */}
      <section className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">Extra actors</span>
            <span className="text-xs text-slate-500">— included as participants even if no use case mentions them.</span>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <input
              className="input !py-1 !text-sm w-56"
              placeholder="Add actor (e.g. Cubiscan)"
              value={extraActorInput}
              onChange={(e) => setExtraActorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtraActor(); } }}
            />
            <button className="btn-secondary !py-1 !px-3 text-sm" onClick={addExtraActor}>
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>
        {tsd.extraActors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tsd.extraActors.map((name) => (
              <span key={name} className="badge bg-maersk-50 text-maersk-800 ring-1 ring-maersk-100 pr-1">
                {name}
                <button className="ml-1 hover:text-rose-600" onClick={() => removeExtraActor(name)} title="Remove">
                  <X className="h-3 w-3 inline" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Play controls (auto-generated only) ---------- */}
      {!isCustom && !editMode && (
        <section className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button className="btn-secondary !py-1 !px-2 text-xs" onClick={() => { setRevealed(0); setPlaying(false); }} title="Reset"><RotateCcw className="h-3.5 w-3.5" /></button>
              <button className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setRevealed((r) => Math.max(0, r - 1))} title="Previous step"><SkipBack className="h-3.5 w-3.5" /></button>
              <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => { if (revealed >= totalSteps) setRevealed(1); setPlaying((p) => !p); }}>
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? "Pause" : "Play"}
              </button>
              <button className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setRevealed((r) => Math.min(totalSteps, r + 1))} title="Next step"><SkipForward className="h-3.5 w-3.5" /></button>
              <button className="btn-secondary !py-1 !px-2 text-xs" onClick={() => { setRevealed(totalSteps); setPlaying(false); }} title="Show all">Show all</button>
            </div>
            <div className="text-xs text-slate-500">
              {a.useCases.length} use case{a.useCases.length === 1 ? "" : "s"} · step <b>{Math.min(revealed, totalSteps)}</b> / {totalSteps}
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100 mt-2 overflow-hidden">
            <div className="h-2 bg-maersk-500 transition-all"
              style={{ width: `${totalSteps ? (Math.min(revealed, totalSteps) / totalSteps) * 100 : 0}%` }} />
          </div>
        </section>
      )}

      {/* ---------- Diagram or Editor ---------- */}
      {editMode ? (
        <section className="card p-4">
          <div className="text-xs text-slate-500 mb-2">
            Full Mermaid source — the sequence diagram will render exactly what you save here.
            Reset any time to regenerate from your use cases.
          </div>
          <textarea
            className="input font-mono !text-xs w-full"
            rows={24}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        </section>
      ) : (
        <section className="card p-5">
          {a.useCases.length === 0 && !isCustom ? (
            <div className="text-sm text-slate-500">Add or generate use cases first — the merged TSD is built from them.</div>
          ) : (
            <MermaidChart chart={partialSource || "sequenceDiagram\n  Note over A: (empty)"} />
          )}
        </section>
      )}
    </div>
  );
}
