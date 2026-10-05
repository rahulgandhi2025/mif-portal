import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, TrendingUp, Layers, Cable, CheckCircle2, Trash2, Pencil } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { NewProjectDialog, PROJECT_STAGES } from "./NewProject";
import { projectProgress } from "../lib/progress";
import { EMPTY_ARTEFACTS } from "../types";
import type { Project, ProjectStatus } from "../types";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Planning: "bg-amber-50 text-amber-800 ring-amber-200",
  Execution: "bg-blue-50 text-blue-800 ring-blue-200",
  "Go Live": "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Hypercare: "bg-purple-50 text-purple-800 ring-purple-200",
  "Completed (BAU)": "bg-slate-100 text-slate-700 ring-slate-300",
  "On Hold": "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const [editing, setEditing] = useState<Project | undefined>();
  const artefacts = useAppStore((s) => s.artefacts);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((p) =>
      [p.name, p.fbmId, p.customerName, p.country, p.region, p.site, p.leadArchitect, p.status]
        .some((f) => f.toLowerCase().includes(term))
    );
  }, [q, projects]);

  const totals = useMemo(() => {
    let interfaces = 0, useCases = 0, tests = 0;
    for (const a of Object.values(artefacts)) {
      interfaces += a.interfaces.length;
      useCases += a.useCases.length;
      tests += a.testCases.length;
    }
    return { interfaces, useCases, tests };
  }, [artefacts]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
      {/* Intro */}
      <section className="card overflow-hidden relative text-white">
        <img
          src="/brand/hero.jpeg"
          alt="Maersk container truck at warehouse dock"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-maersk-900/85 via-maersk-800/70 to-maersk-600/40" />
        <div className="relative p-8 md:p-10 max-w-3xl">
          <div className="text-xs uppercase tracking-[0.2em] text-maersk-100/90 mb-2">
            Maersk · Automation Operations Technology
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
            Maersk Integration Framework
          </h1>
          <p className="mt-3 text-sm md:text-base text-white/90">
            A governance-driven methodology for system integration — combining clear phases,
            defined deliverables and robust testing to deliver reliable, scalable solutions for
            Maersk's global warehouse operations. Plan with Concept Design, VSM, Use Cases and
            Sequence Diagrams; execute with Technical Architecture, FDD and layered testing
            (FAT → SIMT → UT → SIT → UAT).
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {["Planning", "Execution", "Go Live", "Hypercare", "Completed (BAU)"].map((s) => (
              <span key={s} className="badge bg-white/15 ring-1 ring-white/30 text-white backdrop-blur-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Projects" value={projects.length} />
        <StatCard icon={Layers} label="Systems Modelled" value={Object.values(artefacts).reduce((n, a) => n + a.systems.length, 0)} />
        <StatCard icon={Cable} label="Interfaces" value={totals.interfaces} />
        <StatCard icon={CheckCircle2} label="SIT Cases" value={totals.tests} />
      </section>

      {/* Projects */}
      <section className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold">Projects</h2>
            <p className="text-xs text-slate-500">All MIF projects. Search by name, FBM ID, customer, site.</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search projects…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New Project
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {projects.length === 0
              ? "No projects yet. Click New Project to create your first MIF project."
              : "No projects match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">FBM ID</th>
                  <th className="text-left px-4 py-2 font-medium">Project</th>
                  <th className="text-left px-4 py-2 font-medium">Customer</th>
                  <th className="text-left px-4 py-2 font-medium">Site</th>
                  <th className="text-left px-4 py-2 font-medium">Region</th>
                  <th className="text-left px-4 py-2 font-medium">Project Lead</th>
                  <th className="text-left px-4 py-2 font-medium">Stage</th>
                  <th className="text-left px-4 py-2 font-medium">Progress</th>
                  <th className="px-2 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const prog = projectProgress(artefacts[p.id] ?? EMPTY_ARTEFACTS);
                  const pct = prog.pct;
                  return (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-xs">{p.fbmId}</td>
                      <td className="px-4 py-2">
                        <Link className="text-maersk-700 font-medium hover:underline" to={`/projects/${p.id}`}>
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{p.customerName}</td>
                      <td className="px-4 py-2">{p.site}, {p.country}</td>
                      <td className="px-4 py-2">{p.region}</td>
                      <td className="px-4 py-2">{p.leadArchitect}</td>
                      <td className="px-4 py-2">
                        <select
                          className={"badge ring-1 cursor-pointer pr-1 " + STATUS_COLORS[p.status]}
                          value={p.status}
                          title="Change project stage"
                          onChange={(e) => updateProject(p.id, { status: e.target.value as ProjectStatus })}
                        >
                          {PROJECT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2 w-64" title={prog.steps.map((s) => `${s.label}: ${Math.round(s.pct * 100)}% (${s.detail})`).join("\n")}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-maersk-600 transition-all" style={{ width: pct + "%" }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                        </div>
                        <div className="mt-1 flex gap-1">
                          {prog.steps.map((s) => (
                            <span
                              key={s.key}
                              className={"text-[10px] px-1 rounded " + (s.pct >= 1 ? "bg-emerald-50 text-emerald-700" : s.pct > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500")}
                            >
                              {s.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <button className="btn-ghost !p-1" title="Edit project" onClick={() => setEditing(p)}>
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          className="btn-ghost !p-1"
                          title="Delete project"
                          onClick={() => {
                            if (confirm(`Delete project "${p.name}" (${p.fbmId})? This removes all its artefacts and cannot be undone.`)) {
                              deleteProject(p.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <NewProjectDialog open={open} onClose={() => setOpen(false)} />
      <NewProjectDialog open={!!editing} project={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-maersk-50 text-maersk-700 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}
