import { useParams } from "react-router-dom";
import { useProjectArtefacts, useProject } from "../store/useAppStore";

export default function Traceability() {
  const { projectId = "" } = useParams();
  const p = useProject(projectId);
  const a = useProjectArtefacts(projectId);

  const rows = a.interfaces.map((iface) => {
    const src = a.systems.find((sy) => sy.id === iface.sourceSystemId);
    const tgt = a.systems.find((sy) => sy.id === iface.targetSystemId);
    const uc = a.useCases.find((u) => u.interfaceId === iface.id);
    const tests = uc ? a.testCases.filter((t) => t.useCaseId === uc.id) : [];
    return { iface, src, tgt, uc, tests };
  });

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">Traceability Matrix</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Full traceability across the MIF Planning phase artefacts:
          <br />
          <span className="font-mono text-xs">
            Project → Concept Design (systems) → VSM (link) → Interface → Use Case → SIT Test
          </span>
        </p>
      </section>

      <section className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Project</th>
              <th className="text-left px-4 py-2 font-medium">Source (Concept)</th>
              <th className="text-left px-4 py-2 font-medium">Target (Concept)</th>
              <th className="text-left px-4 py-2 font-medium">VSM Link</th>
              <th className="text-left px-4 py-2 font-medium">Interface</th>
              <th className="text-left px-4 py-2 font-medium">Use Case</th>
              <th className="text-left px-4 py-2 font-medium">SIT Tests</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-slate-500 text-sm">No traceable rows yet.</td></tr>
            )}
            {rows.map(({ iface, src, tgt, uc, tests }) => (
              <tr key={iface.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2 font-mono text-xs">{p?.fbmId ?? "?"}</td>
                <td className="px-4 py-2">{src?.label ?? "?"} <span className="text-slate-400">(L{src?.isaLevel})</span></td>
                <td className="px-4 py-2">{tgt?.label ?? "?"} <span className="text-slate-400">(L{tgt?.isaLevel})</span></td>
                <td className="px-4 py-2 font-mono text-xs">{iface.linkId ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{iface.id} <span className="text-slate-400">· {iface.status}</span></td>
                <td className="px-4 py-2 font-mono text-xs">{uc?.id ?? "—"} <span className="text-slate-400">{uc?.status ? `· ${uc.status}` : ""}</span></td>
                <td className="px-4 py-2 font-mono text-xs">
                  {tests.length === 0 ? "—" : tests.map((t) => `${t.id} (${t.status})`).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
