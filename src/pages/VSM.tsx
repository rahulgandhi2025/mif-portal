import { useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Cable, RefreshCw, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useAppStore, useProject, useProjectArtefacts } from "../store/useAppStore";
import { ISA_LEVELS, SYSTEM_CATALOG, catalogByKey, type IconKey } from "../data/catalog";
import { SystemIcon } from "../components/SystemIcon";
import type { IsaLevel, ProjectSystem } from "../types";

// ---- layout ----
const LANE_HEIGHT = 130;
const L0_EXTRA = 90;              // extra space below L0 for the process phase bar
const LEVEL_COL_WIDTH = 150;
const NODE_WIDTH = 96;
const NODE_HEIGHT = 96;

function laneTopFor(level: IsaLevel): number {
  const idx = ISA_LEVELS.findIndex((l) => l.level === level);
  return idx * LANE_HEIGHT;
}
function centerFor(sys: ProjectSystem): { x: number; y: number } {
  const cx = (sys.position?.x ?? 40) + NODE_WIDTH / 2;
  const cy = laneTopFor(sys.isaLevel) + (sys.position?.y ?? 20) + NODE_HEIGHT / 2;
  return { x: cx, y: cy };
}

// ---- L0 phase groupings for the operational ribbon ----
const L0_PHASE_KEYS = ["Inbound", "Putaway", "Storage", "Replenishment", "Picking", "Packing", "Dispatch", "Return"];
const PHASES: Array<{ label: string; keys: string[] }> = [
  { label: "INBOUND",       keys: ["Inbound"] },
  { label: "PUTAWAY",       keys: ["Putaway"] },
  { label: "STORAGE",       keys: ["Storage"] },
  { label: "REPLENISHMENT", keys: ["Replenishment", "Picking"] },
  { label: "OUTBOUND",      keys: ["Packing", "Dispatch"] },
  { label: "RETURNS",       keys: ["Return"] },
];

// Colour by ISA level of the source system so links look like the VSM template legend.
function edgeStroke(srcLevel: IsaLevel): string {
  switch (srcLevel) {
    case 4: return "#0073ec";  // Data Flow (WMS) — blue
    case 3: return "#f0b100";  // Data Flow (WCS) — yellow
    case 5: return "#4b5563";  // Data Flow (ERP) — grey
    case 2: return "#a855f7";  // Control — purple
    case 1: return "#dc2626";  // AutoStore hardware — red
    default: return "#0e6a86"; // Process — teal
  }
}

