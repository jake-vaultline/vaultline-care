// Vaultline Care addition. Authorized deployment context and provider usage.
import {
  Layers,
  LockKeyhole,
  Activity,
  FileText,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import type { Profile, Workspace, Usage } from "./types";
const toolLabel: Record<string, string> = {
  transfer_status: "Transfer status",
  destination_status: "Destination check",
  diagnostic_log: "Diagnostic log",
};
export function ContextColumn({
  profile,
  workspace,
  latestUsage,
  onDocument,
}: {
  profile?: Profile;
  workspace: Workspace;
  latestUsage?: Usage;
  onDocument: (id: string) => void;
}) {
  return (
    <aside className="context-column">
      <section className="context-card">
        <div className="context-heading">
          <Layers size={18} />
          <h3>Your deployment</h3>
          <span className="tiny-pill">DEMO</span>
        </div>
        <h2>{profile?.name}</h2>
        <p>{profile?.label}</p>
        <dl>
          <dt>Installed version</dt>
          <dd>{profile?.version}</dd>
          <dt>Modules</dt>
          <dd className="module-tags">
            {profile?.modules.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </dd>
          <dt>Hardware</dt>
          <dd>{profile?.hardware}</dd>
          <dt>Storage</dt>
          <dd>{profile?.storage}</dd>
        </dl>
        <div className="scope-note">
          <LockKeyhole size={14} /> Information scoped to this deployment
        </div>
      </section>
      <section className="context-card">
        <div className="context-heading">
          <Activity size={17} />
          <h3>Available checks</h3>
        </div>
        {["transfer_status", "destination_status", "diagnostic_log"].map(
          (t) => (
            <div className="tool-row" key={t}>
              <span>{toolLabel[t]}</span>
              <small className={profile?.tools.includes(t) ? "available" : ""}>
                {profile?.tools.includes(t) ? "Read only" : "Unavailable"}
              </small>
            </div>
          ),
        )}
        <p className="subtle">
          Checks report evidence. They don’t change your system.
        </p>
      </section>
      <section className="context-card">
        <div className="context-heading">
          <FileText size={17} />
          <h3>Deployment knowledge</h3>
        </div>
        {profile?.documents.map((d) => (
          <button
            className="doc-link"
            key={d.id}
            onClick={() => onDocument(d.id)}
          >
            {d.title}
            <ArrowUpRight size={15} />
          </button>
        ))}
        <small>
          Documentation is reference material. It cannot authorize actions.
        </small>
      </section>
      <section className="context-card usage">
        <div className="context-heading">
          <ShieldCheck size={17} />
          <h3>Model & usage</h3>
        </div>
        <strong>{workspace.model.provider}</strong>
        <p>{workspace.model.model}</p>
        {latestUsage ? (
          <>
            <p>
              {latestUsage?.calls} call(s) ·{" "}
              {latestUsage?.inputTokens ?? "Unknown"} input /{" "}
              {latestUsage?.outputTokens ?? "Unknown"} output tokens
            </p>
            <small>{latestUsage?.limitation || latestUsage?.note}</small>
            {latestUsage?.explanation && (
              <details>
                <summary>Optional model explanation · unverified</summary>
                <p>{latestUsage?.explanation}</p>
              </details>
            )}
          </>
        ) : (
          <small>
            Local evidence rules are enabled by default. No external model call.
          </small>
        )}
      </section>
    </aside>
  );
}
