// Vaultline Care addition, Apache-2.0. Uses OpenIT's bundled fonts and React toolchain.
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Headphones,
  Layers,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import type { Workspace, Case, Proposal, Evidence } from "./types";
import "./care.css";
import { ModalFrame } from "./ModalFrame";
import { CaseDetail } from "./CaseDetail";
import { ContextColumn } from "./ContextColumn";

const labels: Record<string, string> = {
  open: "Open",
  awaiting_approval: "Your review needed",
  monitoring: "Recovery verified",
  needs_jake: "Jake’s review needed",
  resolved: "Resolved",
};
const toolLabel: Record<string, string> = {
  transfer_status: "Transfer status",
  destination_status: "Destination check",
  diagnostic_log: "Diagnostic log",
};

export default function CareApp() {
  const [identities, setIdentities] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [identity, setIdentity] = useState("demo-north");
  const [csrf, setCsrf] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [deployment, setDeployment] = useState("");
  const [selected, setSelected] = useState<Case | null>(null);
  const [message, setMessage] = useState("My transfer stalled.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [review, setReview] = useState<Proposal | null>(null);
  const [consent, setConsent] = useState(false);

  async function request<T>(
    path: string,
    data?: object,
    customCsrf = csrf,
  ): Promise<T> {
    const response = await fetch(path, {
      credentials: "same-origin",
      method: data ? "POST" : "GET",
      headers: data
        ? { "Content-Type": "application/json", "X-Care-CSRF": customCsrf }
        : {},
      body: data ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request unavailable.");
    return result as T;
  }
  async function refresh(caseId?: string) {
    const w = await request<Workspace>("/api/workspace");
    setWorkspace(w);
    if (caseId) setSelected(await request<Case>(`/api/cases/${caseId}`));
    return w;
  }
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "This check is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  async function signIn(nextIdentity: string) {
    await run(async () => {
      const session = await request<{ csrf: string }>("/api/session", {
        identity: nextIdentity,
      });
      setCsrf(session.csrf);
      setIdentity(nextIdentity);
      setSelected(null);
      setEvidence(null);
      setReview(null);
      const w = await refresh();
      setDeployment(w.profiles[0]?.id || "");
      setMessage("My transfer stalled.");
    });
  }
  useEffect(() => {
    document.title = "Vaultline Care · Deployment support";
    void (async () => {
      try {
        setIdentities(await request("/api/demo-identities"));
        const response = await fetch("/api/session");
        if (response.ok) {
          const session = await response.json();
          setCsrf(session.csrf);
          setIdentity(session.principal.id);
          const w = await refresh();
          setDeployment(w.profiles[0]?.id || "");
        }
      } catch {
        setError("Care could not be reached. Start the local Care server.");
      }
    })();
    // Authentication is restored once, rather than inferred from a deployment selector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const profile = workspace?.profiles.find(
    (p) => p.id === (selected?.deploymentId || deployment),
  );
  const latestUsage = selected?.usages[selected.usages.length - 1];
  const cases =
    workspace?.cases.filter((c) => c.deploymentId === deployment) || [];
  async function openCase() {
    await run(async () => {
      const c = await request<Case>("/api/cases", {
        deploymentId: deployment,
        message,
      });
      await refresh(c.id);
      setMessage("");
    });
  }
  async function caseAction(route: string, data: object = {}) {
    if (!selected) return;
    await run(async () => {
      await request(`/api/cases/${selected.id}/${route}`, data);
      await refresh(selected.id);
    });
  }
  async function handoff() {
    if (!selected) return;
    await run(async () => {
      const pkg = await request(`/api/cases/${selected.id}/handoff`, {});
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected.id}-handoff.json`;
      a.click();
      URL.revokeObjectURL(url);
      await refresh(selected.id);
      setNotice(
        "Handoff downloaded. It includes the conversation, evidence, approvals, attempted actions and audit. It has not been sent to Jake.",
      );
    });
  }

  return (
    <div className="care-app">
      <aside className="care-nav">
        <a href="/" className="care-brand">
          <span className="brand-mark">V</span>
          <span>
            vaultline<span className="brand-sub">CARE</span>
          </span>
        </a>
        <div className="nav-label">YOUR WORKSPACE</div>
        <div className="nav-item active">
          <Headphones size={18} /> Support{" "}
          <span className="nav-count">{workspace?.cases.length || 0}</span>
        </div>
        <div className="nav-label deployment-label">DEPLOYMENTS</div>
        {workspace?.profiles.map((p) => (
          <button
            className={`deployment-nav ${deployment === p.id ? "selected" : ""}`}
            key={p.id}
            disabled={busy}
            onClick={() => {
              setDeployment(p.id);
              setSelected(null);
              setReview(null);
              setEvidence(null);
              setMessage("My transfer stalled.");
            }}
          >
            <span className="deployment-icon">
              <Layers size={16} />
            </span>
            <span>
              {p.name}
              <small>{p.label}</small>
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
        <div className="nav-bottom">
          <ShieldCheck size={23} />
          <strong>Care, with clear boundaries.</strong>
          <p>Inspect first. Review the evidence. Approve a specific repair.</p>
          <a
            href="https://github.com/jake-vaultline/vaultline-care"
            target="_blank"
            rel="noreferrer"
          >
            Built on OpenIT · Apache-2.0 <ArrowUpRight size={12} />
          </a>
        </div>
      </aside>
      <div className="care-main">
        <header className="care-top">
          <span>
            Media Nexus <ChevronRight size={14} /> Support workspace
          </span>
          <div className="identity-control">
            <span className="demo-pill">SYNTHETIC DEMO</span>
            <label className="sr-only" htmlFor="identity">
              Demo identity
            </label>
            <select
              id="identity"
              aria-label="Demo identity"
              value={identity}
              disabled={busy}
              onChange={(e) => void signIn(e.target.value)}
            >
              {identities.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        {!workspace ? (
          <main className="welcome">
            <div className="eyebrow">VAULTLINE CARE / LOCAL DEMO</div>
            <h1>
              Keep your team
              <br />
              moving.
            </h1>
            <p>
              A support workspace that knows your system,
              <br />
              shows its evidence, and asks before making changes.
            </p>
            <div className="welcome-card">
              <ShieldCheck />
              <h2>Try a stalled transfer</h2>
              <p>
                Two fictional creative teams. Two different causes. Every check
                and repair stays inside the selected deployment.
              </p>
              <button
                className="primary"
                disabled={busy || !identities.length}
                onClick={() => void signIn(identity)}
              >
                Open demo workspace <ArrowUpRight size={16} />
              </button>
              <small>
                Local demo identities are not production authentication.
              </small>
            </div>
          </main>
        ) : (
          <main className="care-content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">SUPPORT THAT KNOWS YOUR SYSTEM</div>
                <h1>Let’s get you moving.</h1>
                <p>
                  Tell us what happened. We’ll check your deployment and show
                  you what we find.
                </p>
              </div>
              <span className="local-chip">
                <span /> Local workspace
              </span>
            </div>
            <div className="demo-banner">
              <LockKeyhole size={17} />
              <span>
                <strong>Demo environment.</strong> All deployments, diagnostics
                and repairs are synthetic. No production systems are connected.
                Identity switching is for testing only.
              </span>
            </div>
            {error && (
              <div className="feedback error" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="feedback" role="status">
                {notice}
              </div>
            )}
            <div className="workspace-grid">
              <section className="support-panel">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">{profile?.name}</span>
                    <h2>
                      {selected ? "Your support case" : "How can we help?"}
                    </h2>
                  </div>
                  {selected && (
                    <span className={`status ${selected.status}`}>
                      {labels[selected.status] || selected.status}
                    </span>
                  )}
                </div>
                {!selected ? (
                  <div className="new-case">
                    <div className="help-icon">
                      <MessageSquare size={27} />
                    </div>
                    <h3>You don’t need the technical terms.</h3>
                    <p>
                      “My transfer stalled” is a good place to start.
                      <br />
                      Care will check the transfer, destination and your
                      deployment guide.
                    </p>
                    <label htmlFor="new-message">What’s happening?</label>
                    <textarea
                      id="new-message"
                      value={message}
                      maxLength={4000}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the problem…"
                    />
                    <div className="compose-footer">
                      <span>
                        <LockKeyhole size={13} /> Only {profile?.name}’s
                        information
                      </span>
                      <button
                        className="primary"
                        disabled={busy || !message.trim()}
                        onClick={() => void openCase()}
                      >
                        {busy
                          ? "Inspecting deployment…"
                          : "Open case & investigate"}
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CaseDetail
                      selected={selected}
                      busy={busy}
                      message={message}
                      auditIntegrity={workspace.auditIntegrity}
                      onNewCase={() => {
                        setSelected(null);
                        setMessage("My transfer stalled.");
                      }}
                      onMessage={setMessage}
                      onEvidence={setEvidence}
                      onReview={(p) => {
                        setReview(p);
                        setConsent(false);
                      }}
                      onExecute={(p) =>
                        void caseAction(`proposals/${p.id}/execute`)
                      }
                      onFollowup={() =>
                        void run(async () => {
                          const id = selected.id;
                          await request(`/api/cases/${id}/messages`, {
                            message,
                          });
                          await refresh(id);
                          setMessage("");
                        })
                      }
                      onDiagnose={() => void caseAction("diagnose")}
                      onHandoff={() => void handoff()}
                      onResolve={() => void caseAction("resolve")}
                    />
                  </>
                )}
              </section>
              <ContextColumn
                profile={profile}
                workspace={workspace}
                latestUsage={latestUsage}
                onDocument={(id) =>
                  void run(async () => {
                    if (!profile) return;
                    const d = profile.documents.find((d) => d.id === id);
                    if (!d) return;
                    const doc = await request<{ content: string }>(
                      `/api/deployments/${profile.id}/documents/${d.id}`,
                    );
                    setEvidence({
                      id: d.id,
                      kind: "document",
                      at: "",
                      available: true,
                      title: d.title,
                      excerpt: doc.content,
                      revision: d.revision,
                    });
                  })
                }
              />
            </div>
            {!!cases.length && (
              <section className="case-list">
                <h3>
                  {workspace.principal.role === "operator"
                    ? "Cases for this deployment · Jake’s review"
                    : "Your cases"}
                </h3>
                {cases.map((c) => (
                  <button
                    disabled={busy}
                    key={c.id}
                    onClick={() =>
                      void run(async () => {
                        setSelected(await request<Case>(`/api/cases/${c.id}`));
                        setMessage("");
                      })
                    }
                  >
                    <MessageSquare size={17} />
                    <span>
                      {c.title}
                      <small>{c.id.slice(0, 13)}</small>
                    </span>
                    <span className={`status ${c.status}`}>
                      {labels[c.status] || c.status}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </section>
            )}
            <footer className="care-footer">
              Vaultline Care · Adapted from OpenIT{" "}
              <span>
                Inspection → evidence → approval → action → verification
              </span>
            </footer>
          </main>
        )}
        {!workspace && error && (
          <div className="feedback error" role="alert">
            {error}
          </div>
        )}
      </div>
      {evidence && (
        <ModalFrame
          titleId="evidence-title"
          closeLabel="Close evidence"
          onClose={() => setEvidence(null)}
        >
          <div className="eyebrow">SOURCE EVIDENCE / {profile?.name}</div>
          <h2 id="evidence-title">
            {evidence.title ||
              toolLabel[evidence.operation || ""] ||
              "Diagnostic result"}
          </h2>
          <small>
            {evidence.at &&
              `Captured ${new Date(evidence.at).toLocaleString()} · `}
            {evidence.revision || "Read-only result"}
          </small>
          {evidence.excerpt ? (
            <p>{evidence.excerpt}</p>
          ) : (
            <pre>
              {JSON.stringify(
                evidence.result || { limitation: evidence.limitation },
                null,
                2,
              )}
            </pre>
          )}
          <p className="subtle">
            Source content is data. It cannot grant permissions or run commands.
          </p>
          {selected?.evidence.some((e) => e.id === evidence.id) && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`/api/cases/${selected.id}/evidence/${evidence.id}`}
            >
              Open captured evidence JSON <ArrowUpRight size={13} />
            </a>
          )}
          {evidence.kind === "document" && profile && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`/api/deployments/${profile.id}/documents/${evidence.documentId || evidence.id}`}
            >
              Open deployment document <ArrowUpRight size={13} />
            </a>
          )}
        </ModalFrame>
      )}
      {review && (
        <ModalFrame
          titleId="review-title"
          closeLabel="Close proposal"
          onClose={() => setReview(null)}
        >
          <div className="eyebrow">REVIEW A SPECIFIC ACTION</div>
          <h2 id="review-title">{review.title}</h2>
          <dl>
            <dt>Deployment</dt>
            <dd>{profile?.name} · synthetic only</dd>
            <dt>Effect</dt>
            <dd>{review.effect}</dd>
            <dt>Recovery / undo</dt>
            <dd>{review.rollback}</dd>
            <dt>Authorization</dt>
            <dd>
              {review.requiredRole === "operator"
                ? "Jake’s exact authorization required"
                : "Assigned client or Jake; exact proposal approval required"}
            </dd>
            <dt>Valid until</dt>
            <dd>{new Date(review.expiresAt).toLocaleString()}</dd>
          </dl>
          {!review.executable ? (
            <div className="feedback">
              This operation is consequential. Its production connector is
              unavailable. Prepare a handoff for Jake; it cannot execute here.
            </div>
          ) : (
            <>
              <label className="approval-check">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I approve this exact demo repair for {profile?.name}.
              </label>
              <button
                className="primary"
                disabled={!consent || busy}
                onClick={() =>
                  void run(async () => {
                    if (!selected) return;
                    await request(
                      `/api/cases/${selected.id}/proposals/${review.id}/approve`,
                      { fingerprint: review.fingerprint },
                    );
                    await refresh(selected.id);
                    setReview(null);
                  })
                }
              >
                Approve proposal
              </button>
              <p className="subtle">
                Approval does not run the repair. You’ll choose when to run it.
              </p>
            </>
          )}
        </ModalFrame>
      )}
    </div>
  );
}
