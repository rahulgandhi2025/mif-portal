import type { ProjectArtefacts, InterfaceStatus } from "../types";

const IF_WEIGHT: Record<InterfaceStatus, number> = {
  Identified: 0.1, "In Design": 0.3, "In Development": 0.5, "In Testing": 0.75, Approved: 1, Deployed: 1,
};

export interface ProgressStep { key: string; label: string; pct: number; detail: string }
export interface ProjectProgress { pct: number; steps: ProgressStep[] }

export function projectProgress(a: ProjectArtefacts): ProjectProgress {
  const ratio = (n: number, d: number) => (d === 0 ? 0 : n / d);
  const ifDone = a.interfaces.reduce((n, i) => n + IF_WEIGHT[i.status], 0);
  const ucApproved = a.useCases.filter((u) => u.status === "Approved").length;
  const tcPassed = a.testCases.filter((t) => t.status === "Passed").length;
  const conceptPct = a.systems.length >= 2 && a.links.length >= 1 ? 1 : a.systems.length > 0 ? 0.4 : 0;

  const steps: ProgressStep[] = [
    { key: "concept", label: "Concept", pct: conceptPct, detail: `${a.systems.length} systems · ${a.links.length} links` },
    { key: "if", label: "Interfaces", pct: ratio(ifDone, a.interfaces.length), detail: `${a.interfaces.length} interfaces` },
    { key: "uc", label: "Use Cases", pct: ratio(ucApproved, a.useCases.length), detail: `${ucApproved}/${a.useCases.length} approved` },
    { key: "sit", label: "SIT", pct: ratio(tcPassed, a.testCases.length), detail: `${tcPassed}/${a.testCases.length} passed` },
  ];
  const pct = Math.round((steps.reduce((n, s) => n + s.pct, 0) / steps.length) * 100);
  return { pct, steps };
}
