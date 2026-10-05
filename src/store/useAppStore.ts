import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Project, ProjectArtefacts, ProjectSystem, SystemLink,
  InterfaceItem, UseCase, TestCase, HypercareIssue, HypercareReport, Role,
} from "../types";
import { EMPTY_ARTEFACTS } from "../types";
import { catalogByKey } from "../data/catalog";
import { buildChain, buildExceptions, plainSteps } from "../lib/usecaseTemplates";

// ---- helpers -----------------------------------------------------------
const uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 10);
function seqId(prefix: string, existing: { id: string }[]): string {
  let max = 0;
  for (const e of existing) {
    const m = String(e.id).match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}
const now = () => new Date().toISOString();

function ensureA(record: Record<string, ProjectArtefacts>, id: string): ProjectArtefacts {
  const existing = record[id];
  if (!existing) return { ...EMPTY_ARTEFACTS };
  return {
    ...EMPTY_ARTEFACTS,
    ...existing,
    hypercare: existing.hypercare ?? { ...EMPTY_ARTEFACTS.hypercare },
    tsd: existing.tsd ?? { extraActors: [] },
    interfaces: (existing.interfaces ?? []).map((i) => ({ ...i, direction: i.direction ?? "Bidirectional" })),
    useCases: (existing.useCases ?? []).map((u) => ({ ...u, exceptions: u.exceptions ?? [] })),
  };
}

// Rebuild the Interface Register from the links flagged "I" in Concept Design / VSM.
function syncInterfaces(a: ProjectArtefacts): ProjectArtefacts {
  const nextList: InterfaceItem[] = [];
  for (const l of a.links.filter((x) => x.isInterface)) {
    const existing = a.interfaces.find((i) => i.linkId === l.id);
    if (existing) { nextList.push(existing); continue; }
    const src = a.systems.find((sy) => sy.id === l.source);
    const tgt = a.systems.find((sy) => sy.id === l.target);
    const sEntry = src ? catalogByKey(src.catalogKey) : undefined;
    const tEntry = tgt ? catalogByKey(tgt.catalogKey) : undefined;
    const proto = sEntry?.defaultProtocol ?? tEntry?.defaultProtocol ?? "REST";
    nextList.push({
      id: seqId("IF", [...a.interfaces, ...nextList]),
      linkId: l.id,
      seq: nextList.length + 1,
      sourceSystemId: l.source,
      targetSystemId: l.target,
      direction: "Bidirectional",
      description: `${src?.label ?? "?"} ⇄ ${tgt?.label ?? "?"} interface (${proto}) — request and response.`,
      protocol: proto,
      messageType: `${sEntry?.key ?? "SRC"}_to_${tEntry?.key ?? "TGT"}_Msg`,
      method: proto === "REST" ? "POST" : undefined,
      api: proto === "REST"
        ? `/fbm/${(sEntry?.key ?? "src").toLowerCase()}/${(tEntry?.key ?? "tgt").toLowerCase()}`
        : undefined,
      status: "Identified",
    });
  }
  return { ...a, interfaces: nextList };
}

// ---- state -------------------------------------------------------------
interface AppState {
  currentUser: { name: string; role: Role };
  projects: Project[];
  artefacts: Record<string, ProjectArtefacts>;

  setCurrentUser: (u: { name: string; role: Role }) => void;

  // projects
  createProject: (p: Omit<Project, "id" | "createdAt" | "updatedAt">) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // concept design
  addSystem: (projectId: string, catalogKey: string) => void;
  updateSystem: (projectId: string, systemId: string, patch: Partial<ProjectSystem>) => void;
  removeSystem: (projectId: string, systemId: string) => void;

  // links / vsm
  linkSystems: (projectId: string, source: string, target: string, label?: string) => void;
  unlinkSystems: (projectId: string, linkId: string) => void;
  setLinkInterface: (projectId: string, linkId: string, isInterface: boolean) => void;

  // interfaces
  regenerateInterfaces: (projectId: string) => void;
  updateInterface: (projectId: string, id: string, patch: Partial<InterfaceItem>) => void;

  // use cases
  createUseCase: (projectId: string, interfaceId: string, title?: string) => void;
  regenerateUseCases: (projectId: string) => void;
  updateUseCase: (projectId: string, id: string, patch: Partial<UseCase>) => void;
  removeUseCase: (projectId: string, id: string) => void;
  // id given: replace that use case's exceptions; omitted: fill every use case that has none
  generateExceptions: (projectId: string, id?: string) => void;

  // test cases
  regenerateTestCases: (projectId: string) => void;
  updateTestCase: (projectId: string, id: string, patch: Partial<TestCase>) => void;
  addTestCase: (projectId: string, useCaseId: string) => void;
  removeTestCase: (projectId: string, id: string) => void;

  // hypercare / issue log
  updateHypercare: (projectId: string, patch: Partial<HypercareReport>) => void;
  addHypercareIssue: (projectId: string) => void;
  updateHypercareIssue: (projectId: string, id: string, patch: Partial<HypercareIssue>) => void;
  removeHypercareIssue: (projectId: string, id: string) => void;

  updateTsd: (projectId: string, patch: Partial<import("../types").TsdConfig>) => void;

  // Compatibility no-ops (kept so page code that awaits store actions still works).
  loadProjects: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
}

function mutateArtefacts(
  state: AppState,
  id: string,
  fn: (a: ProjectArtefacts) => ProjectArtefacts
): Partial<AppState> {
  const cur = ensureA(state.artefacts, id);
  return { artefacts: { ...state.artefacts, [id]: fn(cur) } };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: { name: "Administrator", role: "Admin" },
      projects: [],
      artefacts: {},

      setCurrentUser: (u) => set({ currentUser: u }),

      async loadProjects() { /* no-op — persist middleware already loaded */ },
      async loadProject(_projectId) { /* no-op */ },

      createProject(input) {
        const project: Project = {
          ...input,
          id: uid("prj_"),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({
          projects: [project, ...s.projects],
          artefacts: { ...s.artefacts, [project.id]: { ...EMPTY_ARTEFACTS } },
        }));
        return project;
      },
      updateProject(id, patch) {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)),
        }));
      },
      deleteProject(id) {
        set((s) => {
          const { [id]: _drop, ...rest } = s.artefacts;
          return { projects: s.projects.filter((p) => p.id !== id), artefacts: rest };
        });
      },

      addSystem(projectId, catalogKey) {
        const entry = catalogByKey(catalogKey);
        if (!entry) return;
        set((s) => mutateArtefacts(s, projectId, (a) => {
          const sys: ProjectSystem = {
            id: uid("sys_"),
            catalogKey,
            label: entry.name,
            isaLevel: entry.isaLevel,
          };
          return { ...a, systems: [...a.systems, sys] };
        }));
      },
      updateSystem(projectId, systemId, patch) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a, systems: a.systems.map((sy) => (sy.id === systemId ? { ...sy, ...patch } : sy)),
        })));
      },
      removeSystem(projectId, systemId) {
        set((s) => mutateArtefacts(s, projectId, (a) => syncInterfaces({
          ...a,
          systems: a.systems.filter((sy) => sy.id !== systemId),
          links: a.links.filter((l) => l.source !== systemId && l.target !== systemId),
        })));
      },

      linkSystems(projectId, source, target, label) {
        if (source === target) return;
        set((s) => mutateArtefacts(s, projectId, (a) => {
          if (a.links.some((l) => l.source === source && l.target === target)) return a;
          const link: SystemLink = { id: uid("lnk_"), source, target, label, isInterface: false };
          return { ...a, links: [...a.links, link] };
        }));
      },
      unlinkSystems(projectId, linkId) {
        set((s) => mutateArtefacts(s, projectId, (a) => syncInterfaces({
          ...a, links: a.links.filter((l) => l.id !== linkId),
        })));
      },
      setLinkInterface(projectId, linkId, isInterface) {
        set((s) => mutateArtefacts(s, projectId, (a) => syncInterfaces({
          ...a, links: a.links.map((l) => (l.id === linkId ? { ...l, isInterface } : l)),
        })));
      },

      regenerateInterfaces(projectId) {
        set((s) => mutateArtefacts(s, projectId, syncInterfaces));
      },
      updateInterface(projectId, id, patch) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a, interfaces: a.interfaces.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })));
      },

      createUseCase(projectId, interfaceId, title) {
        set((s) => mutateArtefacts(s, projectId, (a) => {
          const iface = a.interfaces.find((i) => i.id === interfaceId);
          if (!iface) return a;
          const src = a.systems.find((sy) => sy.id === iface.sourceSystemId);
          const tgt = a.systems.find((sy) => sy.id === iface.targetSystemId);
          const sLabel = src?.label ?? "Source";
          const tLabel = tgt?.label ?? "Target";
          const bidir = iface.direction !== "Unidirectional";
          const msg = iface.messageType ?? "message";
          const uc: UseCase = {
            id: seqId("UC", a.useCases),
            interfaceId,
            title: title || `${sLabel} to ${tLabel} — ${iface.messageType ?? "Message Exchange"}`,
            primaryActors: [sLabel],
            secondaryActors: [tLabel],
            description: "",
            triggers: "",
            preconditions: [],
            chainOfEvents: buildChain(sLabel, tLabel, msg, iface.protocol, bidir),
            postConditions: [],
            exceptions: buildExceptions(sLabel, tLabel, msg, bidir),
            status: "Draft",
          };
          return { ...a, useCases: [...a.useCases, uc] };
        }));
      },
      regenerateUseCases(projectId) {
        set((s) => mutateArtefacts(s, projectId, (a) => {
          const next: UseCase[] = [...a.useCases];
          a.interfaces.forEach((iface) => {
            if (a.useCases.some((u) => u.interfaceId === iface.id)) return;
            const src = a.systems.find((sy) => sy.id === iface.sourceSystemId);
            const tgt = a.systems.find((sy) => sy.id === iface.targetSystemId);
            const sLabel = src?.label ?? "Source";
            const tLabel = tgt?.label ?? "Target";
            next.push({
              id: seqId("UC", next),
              interfaceId: iface.id,
              title: `${sLabel} to ${tLabel} — ${iface.messageType ?? "Message Exchange"}`,
              primaryActors: [sLabel],
              secondaryActors: [tLabel],
              description: `Exchange of ${iface.messageType ?? "messages"} between ${sLabel} and ${tLabel} over ${iface.protocol}.`,
              triggers: `Business event originating in ${sLabel} that requires ${tLabel} to act.`,
              preconditions: [
                `${sLabel} is online and holds the source data.`,
                `${tLabel} interface endpoint is reachable.`,
                `Message contract for ${iface.messageType ?? "message"} is agreed.`,
              ],
              chainOfEvents: buildChain(sLabel, tLabel, iface.messageType ?? "message", iface.protocol, iface.direction !== "Unidirectional"),
              postConditions: [
                `${tLabel} state reflects the processed message.`,
                `${sLabel} has recorded the acknowledgement / response.`,
                `An audit entry exists for the exchange.`,
              ],
              exceptions: buildExceptions(sLabel, tLabel, iface.messageType ?? "message", iface.direction !== "Unidirectional"),
              status: "Draft",
            });
          });
          return { ...a, useCases: next };
        }));
      },
      updateUseCase(projectId, id, patch) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a, useCases: a.useCases.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        })));
      },
      generateExceptions(projectId, id) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a,
          useCases: a.useCases.map((u) => {
            if (id && u.id !== id) return u;
            if (!id && u.exceptions.length > 0) return u;
            const iface = a.interfaces.find((i) => i.id === u.interfaceId);
            const sLabel = u.primaryActors[0] ?? "Source";
            const tLabel = u.secondaryActors[0] ?? "Target";
            return {
              ...u,
              exceptions: buildExceptions(sLabel, tLabel, iface?.messageType ?? "message", iface?.direction !== "Unidirectional"),
            };
          }),
        })));
      },
      removeUseCase(projectId, id) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a,
          useCases: a.useCases.filter((u) => u.id !== id),
          testCases: a.testCases.filter((t) => t.useCaseId !== id),
        })));
      },

      regenerateTestCases(projectId) {
        set((s) => mutateArtefacts(s, projectId, (a) => {
          const approved = a.useCases.filter((u) => u.status === "Approved");
          const next: TestCase[] = [...a.testCases];
          approved.forEach((uc) => {
            if (next.some((t) => t.useCaseId === uc.id)) return;
            next.push({
              id: seqId("TC", next),
              useCaseId: uc.id,
              scenario: `Verify ${uc.title}`,
              preconditions: uc.preconditions,
              steps: plainSteps(uc.chainOfEvents),
              expectedResults: uc.postConditions,
              status: "Not Run",
            });
          });
          return { ...a, testCases: next };
        }));
      },
      addTestCase(projectId, useCaseId) {
        set((s) => mutateArtefacts(s, projectId, (a) => {
          const uc = a.useCases.find((u) => u.id === useCaseId);
          const tc: TestCase = {
            id: seqId("TC", a.testCases),
            useCaseId,
            scenario: uc ? `Verify ${uc.title}` : "New test scenario",
            preconditions: uc?.preconditions ?? [],
            steps: plainSteps(uc?.chainOfEvents ?? []),
            expectedResults: uc?.postConditions ?? [],
            status: "Not Run",
          };
          return { ...a, testCases: [...a.testCases, tc] };
        }));
      },
      removeTestCase(projectId, id) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a, testCases: a.testCases.filter((t) => t.id !== id),
        })));
      },
      updateTestCase(projectId, id, patch) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a, testCases: a.testCases.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })));
      },

      updateHypercare(projectId, patch) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a, hypercare: { ...a.hypercare, ...patch },
        })));
      },
      addHypercareIssue(projectId) {
        set((s) => mutateArtefacts(s, projectId, (a) => {
          const n = (a.hypercare.issues.length || 0) + 1;
          const issue: HypercareIssue = {
            id: `H-${String(n).padStart(2, "0")}`,
            title: "New issue",
            impact: 3,
            urgency: 3,
            status: "Open",
          };
          return { ...a, hypercare: { ...a.hypercare, issues: [...a.hypercare.issues, issue] } };
        }));
      },
      updateHypercareIssue(projectId, id, patch) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a,
          hypercare: {
            ...a.hypercare,
            issues: a.hypercare.issues.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          },
        })));
      },
      updateTsd(projectId, patch) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a,
          tsd: { ...(a.tsd ?? { extraActors: [] }), ...patch },
        })));
      },
      removeHypercareIssue(projectId, id) {
        set((s) => mutateArtefacts(s, projectId, (a) => ({
          ...a,
          hypercare: { ...a.hypercare, issues: a.hypercare.issues.filter((i) => i.id !== id) },
        })));
      },
    }),
    {
      name: "mif.state.v1",
      version: 3,
      migrate: (persisted) => {
        const st = persisted as { artefacts?: Record<string, ProjectArtefacts> };
        const L1_KEYS = ["RFIDTableTop", "RFIDHandheld", "RFIDTunnel"];
        for (const a of Object.values(st.artefacts ?? {})) {
          for (const sy of a.systems ?? []) {
            if (L1_KEYS.includes(sy.catalogKey) && sy.isaLevel === 0) sy.isaLevel = 1;
          }
        }
        return st as never;
      },
    }
  )
);

export function useProjectArtefacts(projectId: string | undefined): ProjectArtefacts {
  return useAppStore((s) => (projectId ? s.artefacts[projectId] ?? EMPTY_ARTEFACTS : EMPTY_ARTEFACTS));
}
export function useProject(projectId: string | undefined): Project | undefined {
  return useAppStore((s) => s.projects.find((p) => p.id === projectId));
}