export default function VSM() {
  const { projectId = "" } = useParams();
  const nav = useNavigate();
  const project = useProject(projectId);
  const a = useProjectArtefacts(projectId);
  const regenerateInterfaces = useAppStore((s) => s.regenerateInterfaces);
  const updateSystem = useAppStore((s) => s.updateSystem);
  const unlinkSystems = useAppStore((s) => s.unlinkSystems);
  const setLinkInterface = useAppStore((s) => s.setLinkInterface);
  const addSystem = useAppStore((s) => s.addSystem);
  const removeSystem = useAppStore((s) => s.removeSystem);
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const canvasWidth = useMemo(() => {
    let max = 900;
    for (const sy of a.systems) max = Math.max(max, (sy.position?.x ?? 0) + NODE_WIDTH + 80);
    return max;
  }, [a.systems]);

  const canvasHeight = ISA_LEVELS.length * LANE_HEIGHT + L0_EXTRA;

  // Interface number lookup — a link only has an interface if it has been generated in the Register.
  const ifaceByLink = useMemo(() => {
    const map: Record<string, string> = {};
    for (const i of a.interfaces) if (i.linkId) map[i.linkId] = i.id;
    return map;
  }, [a.interfaces]);

  function onNodeMouseDown(e: React.MouseEvent, sy: ProjectSystem) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragState.current = {
      id: sy.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: sy.position?.x ?? 40,
      origY: sy.position?.y ?? 20,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      const nextX = Math.max(10, dragState.current.origX + dx);
      const nextY = Math.max(10, Math.min(LANE_HEIGHT - NODE_HEIGHT - 10, dragState.current.origY + dy));
      updateSystem(projectId, dragState.current.id, { position: { x: nextX, y: nextY } });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function addToCanvas(key: string) {
    const entry = catalogByKey(key);
    if (!entry) return;
    const inLane = a.systems.filter((sy) => sy.isaLevel === entry.isaLevel);
    const usedRight = inLane.reduce((m, sy) => Math.max(m, (sy.position?.x ?? 0) + NODE_WIDTH), 30);
    await addSystem(projectId, key);
    const latest = (useAppStore.getState().artefacts[projectId]?.systems ?? []);
    const created = latest[latest.length - 1];
    if (created) updateSystem(projectId, created.id, { position: { x: usedRight + 20, y: 20 } });
  }

  const l0BandTop = laneTopFor(0) + LANE_HEIGHT;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-4">
      {/* toolbar */}
      <section className="card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Value Stream Map</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Layered view across ISA-95 levels 0–5 with an operational ribbon on Level 0 and a colour-coded
            data-flow legend, following the MIF VSM template. Drag any system inside its lane to reposition.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => regenerateInterfaces(projectId)}>
            <RefreshCw className="h-4 w-4" /> Sync interfaces
          </button>
          <button
            className="btn-primary"
            onClick={() => { regenerateInterfaces(projectId); nav(`/projects/${projectId}/interfaces`); }}
          >
            <Cable className="h-4 w-4" /> Open Interface Register
          </button>
        </div>
      </section>

      {/* main canvas */}
      <section className="card overflow-hidden">
        {/* meta strip */}
        <div className="grid grid-cols-[150px_1fr] border-b border-slate-200">
          <div className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
            ISA-95 Levels
          </div>
          <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <MetaCell label="FBM ID"   value={project?.fbmId} />
            <Divider />
            <MetaCell label="Customer" value={project?.customerName} />
            <Divider />
            <MetaCell label="Country"  value={project?.country} />
            <Divider />
            <MetaCell label="VSM"      value={project?.name} strong />
          </div>
        </div>

        <div className="overflow-auto">
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `${LEVEL_COL_WIDTH}px 1fr`,
              minHeight: canvasHeight,
              minWidth: LEVEL_COL_WIDTH + canvasWidth,
            }}
          >
            {/* level label column */}
            <div className="border-r border-slate-200 bg-slate-50/70 relative">
              {ISA_LEVELS.map(({ level, title, subtitle }) => (
                <div
                  key={level}
                  className="border-b border-slate-200 flex flex-col justify-center px-3"
                  style={{ height: LANE_HEIGHT }}
                >
                  <div className="text-xs font-semibold text-slate-800">{title}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{subtitle}</div>
                </div>
              ))}
              <div
                className="absolute left-0 right-0 bg-slate-50/70 border-r border-slate-200 flex items-center px-3 text-[11px] text-slate-500"
                style={{ top: l0BandTop, height: L0_EXTRA }}
              >
                Warehouse phase bands
              </div>
            </div>

            {/* canvas */}
            <div className="relative" style={{ height: canvasHeight, width: canvasWidth }}>
              {/* lane separators */}
              {ISA_LEVELS.map(({ level }, idx) => (
                <div
                  key={level}
                  className="absolute left-0 right-0 border-b border-slate-200"
                  style={{ top: idx * LANE_HEIGHT, height: LANE_HEIGHT }}
                />
              ))}

              {/* L0 process phase bar */}
              <div
                className="absolute left-0 right-0 border-b border-slate-200 flex items-center"
                style={{ top: l0BandTop, height: L0_EXTRA }}
              >
                <div className="flex-1 grid grid-cols-6 gap-2 px-4">
                  {PHASES.map((p) => (
                    <div key={p.label} className="flex flex-col items-center text-[10px] text-slate-600">
                      <div className="w-full h-3 rounded-full bg-maersk-100" />
                      <span className="mt-1 font-semibold tracking-wide">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* connections — colour-coded */}
              <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight}>
                <defs>
                  <marker id="vsm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                  </marker>
                  <style>{`
                    @keyframes vsm-dash { to { stroke-dashoffset: -24; } }
                    @keyframes vsm-packet { 0%{offset-distance:0%;opacity:.9} 100%{offset-distance:100%;opacity:.9} }
                    .vsm-line { stroke-dasharray: 6 6; animation: vsm-dash 0.9s linear infinite; }
                    .vsm-packet { offset-rotate: 0deg; animation: vsm-packet 2.4s linear infinite; }
                  `}</style>
                </defs>
                {a.links.map((l, idx) => {
                  const src = a.systems.find((sy) => sy.id === l.source);
                  const tgt = a.systems.find((sy) => sy.id === l.target);
                  if (!src || !tgt) return null;
                  const p1 = centerFor(src);
                  const p2 = centerFor(tgt);
                  const isIf = !!l.isInterface;
                  const ifaceItem = a.interfaces.find((i) => i.linkId === l.id);
                  const bidir = isIf && ifaceItem?.direction !== "Unidirectional";
                  const stroke = isIf ? edgeStroke(src.isaLevel) : "#94a3b8";
                  const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
                  const dRev = `M ${p2.x} ${p2.y} L ${p1.x} ${p1.y}`;
                  const ifaceId = ifaceByLink[l.id];
                  const mx = (p1.x + p2.x) / 2;
                  const my = (p1.y + p2.y) / 2;
                  return (
                    <g key={l.id} className="pointer-events-auto">
                      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={stroke + "33"} strokeWidth={isIf ? 3 : 2} />
                      <line className="vsm-line" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={stroke} strokeWidth={isIf ? 2 : 1.5}
                        markerEnd="url(#vsm-arrow)" markerStart={bidir ? "url(#vsm-arrow)" : undefined}
                        opacity={isIf ? 1 : 0.7}
                        style={{ animationDelay: `${(idx % 5) * 0.15}s` }} />
                      {isIf && (
                        <circle r={4} fill={stroke} className="vsm-packet"
                          style={{ offsetPath: `path('${d}')`, animationDelay: `${(idx % 5) * 0.25}s` } as React.CSSProperties} />
                      )}
                      {bidir && (
                        <circle r={4} fill="white" stroke={stroke} strokeWidth={1.5} className="vsm-packet"
                          style={{ offsetPath: `path('${dRev}')`, animationDelay: `${(idx % 5) * 0.25 + 1.2}s` } as React.CSSProperties} />
                      )}
                      {ifaceId && (
                        <g transform={`translate(${mx - 18}, ${my - 26})`}>
                          <rect width={36} height={16} rx={4} fill="#5eead4" stroke="#0f766e" />
                          <text x={18} y={12} fontSize={10} fontWeight={700} textAnchor="middle" fill="#083344">
                            {ifaceId}
                          </text>
                        </g>
                      )}
                      <g transform={`translate(${mx - 20}, ${my - 6})`} style={{ cursor: "pointer" }}
                        onClick={() => setLinkInterface(projectId, l.id, !isIf)}>
                        <circle cx={7} cy={7} r={9} fill={isIf ? "#ccfbf1" : "white"} stroke={isIf ? "#0d9488" : "#94a3b8"} />
                        <text x={7} y={11} fontSize={11} fontWeight={700} textAnchor="middle" fill={isIf ? "#0d9488" : "#94a3b8"} style={{ pointerEvents: "none" }}>I</text>
                        <title>{isIf ? "Interface enabled (bidirectional by default) — click to disable" : "Enable as interface (message exchange)"}</title>
                      </g>
                      <g transform={`translate(${mx + 6}, ${my - 6})`} style={{ cursor: "pointer" }}
                        onClick={() => unlinkSystems(projectId, l.id)}>
                        <circle cx={7} cy={7} r={9} fill="white" stroke="#dc2626" />
                        <text x={7} y={11} fontSize={12} fontWeight={700} textAnchor="middle" fill="#dc2626" style={{ pointerEvents: "none" }}>×</text>
                        <title>Remove link</title>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* nodes */}
              {a.systems.map((sy) => {
                const entry = catalogByKey(sy.catalogKey);
                const top = laneTopFor(sy.isaLevel) + (sy.position?.y ?? 20);
                const left = sy.position?.x ?? 40;
                const isL0Process = sy.isaLevel === 0 && L0_PHASE_KEYS.includes(sy.catalogKey);
                return (
                  <div
                    key={sy.id}
                    className={clsx(
                      "absolute rounded-lg border shadow-sm select-none group",
                      isL0Process
                        ? "bg-maersk-500 text-white border-maersk-700"
                        : "bg-white text-slate-800 border-slate-200 hover:border-maersk-400"
                    )}
                    style={{ top, left, width: NODE_WIDTH, height: NODE_HEIGHT, cursor: "grab" }}
                    onMouseDown={(e) => onNodeMouseDown(e, sy)}
                  >
                    <div className="h-full flex flex-col items-center justify-center px-1 pt-2 pb-1 text-center">
                      <div className={clsx(
                        "h-10 w-10 rounded-md flex items-center justify-center",
                        isL0Process ? "bg-white/20 text-white" : "bg-maersk-50 text-maersk-700"
                      )}>
                        <SystemIcon icon={(entry?.icon ?? "server") as IconKey} className="h-5 w-5" />
                      </div>
                      <div className={clsx("mt-1 text-[11px] font-medium leading-tight line-clamp-2", isL0Process ? "text-white" : "text-slate-700")}>
                        {sy.label}
                      </div>
                    </div>
                  </div>
                );
              })}

              {a.systems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                  Add systems in Concept Design first — VSM mirrors the same layout.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-slate-200 bg-slate-50/60 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Legend</div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
            <LegendSwatch color="#0073ec" label="Data Flow (Maersk WMS)" />
            <LegendSwatch color="#f0b100" label="Data Flow (WCS)" />
            <LegendSwatch color="#4b5563" label="Data Flow (ERP)" />
            <LegendSwatch color="#a855f7" label="Control / Supervision" />
            <LegendSwatch color="#dc2626" label="AutoStore Hardware" />
            <LegendSwatch color="#0e6a86" label="Warehouse Process" />
            <LegendTeal label="I-X · Message Exchange Interface" />
            <LegendChip color="#3da8cc" label="Maersk Hardware" />
          </div>
        </div>
      </section>
      </div>

      {/* palette */}
      <aside className="card p-3 h-fit sticky top-4">
        <div className="mb-2">
          <div className="text-sm font-semibold text-slate-800">System Palette</div>
          <div className="text-[11px] text-slate-500">Click an icon to add it to its ISA-95 level.</div>
        </div>
        <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {ISA_LEVELS.map(({ level, title, subtitle }) => {
            const items = SYSTEM_CATALOG.filter((c) => c.isaLevel === level);
            if (items.length === 0) return null;
            return (
              <div key={level} className="rounded-md border border-slate-200 bg-white">
                <div className="px-2 pt-2 text-[11px] font-semibold text-slate-700">
                  {title}
                  <span className="ml-1 text-slate-400 font-normal">— {subtitle}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-2">
                  {items.map((c) => (
                    <button
                      key={c.key}
                      title={`${c.name} — ${c.description}`}
                      className="flex flex-col items-center justify-center gap-1 rounded-md border border-transparent hover:border-maersk-300 hover:bg-maersk-50 p-2 text-center"
                      onClick={() => addToCanvas(c.key)}
                    >
                      <div className="h-8 w-8 rounded bg-maersk-50 text-maersk-700 flex items-center justify-center">
                        <SystemIcon icon={c.icon} className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] text-slate-700 leading-tight line-clamp-2">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {a.systems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <button
              className="btn-secondary w-full justify-center text-xs"
              onClick={() => a.systems.forEach((sy) => removeSystem(projectId, sy.id))}
              title="Remove all systems"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear canvas
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function MetaCell({ label, value, strong }: { label: string; value?: string; strong?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="uppercase tracking-wide text-[10px] text-slate-500">{label}</span>
      <span className={clsx("text-slate-800", strong && "font-semibold")}>{value || "—"}</span>
    </div>
  );
}
function Divider() { return <span className="text-slate-300">|</span>; }

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={30} height={10}>
        <line x1={0} y1={5} x2={26} y2={5} stroke={color} strokeWidth={2} markerEnd="url(#legend-arrow)" />
        <defs>
          <marker id="legend-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        </defs>
      </svg>
      <span>{label}</span>
    </div>
  );
}
function LegendTeal({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="badge bg-teal-100 text-teal-900 ring-1 ring-teal-500 text-[10px] font-bold">I-X</span>
      <span>{label}</span>
    </div>
  );
}
function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-3 w-6 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
