import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/Modal";
import { useAppStore } from "../store/useAppStore";
import type { Project, ProjectStatus, Region } from "../types";

const REGIONS: Region[] = ["APA", "EUR", "LAM", "NAM", "MEA", "IMEA", "Global"];
export const PROJECT_STAGES: ProjectStatus[] = [
  "Planning",
  "Execution",
  "Go Live",
  "Hypercare",
  "Completed (BAU)",
  "On Hold",
];

export function NewProjectDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project }) {
  const create = useAppStore((s) => s.createProject);
  const update = useAppStore((s) => s.updateProject);
  const nav = useNavigate();
  const [form, setForm] = useState({
    fbmId: "",
    name: "",
    customerName: "",
    country: "",
    region: "EUR" as Region,
    site: "",
    leadArchitect: "",
    status: "Planning" as ProjectStatus,
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    const { fbmId, name, customerName, country, region, site, leadArchitect, status } = project;
    setForm({ fbmId, name, customerName, country, region, site, leadArchitect, status });
    setErr(null);
  }, [open, project]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.fbmId || !form.name || !form.customerName) {
      setErr("FBM ID, Project Name and Customer Name are required.");
      return;
    }
    if (project) {
      update(project.id, form);
      onClose();
      return;
    }
    try {
      const p = await create(form);
      onClose();
      nav(`/projects/${p.id}/concept-design`);
    } catch (e) { setErr((e as Error).message || "failed to create project"); }
  }

  return (
    <Modal open={open} onClose={onClose} title={project ? "Edit Project" : "Create New MIF Project"} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="FBM ID *">
          <input className="input" value={form.fbmId} onChange={(e) => set("fbmId", e.target.value)} placeholder="e.g. FBM-2049" />
        </Field>
        <Field label="Project Name *">
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="On Running Cajamar" />
        </Field>
        <Field label="Customer Name *">
          <input className="input" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="On Running" />
        </Field>
        <Field label="Site">
          <input className="input" value={form.site} onChange={(e) => set("site", e.target.value)} placeholder="Cajamar DC" />
        </Field>
        <Field label="Country">
          <input className="input" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Spain" />
        </Field>
        <Field label="Region">
          <select className="input" value={form.region} onChange={(e) => set("region", e.target.value as Region)}>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Project Lead">
          <input className="input" value={form.leadArchitect} onChange={(e) => set("leadArchitect", e.target.value)} placeholder="Rahul Gandhi" />
        </Field>
        <Field label="Status">
          <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
            {PROJECT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>{project ? "Save changes" : "Create & Open Concept Design"}</button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
