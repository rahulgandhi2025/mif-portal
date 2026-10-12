import type { Project, ProjectArtefacts } from "../types";
import { EMPTY_ARTEFACTS, EMPTY_HYPERCARE, EMPTY_TSD } from "../types";
import { catalogByKey } from "../data/catalog";
import { downloadText } from "./download";
import { useAppStore } from "../store/useAppStore";

export const ARCHIVE_FORMAT = "mif-project-archive";
export const ARCHIVE_VERSION = 1;
export const ARCHIVE_EXTENSION = ".mifproject.json";

export interface ProjectArchive {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  exportedAt: string;
  project: Project;
  artefacts: ProjectArtefacts;
}

export interface ParsedArchive {
  archive: ProjectArchive;
  warnings: string[];
}

export function buildArchive(project: Project, artefacts: ProjectArtefacts | undefined): ProjectArchive {
  return {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    project,
    artefacts: normalizeArtefacts(artefacts),
  };
}

export function exportProjectToFile(projectId: string): boolean {
  const { projects, artefacts } = useAppStore.getState();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return false;
  const archive = buildArchive(project, artefacts[projectId]);
  const slug = `${project.fbmId}_${project.name}`.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "project";
  downloadText(`${slug}${ARCHIVE_EXTENSION}`, JSON.stringify(archive, null, 2), "application/json");
  return true;
}

// Fills any section missing from an older/partial archive so the project always has the full shape.
export function normalizeArtefacts(a: Partial<ProjectArtefacts> | undefined): ProjectArtefacts {
  const src = a ?? {};
  return {
    ...EMPTY_ARTEFACTS,
    ...src,
    systems: src.systems ?? [],
    links: src.links ?? [],
    interfaces: (src.interfaces ?? []).map((i) => ({ ...i, direction: i.direction ?? "Bidirectional" })),
    useCases: (src.useCases ?? []).map((u) => ({ ...u, exceptions: u.exceptions ?? [] })),
    testCases: src.testCases ?? [],
    hypercare: { ...EMPTY_HYPERCARE, ...(src.hypercare ?? {}), issues: src.hypercare?.issues ?? [] },
    tsd: { ...EMPTY_TSD, ...(src.tsd ?? {}), extraActors: src.tsd?.extraActors ?? [] },
    audit: src.audit ?? [],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const SECTIONS = ["systems", "links", "interfaces", "useCases", "testCases", "audit"] as const;
const PROJECT_STRINGS = ["id", "fbmId", "name", "customerName", "country", "region", "site", "leadArchitect", "status"] as const;

// Throws an Error with a user-readable message when the file is not a usable archive.
export function parseArchive(text: string): ParsedArchive {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!isObj(raw) || raw.format !== ARCHIVE_FORMAT) {
    throw new Error("This is not a MIF project archive (missing or wrong \"format\").");
  }
  if (typeof raw.version !== "number" || raw.version < 1) {
    throw new Error("The archive has no valid version.");
  }
  if (raw.version > ARCHIVE_VERSION) {
    throw new Error(`The archive was created by a newer version of the portal (archive v${raw.version}, this portal supports v${ARCHIVE_VERSION}).`);
  }
  if (!isObj(raw.project)) throw new Error("The archive does not contain a project.");
  if (!isObj(raw.artefacts)) throw new Error("The archive does not contain project artefacts.");

  const p = raw.project;
  for (const k of PROJECT_STRINGS) {
    if (typeof p[k] !== "string") throw new Error(`Project field "${k}" is missing or not text.`);
  }
  if (!(p.id as string).trim()) throw new Error("Project has an empty id.");

  const art = raw.artefacts;
  for (const k of SECTIONS) {
    if (art[k] !== undefined && !Array.isArray(art[k])) throw new Error(`Artefact section "${k}" must be a list.`);
  }
  if (art.hypercare !== undefined && !isObj(art.hypercare)) throw new Error('Artefact section "hypercare" is invalid.');
  if (art.tsd !== undefined && !isObj(art.tsd)) throw new Error('Artefact section "tsd" is invalid.');
  for (const k of SECTIONS) {
    for (const item of (art[k] as unknown[] | undefined) ?? []) {
      if (!isObj(item)) throw new Error(`Artefact section "${k}" contains an invalid entry.`);
    }
  }

  const project = { ...(p as unknown as Project) };
  const artefacts = normalizeArtefacts(art as Partial<ProjectArtefacts>);
  return {
    archive: {
      format: ARCHIVE_FORMAT,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
      project,
      artefacts,
    },
    warnings: collectWarnings(artefacts),
  };
}

// Dangling references can exist in live data (e.g. a use case whose interface was unlinked), so they
// are reported rather than blocking the restore: the goal is to bring back everything that was exported.
function collectWarnings(a: ProjectArtefacts): string[] {
  const warnings: string[] = [];
  const systemIds = new Set(a.systems.map((s) => s.id));
  const ifaceIds = new Set(a.interfaces.map((i) => i.id));
  const ucIds = new Set(a.useCases.map((u) => u.id));

  const unknownKeys = [...new Set(a.systems.map((s) => s.catalogKey).filter((k) => !catalogByKey(k)))];
  if (unknownKeys.length) warnings.push(`Systems use catalog entries unknown to this portal: ${unknownKeys.join(", ")}. They will be kept but shown with a default icon.`);

  const badLinks = a.links.filter((l) => !systemIds.has(l.source) || !systemIds.has(l.target)).length;
  if (badLinks) warnings.push(`${badLinks} link(s) refer to systems that are not in the archive.`);
  const badIf = a.interfaces.filter((i) => !systemIds.has(i.sourceSystemId) || !systemIds.has(i.targetSystemId)).length;
  if (badIf) warnings.push(`${badIf} interface(s) refer to systems that are not in the archive.`);
  const badUc = a.useCases.filter((u) => !ifaceIds.has(u.interfaceId)).length;
  if (badUc) warnings.push(`${badUc} use case(s) refer to interfaces that are not in the archive.`);
  const badTc = a.testCases.filter((t) => !ucIds.has(t.useCaseId)).length;
  if (badTc) warnings.push(`${badTc} test case(s) refer to use cases that are not in the archive.`);
  return warnings;
}
