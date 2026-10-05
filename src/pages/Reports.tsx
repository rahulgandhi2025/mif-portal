import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { useProject, useProjectArtefacts } from "../store/useAppStore";
import { downloadText } from "../lib/download";
import { catalogByKey } from "../data/catalog";

export default function Reports() {
  const { projectId = "" } = useParams();
  const p = useProject(projectId);
  const a = useProjectArtefacts(projectId);
  if (!p) return null;

  const nameSlug = p.name.replace(/[^A-Za-z0-9]+/g, "_");

  function label(sysId: string) {
    return a.systems.find((sy) => sy.id === sysId)?.label ?? "?";
  }

  function bullets(list: string[]): string {
    return list.length ? list.map((x) => `- ${x}`).join("\n") : "_(none)_";
  }

  function conceptDesignMd(): string {
    const grouped: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const sy of a.systems) {
      const c = catalogByKey(sy.catalogKey);
      grouped[sy.isaLevel].push(`- **${sy.label}** — ${c?.category ?? ""} (${c?.defaultProtocol ?? ""})`);
    }
    const lines = [
      `# Concept Design — ${p!.name}`,
      "",
      `FBM ${p!.fbmId} · ${p!.customerName} · ${p!.site}, ${p!.country}`,
      "",
      "## Systems by ISA-95 Level",
      "",
    ];
    for (let lvl = 5 as 0 | 1 | 2 | 3 | 4 | 5; lvl >= 0; lvl = (lvl - 1) as 0 | 1 | 2 | 3 | 4 | 5) {
      lines.push(`### Level ${lvl}`);
      lines.push(grouped[lvl].length ? grouped[lvl].join("\n") : "_(none)_");
      lines.push("");
    }
    lines.push("## System Connections");
    lines.push(
      a.links.length
        ? a.links.map((l) => `- ${label(l.source)} → ${label(l.target)}`).join("\n")
        : "_(none)_"
    );
    return lines.join("\n");
  }

  function vsmMd(): string {
    const lines = [
      `# Value Stream Map — ${p!.name}`,
      "",
      "```mermaid",
      "flowchart TB",
    ];
    for (const sy of a.systems) {
      lines.push(`  ${sy.id.replace(/[^A-Za-z0-9]/g, "_")}["${sy.label} (L${sy.isaLevel})"]`);
    }
    for (const l of a.links) {
      lines.push(`  ${l.source.replace(/[^A-Za-z0-9]/g, "_")} --> ${l.target.replace(/[^A-Za-z0-9]/g, "_")}`);
    }
    lines.push("```");
    return lines.join("\n");
  }

  function interfacesMd(): string {
    const rows = [
      "| ID | Source | Target | Message Type | Protocol | Description | Status |",
      "|----|--------|--------|--------------|----------|-------------|--------|",
      ...a.interfaces.map(
        (i) =>
          `| ${i.id} | ${label(i.sourceSystemId)} | ${label(i.targetSystemId)} | ${i.messageType ?? ""} | ${i.protocol} | ${i.description.replace(/\|/g, "/")} | ${i.status} |`
      ),
    ];
    return `# Interface Register — ${p!.name}\n\n${rows.join("\n")}`;
  }

  function useCasesMd(): string {
    const blocks = a.useCases.map((uc) => {
      const iface = a.interfaces.find((i) => i.id === uc.interfaceId);
      return [
        `## ${uc.id} — ${uc.title}`,
        `_Interface: ${iface?.id ?? "?"} · Status: ${uc.status}_`,
        "",
        "**Primary Actors**",
        bullets(uc.primaryActors),
        "",
        "**Secondary Actors**",
        bullets(uc.secondaryActors),
        "",
        `**Description**\n\n${uc.description}`,
        "",
        `**Triggers**\n\n${uc.triggers}`,
        "",
        "**Preconditions**",
        bullets(uc.preconditions),
        "",
        "**Chain of Events**",
        bullets(uc.chainOfEvents),
        "",
        "**Post-Conditions**",
        bullets(uc.postConditions),
      ].join("\n");
    });
    return `# Use Cases — ${p!.name}\n\n${blocks.join("\n\n---\n\n")}`;
  }

  function sitMd(): string {
    const blocks = a.testCases.map((t) => {
      const uc = a.useCases.find((u) => u.id === t.useCaseId);
      return [
        `## ${t.id} — ${t.scenario}`,
        `_Use Case: ${uc?.id ?? "?"} · Status: ${t.status}_`,
        "",
        "**Preconditions**",
        bullets(t.preconditions),
        "",
        "**Steps**",
        bullets(t.steps),
        "",
        "**Expected Results**",
        bullets(t.expectedResults),
      ].join("\n");
    });
    return `# Site Integration Test Cases — ${p!.name}\n\n${blocks.join("\n\n---\n\n")}`;
  }

  const reports = [
    { key: "concept-design", label: "Concept Design", body: conceptDesignMd },
    { key: "vsm", label: "Value Stream Map", body: vsmMd },
    { key: "interfaces", label: "Interface Register", body: interfacesMd },
    { key: "use-cases", label: "Use Cases", body: useCasesMd },
    { key: "sit-tests", label: "SIT Test Cases", body: sitMd },
  ];

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">Reports</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Download MIF planning artefacts as Markdown. Diagrams embed as Mermaid so they render in any
          Markdown viewer that supports it (GitHub, GitLab, VS Code).
        </p>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.key} className="card p-5 flex flex-col">
            <div className="text-base font-semibold">{r.label}</div>
            <p className="text-sm text-slate-500 mt-1 flex-1">
              Structured Markdown export of the current {r.label.toLowerCase()} artefact.
            </p>
            <button
              className="btn-primary mt-4 self-start"
              onClick={() => downloadText(`${nameSlug}_${r.key}.md`, r.body())}
            >
              <Download className="h-4 w-4" /> Download .md
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
