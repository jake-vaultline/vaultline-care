// Vaultline Care addition, Apache-2.0. Authorization is server-side, before every read and write.
import { randomUUID } from "node:crypto";
import { clone, digest, fail } from "./store.mjs";
import { DemoConnector, validateDiagnostic } from "./adapters.mjs";
import { ModelProvider } from "./provider.mjs";

const now = () => new Date().toISOString();
export class CareService {
  constructor(
    store,
    connector = new DemoConnector(),
    provider = new ModelProvider(),
  ) {
    this.store = store;
    this.connector = connector;
    this.provider = provider;
  }
  workspace(principal) {
    return {
      principal,
      profiles: clone(this.store.visibleProfiles(principal)).map(
        ({ transfer, docs, ...p }) => ({
          ...p,
          transferId: transfer.id,
          documents: docs.map(({ content, ...d }) => d),
        }),
      ),
      cases: clone(
        this.store.state.cases.filter(
          (c) =>
            principal.deployments.includes(c.deploymentId) &&
            (principal.role === "operator" ||
              c.tenantId === principal.tenantId),
        ),
      ),
      model: this.provider.info(),
      mode: "synthetic-demo",
      auditIntegrity: this.store.verifyAudit(),
    };
  }
  view(principal, id) {
    const c = this.store.case(principal, id);
    return {
      ...clone(c),
      audit: clone(this.store.state.audit.filter((e) => e.caseId === id)),
    };
  }
  document(principal, deploymentId, id) {
    const p = this.store.profile(principal, deploymentId);
    const d = p.docs.find((d) => d.id === id);
    if (!d) fail(404, "Document not found.");
    return {
      ...clone(d),
      deploymentId,
      contentTrust: "untrusted-knowledge-content",
    };
  }
  create(principal, deploymentId, message) {
    const p = this.store.profile(principal, deploymentId);
    this.validateMessage(message);
    const c = {
      id: `care-${randomUUID()}`,
      tenantId: p.tenantId,
      deploymentId,
      title: message.slice(0, 100),
      status: "open",
      createdAt: now(),
      messages: [
        {
          id: randomUUID(),
          role: "client",
          actor: principal.id,
          text: message,
          at: now(),
        },
      ],
      evidence: [],
      proposals: [],
      attemptedActions: [],
      usages: [],
      handoff: null,
    };
    this.store.state.cases.unshift(c);
    this.store.event(c, "case.opened", principal.id, {
      outcome: "Case opened for assigned deployment.",
    });
    return this.view(principal, c.id);
  }
  validateMessage(message) {
    if (typeof message !== "string" || !message.trim() || message.length > 4000)
      fail(400, "Describe the problem in 1–4000 characters.");
  }
  async message(principal, id, message) {
    const c = this.store.case(principal, id);
    this.validateMessage(message);
    if (c.status === "resolved")
      fail(409, "Open a new case for a new problem.");
    c.messages.push({
      id: randomUUID(),
      role: "client",
      actor: principal.id,
      text: message,
      at: now(),
    });
    this.store.event(c, "case.message", principal.id, {
      outcome: "Follow-up recorded.",
    });
    return this.diagnose(principal, id);
  }
  async diagnostic(principal, id, operation, args) {
    const c = this.store.case(principal, id),
      p = this.store.profile(principal, c.deploymentId);
    validateDiagnostic(p, operation, args, false);
    this.store.event(c, "tool.requested", principal.id, {
      operation,
      args,
      trust: "read-only",
    });
    try {
      const result = await this.connector.inspect(p, operation, args);
      const e = {
        id: `ev-${randomUUID()}`,
        kind: "diagnostic",
        operation,
        deploymentId: p.id,
        at: now(),
        result,
        available: true,
        contentTrust: "untrusted-diagnostic-content",
      };
      c.evidence.push(e);
      this.store.event(c, "tool.completed", principal.id, {
        operation,
        evidenceId: e.id,
        resultDigest: digest(result),
        outcome: "Read completed.",
      });
      return clone(e);
    } catch (error) {
      // Never store arbitrary connector exceptions or credentials in the audit.
      const limitation = error.status
        ? error.message
        : "Diagnostic unavailable. No result was obtained.";
      const e = {
        id: `ev-${randomUUID()}`,
        kind: "diagnostic",
        operation,
        deploymentId: p.id,
        at: now(),
        available: false,
        limitation,
      };
      c.evidence.push(e);
      this.store.event(c, "tool.unavailable", principal.id, {
        operation,
        evidenceId: e.id,
        outcome: limitation,
      });
      return clone(e);
    }
  }
  async diagnose(principal, id) {
    const c = this.store.case(principal, id),
      p = this.store.profile(principal, c.deploymentId);
    if (c.status === "resolved") fail(409, "This case is resolved.");
    for (const proposal of c.proposals)
      if (["pending", "approved"].includes(proposal.status))
        proposal.status = "superseded";
    const args = { transferId: p.transfer.id };
    const transfer = await this.diagnostic(
      principal,
      id,
      "transfer_status",
      args,
    );
    const destination = await this.diagnostic(
      principal,
      id,
      "destination_status",
      args,
    );
    const log = await this.diagnostic(principal, id, "diagnostic_log", args);
    // Retrieval is physically scoped to an authorized profile; no global search/post-filtering.
    const doc = p.docs[0];
    const documentation = {
      id: `ev-${randomUUID()}`,
      kind: "document",
      deploymentId: p.id,
      at: now(),
      available: true,
      title: doc.title,
      documentId: doc.id,
      revision: doc.revision,
      excerpt: doc.content,
      contentTrust: "untrusted-knowledge-content",
    };
    c.evidence.push(documentation);
    this.store.event(c, "retrieval.completed", principal.id, {
      documentId: doc.id,
      revision: doc.revision,
      evidenceId: documentation.id,
    });
    const t = transfer.result,
      d = destination.result;
    let text, next, finding;
    if (!transfer.available || !destination.available) {
      finding = "diagnostics_unavailable";
      text =
        "I could not inspect the transfer and destination. I cannot determine why it stalled from the available evidence.";
      next =
        "Prepare a handoff for Jake with the unavailable checks and this conversation.";
      c.status = "needs_jake";
    } else if (
      t.blocker === "destination_offline" &&
      d.online === false &&
      d.freeGb > 0
    ) {
      finding = "destination_offline";
      text = `${p.name}’s “${t.name}” transfer stopped at ${t.progress}%. The destination is disconnected; it still has ${d.freeGb} GB available. The deployment guide says the saved checkpoint can be used when the connection returns.`;
      next =
        "Review the demo reconnection proposal below. It resumes the existing copy without deleting files.";
      c.status = "awaiting_approval";
    } else if (t.blocker === "destination_full" && d.freeGb === 0) {
      finding = "destination_full";
      text = `${p.name}’s “${t.name}” transfer stopped at ${t.progress}%. The destination is reachable but has 0 GB free. Retrying cannot fix the capacity problem. The deployment guide calls for Jake to review capacity or another approved destination.`;
      next =
        "Prepare a handoff for Jake. Deleting media is consequential and is not available through this workspace.";
      c.status = "needs_jake";
    } else if (t.status === "running" && d.online) {
      finding = "running";
      text = `The transfer is running at ${t.progress}% and its destination is reachable. This confirms recovery; the copy is still in progress.`;
      next =
        "Keep the case open until you confirm that the transfer completed.";
      c.status = "monitoring";
    } else {
      finding = "unknown";
      text =
        "The available checks do not establish a supported cause for this transfer problem.";
      next = "Prepare a handoff for Jake. I will not guess a repair.";
      c.status = "needs_jake";
    }
    const evidenceIds = [transfer.id, destination.id, log.id, documentation.id];
    c.messages.push({
      id: randomUUID(),
      role: "assistant",
      at: now(),
      text,
      next,
      finding,
      evidenceIds,
    });
    if (finding === "destination_offline")
      this.propose(principal, id, "demo.reconnect_destination", evidenceIds);
    const usage = await this.provider.explain({
      deployment: p.name,
      finding,
      text,
      next,
      documentation: doc.content,
      evidence: [transfer, destination].map((e) => ({
        operation: e.operation,
        result: e.result,
        limitation: e.limitation,
      })),
    });
    c.usages.push({ ...usage, at: now() });
    this.store.event(c, "diagnosis.completed", principal.id, {
      finding,
      evidenceIds,
      model: usage.model,
      calls: usage.calls,
      outcome: c.status,
    });
    return this.view(principal, id);
  }
  propose(principal, id, action, evidenceIds = []) {
    const c = this.store.case(principal, id),
      p = this.store.profile(principal, c.deploymentId);
    const catalog = {
      "demo.reconnect_destination": {
        title: "Reconnect the demo destination",
        category: "reversible",
        effect:
          "Reconnect only this synthetic destination and resume this transfer from its 42% checkpoint. No media is deleted.",
        rollback:
          "This changes disposable demo state only. A fresh CARE_DATA_DIR recreates the original scenario.",
        requiredRole: "client",
        executable: true,
      },
      "media.delete": {
        title: "Delete media to make room",
        category: "consequential",
        effect: "Would permanently remove media from the destination.",
        rollback:
          "A verified backup and exact owner-approved scope would be required.",
        requiredRole: "operator",
        executable: false,
      },
      "credentials.rotate": {
        title: "Change deployment credentials",
        category: "consequential",
        effect: "Would change access to the deployment.",
        rollback:
          "Requires the existing credential authority and a separately approved rotation plan.",
        requiredRole: "operator",
        executable: false,
      },
    };
    if (!Object.hasOwn(catalog, action))
      fail(400, "This action is not supported.");
    const spec = catalog[action];
    if (
      spec.executable &&
      (!p.permissions.includes(action) ||
        p.transfer.blocker !== "destination_offline")
    )
      fail(403, "This deployment does not grant this action.");
    // Never take effect text, category, command, role, or arguments from a model/client.
    const proposal = {
      id: `proposal-${randomUUID()}`,
      action,
      ...spec,
      deploymentId: p.id,
      transferId: p.transfer.id,
      args: { transferId: p.transfer.id },
      precondition: digest(p.transfer),
      evidenceIds,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: "pending",
    };
    proposal.fingerprint = digest(proposal);
    c.proposals.push(proposal);
    this.store.event(c, "action.proposed", principal.id, {
      proposalId: proposal.id,
      fingerprint: proposal.fingerprint,
      action,
      category: spec.category,
      effect: spec.effect,
    });
    return clone(proposal);
  }
  proposal(principal, id, proposalId) {
    const c = this.store.case(principal, id),
      p = this.store.profile(principal, c.deploymentId);
    const proposal = c.proposals.find((p) => p.id === proposalId);
    if (!proposal) fail(404, "Proposal not found.");
    return { c, p, proposal };
  }
  authorize(principal, p, proposal) {
    if (principal.role !== "operator" && proposal.requiredRole === "operator")
      fail(403, "Jake must authorize consequential operations.");
    if (proposal.executable && !p.permissions.includes(proposal.action))
      fail(403, "This deployment does not grant this action.");
    if (Date.parse(proposal.expiresAt) <= Date.now())
      fail(409, "This proposal expired. Inspect again.");
    if (digest(p.transfer) !== proposal.precondition)
      fail(
        409,
        "The transfer changed. Inspect again and review a fresh proposal.",
      );
  }
  approve(principal, id, proposalId, fingerprint) {
    const { c, p, proposal } = this.proposal(principal, id, proposalId);
    try {
      this.authorize(principal, p, proposal);
      if (fingerprint !== proposal.fingerprint)
        fail(409, "Approval does not match this proposal.");
      if (proposal.status !== "pending")
        fail(409, "This proposal is no longer awaiting approval.");
      if (!proposal.executable)
        fail(
          503,
          "The required production action connector is unavailable. Jake must use the existing governed workflow.",
        );
      proposal.status = "approved";
      proposal.approval = { actor: principal.id, at: now(), fingerprint };
      this.store.event(c, "action.approved", principal.id, {
        proposalId,
        fingerprint,
        effect: proposal.effect,
      });
      return this.view(principal, id);
    } catch (error) {
      this.store.event(c, "action.approval_denied", principal.id, {
        proposalId,
        outcome: error.status ? error.message : "Approval failed.",
      });
      throw error;
    }
  }
  async execute(principal, id, proposalId) {
    const { c, p, proposal } = this.proposal(principal, id, proposalId);
    try {
      this.authorize(principal, p, proposal);
      if (
        proposal.status !== "approved" ||
        !proposal.approval ||
        proposal.approval.fingerprint !== proposal.fingerprint ||
        !proposal.executable
      )
        fail(403, "Explicit approval for this exact proposal is required.");
      proposal.status = "executing";
      c.attemptedActions.push({
        proposalId,
        action: proposal.action,
        at: now(),
        actor: principal.id,
      });
      this.store.event(c, "action.dispatching", principal.id, {
        proposalId,
        action: proposal.action,
        args: proposal.args,
        approval: proposal.approval,
      });
      const result = await this.connector.execute(
        p,
        proposal.action,
        proposal.args,
      );
      this.store.event(c, "action.completed", principal.id, {
        proposalId,
        outcome: result.outcome,
      });
      const readback = await this.diagnostic(
        principal,
        id,
        "transfer_status",
        proposal.args,
      );
      const destination = await this.diagnostic(
        principal,
        id,
        "destination_status",
        proposal.args,
      );
      const verified =
        readback.available &&
        destination.available &&
        readback.result.status === "running" &&
        readback.result.progress > 42 &&
        destination.result.online === true;
      proposal.status = verified ? "verified" : "verification_failed";
      proposal.verification = {
        at: now(),
        passed: verified,
        evidenceIds: [readback.id, destination.id],
      };
      c.status = verified ? "monitoring" : "needs_jake";
      c.messages.push({
        id: randomUUID(),
        role: "assistant",
        at: now(),
        evidenceIds: [readback.id, destination.id],
        text: verified
          ? `The demo repair ran. A fresh read shows the transfer running at ${readback.result.progress}% and the destination reachable. The transfer is not complete yet.`
          : "The action ran, but read-back verification did not confirm recovery. Jake needs to review this case.",
        next: verified
          ? "Confirm resolution only after the copy has completed."
          : "Prepare a handoff for Jake.",
      });
      this.store.event(c, "action.verified", principal.id, {
        proposalId,
        passed: verified,
        evidenceIds: proposal.verification.evidenceIds,
      });
      return this.view(principal, id);
    } catch (error) {
      if (proposal.status === "executing") {
        proposal.status = "verification_required";
        c.status = "needs_jake";
      }
      this.store.event(c, "action.failed", principal.id, {
        proposalId,
        outcome: error.status
          ? error.message
          : "Action outcome uncertain. Jake must review; no replay is allowed.",
      });
      throw error;
    }
  }
  resolve(principal, id) {
    const c = this.store.case(principal, id);
    if (c.status !== "monitoring")
      fail(409, "Recovery must be verified before confirming resolution.");
    c.status = "resolved";
    c.messages.push({
      id: randomUUID(),
      role: "client",
      actor: principal.id,
      at: now(),
      text: "I confirm the issue is resolved.",
    });
    this.store.event(c, "case.resolved", principal.id, {
      outcome:
        "Client-confirmed resolution; completion is a client report, not connector proof.",
    });
    return this.view(principal, id);
  }
  handoff(principal, id) {
    const c = this.store.case(principal, id),
      p = this.store.profile(principal, c.deploymentId);
    c.status = "needs_jake";
    c.handoff = {
      createdAt: now(),
      summary:
        c.messages.filter((m) => m.role === "assistant").at(-1)?.text ||
        "No diagnosis available.",
      nextAction:
        "Jake: review the evidence, missing checks, attempted actions and approvals. Confirm deployment authorization before using the existing Media Nexus repair path.",
      limitation:
        "Synthetic demo. No production connector or client enrollment. Downloading this package does not send it to Jake.",
    };
    this.store.event(c, "handoff.prepared", principal.id, {
      outcome: "Review package prepared; not sent.",
    });
    return {
      schema: "vaultline-care-handoff-v1",
      generatedAt: now(),
      synthetic: true,
      deployment: clone({ ...p, transfer: undefined }),
      case: this.view(principal, id),
      auditIntegrity: this.store.verifyAudit(),
      sourceOfTruth:
        "Demo profile only. Production deployment records remain in existing overlays/Portal; support authorization remains in Media Nexus.",
    };
  }
}
