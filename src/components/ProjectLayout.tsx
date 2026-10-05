import { NavLink, Outlet, useParams, Navigate } from "react-router-dom";
import {
  Layers, Workflow, Cable, FileText, GitBranch, ClipboardCheck, ScrollText, Download, LifeBuoy,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { NewProjectDialog, PROJECT_STAGES } from "../pages/NewProject";
import { projectProgress } from "../lib/progress";
import type { ProjectStatus } from "../types";
import { useAppStore, useProject, useProjectArtefacts } from "../store/useAppStore";

const TABS = [
  { to: "concept-design", label: "Concept Design", icon: Layers },
  { to: "vsm", label: "Value Stream Map", icon: Workflow },
  { to: "interfaces", label: "Interface Register", icon: Cable },
  { to: "use-cases", label: "Use Cases", icon: FileText },
  { to: "sequence-diagrams", label: "Sequence Diagrams", icon: GitBranch },
  { to: "sit-tests", label: "SIT Test Cases", icon: ClipboardCheck },
  { to: "traceability", label: "Traceability", icon: ScrollText },
  { to: "reports", label: "Reports", icon: Download },
  { to: "issue-log", label: "Issue Log", icon: LifeBuoy },
];

export default function ProjectLayout() {
  const { projectId } = useParams();
  const project = useProject(projectId);
  const a = useProjectArtefacts(projectId);
  const loadProject = useAppStore((s) => s.loadProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => { if (projectId) loadProject(projectId).catch(() => {}); }, [projectId, loadProject]);

  if (!project) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            FBM {project.fbmId} · {project.customerName}
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
          <div className="text-sm text-slate-500 mt-1">
            {project.site}, {project.country} · {project.region} · Project Lead: {project.leadArchitect}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-500">
            Stage
            <select
              className="input !py-1 !text-xs !w-40"
              value={project.status}
              onChange={(e) => updateProject(project.id, { status: e.target.value as ProjectStatus })}
            >
              {PROJECT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <span className="badge bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
            {projectProgress(a).pct}% complete
          </span>
          <button className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit project
          </button>
          <span className="badge bg-slate-100 text-slate-700">
            {a.systems.length} systems · {a.interfaces.length} interfaces · {a.useCases.length} UCs · {a.testCases.length} SITs
          </span>
        </div>
      </div>

      <div className="card mb-6 p-1 flex flex-wrap gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-maersk-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </NavLink>
          );
        })}
      </div>

      <Outlet />
      <NewProjectDialog open={editOpen} project={project} onClose={() => setEditOpen(false)} />
    </div>
  );
}
