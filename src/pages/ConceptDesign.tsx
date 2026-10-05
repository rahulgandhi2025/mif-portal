import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2, Save, Link2, X, Layers, Pencil } from "lucide-react";
import clsx from "clsx";
import { useAppStore, useProject, useProjectArtefacts } from "../store/useAppStore";
import { SYSTEM_CATALOG, ISA_LEVELS, catalogByKey, type IconKey } from "../data/catalog";
import { SystemIcon } from "../components/SystemIcon";
import type { IsaLevel, ProjectSystem } from "../types";

// Layout constants
const LANE_HEIGHT = 130;
const LEVEL_COL_WIDTH = 150;
const NODE_WIDTH = 96;
const NODE_HEIGHT = 96;

/** Y-offset (inside the lane column) for a system's absolute position. */
function laneTopFor(level: IsaLevel): number {
  const idx = ISA_LEVELS.findIndex((l) => l.level === level);
  return idx * LANE_HEIGHT;
}

function centerFor(sys: ProjectSystem): { x: number; y: number } {
  const cx = (sys.position?.x ?? 40) + NODE_WIDTH / 2;
  const cy = laneTopFor(sys.isaLevel) + (sys.position?.y ?? 20) + NODE_HEIGHT / 2;
  return { x: cx, y: cy };
}

