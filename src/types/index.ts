// Domain types for the Maersk Integration Framework (MIF) Portal.

export type Role = "Admin" | "Project Lead" | "Contributor" | "Viewer";
export interface User {
  username: string;
  role: Role;
  password: string;   // prototype: plaintext. Replace with hash + salt in prod.
  displayName?: string;
  createdAt: string;
}

export interface Session {
  username: string;
  role: Role;
  loggedInAt: string;
}


export type ProjectStatus =
  | "Planning"
  | "Execution"
  | "Go Live"
  | "Hypercare"
  | "Completed (BAU)"
  | "On Hold";

export type Region =
  | "APA"
  | "EUR"
  | "LAM"
  | "NAM"
  | "MEA"
  | "IMEA"
  | "Global";

export interface Project {
  id: string;
  fbmId: string;
  name: string;
  customerName: string;
  country: string;
  region: Region;
  site: string;
  leadArchitect: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

// ISA-95 levels 0..5 (Concept Design)
export type IsaLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface SystemCatalogEntry {
  key: string;                 // e.g. "WMSv2"
  name: string;                // display name
  isaLevel: IsaLevel;
  category: string;            // e.g. "MES", "SCADA", "Device"
  description: string;
  defaultProtocol?: string;    // e.g. "REST", "Kafka", "TCP/IP"
}

export interface ProjectSystem {
  id: string;                  // e.g. "sys_abc123"
  catalogKey: string;          // FK to SystemCatalogEntry.key
  label: string;               // optional per-project label override
  isaLevel: IsaLevel;
  position?: { x: number; y: number }; // for VSM canvas
}

export interface SystemLink {
  id: string;                  // e.g. "lnk_abc"
  source: string;              // ProjectSystem.id
  target: string;              // ProjectSystem.id
  label?: string;
  isInterface?: boolean;       // true = this link is an interface (transfer of messages)
}

export type InterfaceStatus =
  | "Identified"
  | "In Design"
  | "In Development"
  | "In Testing"
  | "Approved"
  | "Deployed";

export type InterfaceDirection = "Bidirectional" | "Unidirectional";

export interface InterfaceItem {
  id: string;                    // "IF-01" style
  direction?: InterfaceDirection; // defaults to Bidirectional (request + response)
  linkId?: string;               // origin link in VSM, when auto-generated
  seq?: number;                  // Message Table Seq #
  sourceSystemId: string;
  targetSystemId: string;
  description: string;
  protocol: string;              // e.g. "REST", "Kafka", "TCP/IP", "OPC-UA"
  messageType?: string;          // e.g. "OrderCreate"
  useCaseSummary?: string;       // Message-Table "Usecase" column
  fcrTicket?: string;            // Message-Table FCR Ticket Number
  api?: string;                  // URL / endpoint
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | string;
  body?: string;                 // JSON/XML/etc structure notes
  exampleMessage?: string;
  exampleResponse?: string;
  successResponse?: string;      // HTTP 2xx sample
  errorResponse?: string;        // 4xx/5xx sample
  action?: string;               // Downstream action taken
  status: InterfaceStatus;
}

export type UseCaseStatus = "Draft" | "In Review" | "Approved" | "Rejected";

export interface UseCaseException {
  step: string;                  // e.g. "5.1"
  description: string;
}

export interface UseCase {
  id: string;                    // "UC-01"
  interfaceId: string;           // FK to InterfaceItem.id
  title: string;
  primaryActors: string[];
  secondaryActors: string[];
  description: string;
  triggers: string;
  preconditions: string[];
  chainOfEvents: string[];
  exceptions: UseCaseException[];
  postConditions: string[];
  status: UseCaseStatus;
}

export type TestStatus =
  | "Not Run"
  | "Passed"
  | "Failed"
  | "Blocked"
  | "In Progress";

export interface TestCase {
  id: string;                    // "TC-01"
  useCaseId: string;             // FK to UseCase.id
  scenario: string;
  preconditions: string[];
  steps: string[];
  expectedResults: string[];
  status: TestStatus;
}

export interface AuditEntry {
  id: string;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
}

export type HypercareIssueStatus =
  | "Open"
  | "In Progress"
  | "Mitigated"
  | "Closed";

export interface HypercareIssue {
  id: string;                        // e.g. "H-01"
  dateRaised?: string;               // ISO
  title: string;
  impactedArea?: string;
  raisedBy?: string;
  assignee?: string;
  description?: string;
  impact: 1 | 2 | 3 | 4 | 5;          // 1 Very Low .. 5 Very High
  urgency: 1 | 2 | 3 | 4 | 5;
  mitigation?: string;
  owner?: string;
  status: HypercareIssueStatus;
  actualClosureDate?: string;
  comments?: string;
}

export interface HypercareReport {
  goLiveDate?: string;
  durationDays?: number;
  objective?: string;
  currentStatus?: string;
  openIssues?: string;
  issues: HypercareIssue[];
}

export const EMPTY_HYPERCARE: HypercareReport = {
  goLiveDate: "",
  durationDays: 30,
  objective: "",
  currentStatus: "",
  openIssues: "",
  issues: [],
};


export interface TsdConfig {
  extraActors: string[];
  customSource?: string;   // if set, overrides the auto-generated Mermaid source
}
export const EMPTY_TSD: TsdConfig = { extraActors: [] };

// Full state of one project's artefacts.
export interface ProjectArtefacts {
  systems: ProjectSystem[];
  links: SystemLink[];
  interfaces: InterfaceItem[];
  useCases: UseCase[];
  testCases: TestCase[];
  hypercare: HypercareReport;
  tsd: TsdConfig;
  audit: AuditEntry[];
}

export const EMPTY_ARTEFACTS: ProjectArtefacts = {
  systems: [],
  links: [],
  interfaces: [],
  useCases: [],
  testCases: [],
  hypercare: { ...EMPTY_HYPERCARE },
  tsd: { ...EMPTY_TSD },
  audit: [],
};
