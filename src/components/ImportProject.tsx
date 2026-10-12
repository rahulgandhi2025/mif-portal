import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { Modal } from "./Modal";
import { useAppStore } from "../store/useAppStore";
import { parseArchive, type ParsedArchive } from "../lib/projectArchive";

export function ImportProjectButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const projects = useAppStore((s) => s.projects);
  const importProject = useAppStore((s) => s.importProject);
  const [parsed, setParsed] = useState<ParsedArchive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"replace" | "copy">("copy");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again after a cancel/failure
    if (!file) return;
    try {
      const result = parseArchive(await file.text());
      setError(null);
      setMode("copy");
      setParsed(result);
    } catch (err) {
      setParsed(null);
      setError((err as Error).message);
    }
  }

  function close() { setParsed(null); setError(null); }

  function confirmImport() {
    if (!parsed) return;
    const { project, artefacts } = parsed.archive;
    const p = importProject(project, artefacts, conflict ? mode : "replace");
    close();
    nav(`/projects/${p.id}`);
  }

  const conflict = parsed ? projects.find((p) => p.id === parsed.archive.project.id) : undefined;
  const a = parsed?.archive.artefacts;

  return (
    <>
      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
      <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4" /> Import Project
      </button>

      <Modal open={!!error} onClose={close} title="Import failed">
        <p className="text-sm text-rose-600">{error}</p>
        <div className="mt-5 flex justify-end"><button className="btn-secondary" onClick={close}>Close</button></div>
      </Modal>

      <Modal open={!!parsed} onClose={close} title="Import project">
        {parsed && a && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold text-slate-900">{parsed.archive.project.name}</div>
              <div className="text-xs text-slate-500">
                FBM {parsed.archive.project.fbmId} · {parsed.archive.project.customerName}
                {parsed.archive.exportedAt && ` · exported ${new Date(parsed.archive.exportedAt).toLocaleString()}`}
              </div>
              <div className="mt-2 text-slate-700">
                {a.systems.length} systems · {a.links.length} links · {a.interfaces.length} interfaces · {a.useCases.length} use cases · {a.testCases.length} test cases · {a.hypercare.issues.length} issues
              </div>
            </div>

            {conflict && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="text-amber-900">A project with this ID already exists: <b>{conflict.name}</b>.</div>
                <label className="flex items-start gap-2">
                  <input type="radio" checked={mode === "copy"} onChange={() => setMode("copy")} />
                  <span>Import as a separate copy (keeps the existing project)</span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
                  <span>Replace the existing project with the imported one</span>
                </label>
              </div>
            )}

            {parsed.warnings.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-amber-800 space-y-1">
                {parsed.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}

            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={close}>Cancel</button>
              <button className="btn-primary" onClick={confirmImport}>
                {conflict && mode === "replace" ? "Replace project" : "Import project"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
