// Vaultline Care addition. Case conversation, evidence, repair states and audit.
import {
  Headphones,
  FileText,
  ShieldCheck,
  ChevronRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Activity,
  Download,
} from "lucide-react";
import type { Case, Evidence, Proposal } from "./types";
const toolLabel: Record<string, string> = {
  transfer_status: "Transfer status",
  destination_status: "Destination check",
  diagnostic_log: "Diagnostic log",
};
const time = (at: string) =>
  new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
interface Props {
  selected: Case;
  busy: boolean;
  message: string;
  auditIntegrity: boolean;
  onNewCase: () => void;
  onMessage: (message: string) => void;
  onEvidence: (evidence: Evidence | null) => void;
  onReview: (proposal: Proposal) => void;
  onExecute: (proposal: Proposal) => void;
  onFollowup: () => void;
  onDiagnose: () => void;
  onHandoff: () => void;
  onResolve: () => void;
}
export function CaseDetail({
  selected,
  busy,
  message,
  auditIntegrity,
  onNewCase,
  onMessage,
  onEvidence,
  onReview,
  onExecute,
  onFollowup,
  onDiagnose,
  onHandoff,
  onResolve,
}: Props) {
  return (
    <>
      {" "}
      <div className="case-meta">
        <span>{selected.id.slice(0, 13).toUpperCase()}</span>
        <span>Opened {time(selected.createdAt)}</span>
        <button disabled={busy} onClick={onNewCase}>
          New case
        </button>
      </div>
      <div className="conversation">
        {selected.messages.map((m) => (
          <article className={`message ${m.role}`} key={m.id}>
            <div className="message-avatar">
              {m.role === "assistant" ? <Headphones size={16} /> : "Y"}
            </div>
            <div className="message-body">
              <div className="message-heading">
                <strong>
                  {m.role === "assistant" ? "Vaultline Care" : "You"}
                </strong>
                <time>{time(m.at)}</time>
                {m.role === "assistant" && <span>Evidence-based</span>}
              </div>
              <p>{m.text}</p>
              {m.next && (
                <div className="next-step">
                  <strong>Next step</strong>
                  <p>{m.next}</p>
                </div>
              )}
              {m.evidenceIds && (
                <div className="citations">
                  {m.evidenceIds.map((id, index) => {
                    const e = selected.evidence.find((e) => e.id === id);
                    return (
                      <button key={id} onClick={() => onEvidence(e || null)}>
                        <FileText size={12} />
                        {index + 1}.{" "}
                        {e?.kind === "document"
                          ? "Deployment guide"
                          : toolLabel[e?.operation || ""] || "Evidence"}
                        {!e?.available && " · unavailable"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {selected.proposals
        .filter((p) => !["superseded"].includes(p.status))
        .map((p) => (
          <div className={`proposal ${p.category}`} key={p.id}>
            <div className="proposal-heading">
              <ShieldCheck size={19} />
              <strong>{p.title}</strong>
              <span>
                {p.category === "reversible"
                  ? "Reversible · demo only"
                  : "Consequential"}
              </span>
            </div>
            <p>{p.effect}</p>
            <div className="proposal-footer">
              <small>
                {p.status === "pending"
                  ? "Nothing has changed. Review before approving."
                  : p.status === "verified"
                    ? "Executed and checked again. Recovery verified."
                    : `Proposal: ${p.status.replace(/_/g, " ")}`}
              </small>
              {p.status === "pending" && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => onReview(p)}
                >
                  Review proposal <ChevronRight size={14} />
                </button>
              )}
              {p.status === "approved" && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => onExecute(p)}
                >
                  Run approved demo repair <Check size={14} />
                </button>
              )}
              {p.status === "verified" && <CheckCircle2 size={20} />}
            </div>
          </div>
        ))}
      {selected.handoff && (
        <div className="handoff-note">
          <ClipboardList size={18} />
          <div>
            <strong>Ready for Jake’s review</strong>
            <p>{selected.handoff.nextAction}</p>
            <small>{selected.handoff.limitation}</small>
          </div>
        </div>
      )}
      {selected.status !== "resolved" && (
        <div className="followup">
          <label className="sr-only" htmlFor="followup">
            Follow-up message
          </label>
          <textarea
            id="followup"
            placeholder="Add a detail or ask a follow-up…"
            value={message}
            onChange={(e) => onMessage(e.target.value)}
            maxLength={4000}
          />
          <button
            className="primary"
            disabled={busy || !message.trim()}
            onClick={() => onFollowup()}
          >
            {busy ? "Checking…" : "Send & check"}
          </button>
        </div>
      )}
      <div className="case-actions">
        <button disabled={busy} onClick={() => onDiagnose()}>
          <Activity size={15} />
          Check again
        </button>
        <button disabled={busy} onClick={() => onHandoff()}>
          <Download size={15} />
          Prepare Jake handoff
        </button>
        {selected.status === "monitoring" && (
          <button disabled={busy} onClick={() => onResolve()}>
            <CheckCircle2 size={15} />I confirm it’s resolved
          </button>
        )}
      </div>
      <details className="audit">
        <summary>
          <ClipboardList size={16} /> Activity & approvals{" "}
          <span>
            {selected.audit?.length || 0} entries ·{" "}
            {auditIntegrity ? "chain verified" : "integrity unavailable"}
          </span>
        </summary>
        {selected.audit?.map((e) => (
          <div className="audit-row" key={e.sequence}>
            <time>{time(e.at)}</time>
            <div>
              <strong>{e.type.replace(/\./g, " · ").replace(/_/g, " ")}</strong>
              <small>{e.actor}</small>
              <pre>{JSON.stringify(e.data, null, 2)}</pre>
            </div>
          </div>
        ))}
      </details>
    </>
  );
}
