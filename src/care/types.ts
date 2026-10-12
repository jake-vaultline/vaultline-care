// Vaultline Care addition. Public projections only; credentials never reach the browser.
export interface Principal {
  id: string;
  name: string;
  role: string;
  deployments: string[];
}
export interface Profile {
  id: string;
  name: string;
  label: string;
  reference: string;
  version: string;
  modules: string[];
  hardware: string;
  storage: string;
  tools: string[];
  permissions: string[];
  transferId: string;
  documents: { id: string; title: string; revision: string }[];
}
export interface Evidence {
  id: string;
  kind: string;
  operation?: string;
  title?: string;
  at: string;
  available: boolean;
  limitation?: string;
  result?: Record<string, unknown>;
  documentId?: string;
  revision?: string;
  excerpt?: string;
}
export interface Message {
  id: string;
  role: string;
  text: string;
  next?: string;
  at: string;
  evidenceIds?: string[];
}
export interface Proposal {
  id: string;
  fingerprint: string;
  title: string;
  action: string;
  effect: string;
  rollback: string;
  category: string;
  requiredRole: string;
  status: string;
  executable: boolean;
  expiresAt: string;
  verification?: { passed: boolean; evidenceIds: string[] };
}
export interface Audit {
  sequence: number;
  type: string;
  actor: string;
  at: string;
  hash: string;
  data: Record<string, unknown>;
}
export interface Usage {
  provider: string;
  model: string;
  calls: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  note?: string;
  limitation?: string;
  explanation?: string;
}
export interface Case {
  id: string;
  title: string;
  deploymentId: string;
  status: string;
  createdAt: string;
  messages: Message[];
  evidence: Evidence[];
  proposals: Proposal[];
  usages: Usage[];
  audit?: Audit[];
  handoff?: { summary: string; nextAction: string; limitation: string } | null;
}
export interface Workspace {
  principal: Principal;
  profiles: Profile[];
  cases: Case[];
  mode: string;
  model: { provider: string; model: string };
  auditIntegrity: boolean;
}