export default function ConceptDesign() {
  const { projectId = "" } = useParams();
  const nav = useNavigate();
  const project = useProject(projectId);
  const a = useProjectArtefacts(projectId);

  const addSystem = useAppStore((s) => s.addSystem);
  const updateSystem = useAppStore((s) => s.updateSystem);
  const removeSystem = useAppStore((s) => s.removeSystem);
  const linkSystems = useAppStore((s) => s.linkSystems);
  const unlinkSystems = useAppStore((s) => s.unlinkSystems);
  const setLinkInterface = useAppStore((s) => s.setLinkInterface);
  const regenerateInterfaces = useAppStore((s) => s.regenerateInterfaces);

  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    level: IsaLevel;
  } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLinkFrom(null); setRenaming(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canvasWidth = useMemo(() => {
    let max = 900;
    for (const sy of a.systems) max = Math.max(max, (sy.position?.x ?? 0) + NODE_WIDTH + 80);
    return max;
  }, [a.systems]);

  const canvasHeight = ISA_LEVELS.length * LANE_HEIGHT;

  function onNodeMouseDown(e: React.MouseEvent, sy: ProjectSystem) {
    if (linkFrom) return; // don't start a drag while linking
    if (e.button !== 0) return;
    e.preventDefault();
    // Track absolute Y across the whole canvas so nodes can move between lanes.
    const startLaneTop = laneTopFor(sy.isaLevel);
    const origAbsY = startLaneTop + (sy.position?.y ?? 20);
    dragState.current = {
      id: sy.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: sy.position?.x ?? 40,
      origY: origAbsY,      // repurposed: origin absolute Y on the canvas
      level: sy.isaLevel,
    };
    const canvasHeight = ISA_LEVELS.length * LANE_HEIGHT;
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      const nextX = Math.max(10, dragState.current.origX + dx);
      // Absolute Y clamped to the canvas; derive lane + intra-lane Y.
      const absY = Math.max(10, Math.min(canvasHeight - NODE_HEIGHT - 10, dragState.current.origY + dy));
      const laneIdx = Math.min(ISA_LEVELS.length - 1, Math.max(0, Math.floor((absY + NODE_HEIGHT / 2) / LANE_HEIGHT)));
      const level = ISA_LEVELS[laneIdx].level;
      const intraY = Math.max(6, absY - laneIdx * LANE_HEIGHT);
      updateSystem(projectId, dragState.current.id, { position: { x: nextX, y: intraY }, isaLevel: level });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onNodeClick(sy: ProjectSystem) {
    if (linkFrom && linkFrom !== sy.id) {
      linkSystems(projectId, linkFrom, sy.id);
      setLinkFrom(null);
      return;
    }
    if (linkFrom === sy.id) {
      setLinkFrom(null);
    }
  }

  function addToCanvas(key: string) {
    const entry = catalogByKey(key);
    if (!entry) return;
    // Find the next free x-slot in that lane so new nodes don't stack on top of each other.
    const inLane = a.systems.filter((sy) => sy.isaLevel === entry.isaLevel);
    const usedRight = inLane.reduce((m, sy) => Math.max(m, (sy.position?.x ?? 0) + NODE_WIDTH), 30);
    addSystem(projectId, key);
    // The store gives new system an id — grab it after the state has updated.
    // Because zustand updates synchronously, we can re-read from the store.
    const latest = useAppStore.getState().artefacts[projectId]?.systems ?? [];
    const created = latest[latest.length - 1];
    if (created) {
      updateSystem(projectId, created.id, { position: { x: usedRight + 20, y: 20 } });
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      {/* ============ Main canvas ============ */}
      <section className="card overflow-hidden">
        {/* Meta strip (FBM ID | Region | Customer | Country | Concept Design) */}
        <div className="grid grid-cols-[150px_1fr] border-b border-slate-200">
          <div className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
            ISA-95 Levels
          </div>
          <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <MetaCell label="FBM ID"        value={project?.fbmId} />
            <Divider />
            <MetaCell label="Region"        value={project?.region} />
            <Divider />
            <MetaCell label="Customer"      value={project?.customerName} />
            <Divider />
            <MetaCell label="Country"       value={project?.country} />
            <Divider />
            <MetaCell label="Concept Design" value={project?.name} strong />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 bg-white">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Layers className="h-4 w-4 text-maersk-700" />
            Click an icon on the right to add it. Drag to reposition — <b>including across ISA-95 levels</b>.
            Click <b>Link</b> on a system, then click another system to connect them.
            On each connection, click the <b>I</b> handle to mark it as an interface (message exchange). Interfaces show up in the VSM &amp; Interface Register.
            {linkFrom && (
              <span className="ml-2 badge bg-maersk-50 text-maersk-800 ring-1 ring-maersk-200">
                Linking from selected system — click a target (Esc to cancel)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              onClick={() => {
                regenerateInterfaces(projectId);
                nav(`/projects/${projectId}/vsm`);
              }}
            >
              <Save className="h-4 w-4" /> Save & Open VSM
            </button>
          </div>
        </div>

        {/* Lanes + canvas */}
        <div className="overflow-auto">
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `${LEVEL_COL_WIDTH}px 1fr`,
              minHeight: canvasHeight,
              minWidth: LEVEL_COL_WIDTH + canvasWidth,
            }}
          >
            {/* Left column: level labels */}
            <div className="border-r border-slate-200 bg-slate-50/70">
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
            </div>

            {/* Canvas area */}
            <div
              ref={canvasRef}
              className="relative"
              style={{ height: canvasHeight, width: canvasWidth }}
              onClick={(e) => { if (e.target === e.currentTarget) setLinkFrom(null); }}
            >
              {/* lane separators */}
              {ISA_LEVELS.map(({ level }, idx) => (
                <div
                  key={level}
                  className="absolute left-0 right-0 border-b border-slate-200"
                  style={{ top: idx * LANE_HEIGHT, height: LANE_HEIGHT }}
                />
              ))}

              {/* connections */}
              <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight}>
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#0e6a86" />
                  </marker>
                  <style>{`
                    @keyframes mif-dash { to { stroke-dashoffset: -24; } }
                    @keyframes mif-packet {
                      0%   { offset-distance: 0%;   opacity: 0.9; }
                      100% { offset-distance: 100%; opacity: 0.9; }
                    }
                    .mif-flow-line { stroke-dasharray: 6 6; animation: mif-dash 0.9s linear infinite; }
                    .mif-flow-packet {
                      offset-rotate: 0deg;
                      animation: mif-packet 2.4s linear infinite;
                    }
                  `}</style>
                </defs>
                {a.links.map((l, idx) => {
                  const src = a.systems.find((sy) => sy.id === l.source);
                  const tgt = a.systems.find((sy) => sy.id === l.target);
                  if (!src || !tgt) return null;
                  const p1 = centerFor(src);
                  const p2 = centerFor(tgt);
                  const pathId = `link-path-${l.id}`;
                  const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
                  const iface = !!l.isInterface;
                  const stroke = iface ? "#0d9488" : "#94a3b8";       // teal when interface, slate otherwise
                  const packet = iface ? "#14b8a6" : "#64748b";
                  const halo   = iface ? "#ccfbf1" : "#e2e8f0";
                  const mx = (p1.x + p2.x) / 2;
                  const my = (p1.y + p2.y) / 2;
                  return (
                    <g key={l.id} className="pointer-events-auto">
                      <path id={pathId} d={d} fill="none" stroke="transparent" />
                      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={halo} strokeWidth={3} />
                      <line
                        className="mif-flow-line"
                        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                        stroke={stroke} strokeWidth={1.8} markerEnd="url(#arrow)"
                        markerStart={iface && a.interfaces.find((x) => x.linkId === l.id)?.direction !== "Unidirectional" ? "url(#arrow)" : undefined}
                        style={{ animationDelay: `${(idx % 5) * 0.15}s` }}
                      />
                      <circle
                        r={4} fill={packet}
                        className="mif-flow-packet"
                        style={{ offsetPath: `path('${d}')`, animationDelay: `${(idx % 5) * 0.25}s` } as React.CSSProperties}
                      />
                      {/* interface toggle */}
                      <g transform={`translate(${mx - 20}, ${my - 10})`} style={{ cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); setLinkInterface(projectId, l.id, !iface); }}>
                        <circle cx={7} cy={7} r={9} fill="white" stroke={iface ? "#0d9488" : "#94a3b8"} />
                        <text x={7} y={11} fontSize={11} fontWeight={700} textAnchor="middle" fill={iface ? "#0d9488" : "#94a3b8"}>I</text>
                        <title>{iface ? "Interface enabled — click to disable" : "Enable as interface (message exchange)"}</title>
                      </g>
                      {/* unlink handle */}
                      <g transform={`translate(${mx + 6}, ${my - 10})`} style={{ cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); unlinkSystems(projectId, l.id); }}>
                        <circle cx={7} cy={7} r={9} fill="white" stroke="#dc2626" />
                        <text x={7} y={11} fontSize={12} fontWeight={700} textAnchor="middle" fill="#dc2626">×</text>
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
                const isLinkSource = linkFrom === sy.id;
                return (
                  <div
                    key={sy.id}
                    className={clsx(
                      "absolute rounded-lg border bg-white shadow-sm select-none group",
                      isLinkSource ? "border-maersk-700 ring-2 ring-maersk-200" : "border-slate-200 hover:border-maersk-400"
                    )}
                    style={{
                      top,
                      left,
                      width: NODE_WIDTH,
                      height: NODE_HEIGHT,
                      cursor: linkFrom ? "crosshair" : "grab",
                    }}
                    onMouseDown={(e) => onNodeMouseDown(e, sy)}
                    onClick={(e) => { e.stopPropagation(); onNodeClick(sy); }}
                  >
                    <div className="h-full flex flex-col items-center justify-center px-1 pt-2 pb-1 text-center">
                      <div className="h-10 w-10 rounded-md bg-maersk-50 text-maersk-700 flex items-center justify-center">
                        <SystemIcon icon={(entry?.icon ?? "server") as IconKey} className="h-5 w-5" />
                      </div>
                      {renaming === sy.id ? (
                        <input
                          autoFocus
                          className="mt-1 w-full text-[11px] text-center rounded border border-maersk-300 px-1 py-0.5 focus:outline-none"
                          defaultValue={sy.label}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => { updateSystem(projectId, sy.id, { label: e.target.value }); setRenaming(null); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") setRenaming(null);
                          }}
                        />
                      ) : (
                        <div
                          className="mt-1 text-[11px] font-medium text-slate-700 leading-tight line-clamp-2"
                          onDoubleClick={(e) => { e.stopPropagation(); setRenaming(sy.id); }}
                          title="Double-click to rename"
                        >
                          {sy.label}
                        </div>
                      )}
                    </div>

                    {/* hover actions */}
                    <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
                      <button
                        title="Rename"
                        className="h-6 w-6 rounded-full bg-white border border-slate-400 text-slate-600 flex items-center justify-center shadow-sm"
                        onClick={(e) => { e.stopPropagation(); setRenaming(sy.id); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        title="Link to another system"
                        className="h-6 w-6 rounded-full bg-white border border-maersk-500 text-maersk-700 flex items-center justify-center shadow-sm"
                        onClick={(e) => { e.stopPropagation(); setLinkFrom(sy.id); }}
                      >
                        <Link2 className="h-3 w-3" />
                      </button>
                      <button
                        title="Remove system"
                        className="h-6 w-6 rounded-full bg-white border border-rose-400 text-rose-600 flex items-center justify-center shadow-sm"
                        onClick={(e) => { e.stopPropagation(); removeSystem(projectId, sy.id); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* empty state per lane */}
              {a.systems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                  Click an icon on the right to place a system in the correct ISA-95 level.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ Right palette ============ */}
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
              title="Remove all systems from this canvas"
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
