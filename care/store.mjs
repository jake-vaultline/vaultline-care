// Vaultline Care addition. File-based vault; never reads OpenIT's general workspace.
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { profiles } from "./fixtures.mjs";

export class CareError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new CareError(status, message);
};
export const clone = (value) => structuredClone(value);
export const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class Store {
  constructor(directory) {
    this.directory = directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.path = join(directory, "care-vault.json");
    try {
      this.state = JSON.parse(readFileSync(this.path, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error; // corrupt state must never silently reset
      this.state = {
        schema: 1,
        profiles: clone(profiles),
        cases: [],
        audit: [],
      };
      this.save();
    }
    if (this.state.schema !== 1 || !this.verifyAudit())
      throw new Error("Care vault integrity check failed");
    // A crash after dispatch is uncertainty, not permission to dispatch again.
    for (const c of this.state.cases) {
      for (const p of c.proposals)
        if (p.status === "executing") {
          p.status = "verification_required";
          c.status = "needs_jake";
          this.event(c, "recovery.uncertain", "system", {
            proposalId: p.id,
            outcome: "Handoff required; action will not be replayed.",
          });
        }
    }
  }
  save() {
    const temp = `${this.path}.tmp`;
    writeFileSync(temp, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    renameSync(temp, this.path);
  }
  event(c, type, actor, data) {
    const previous = this.state.audit.at(-1)?.hash || "genesis";
    const event = {
      sequence: this.state.audit.length + 1,
      at: new Date().toISOString(),
      caseId: c.id,
      deploymentId: c.deploymentId,
      tenantId: c.tenantId,
      type,
      actor,
      data,
      previous,
    };
    event.hash = digest(event);
    this.state.audit.push(event);
    this.save(); // audit written before dispatch, approvals and outcomes durable
    return event;
  }
  verifyAudit() {
    let previous = "genesis";
    return this.state.audit.every(({ hash, ...event }, index) => {
      const okay =
        event.sequence === index + 1 &&
        event.previous === previous &&
        digest(event) === hash;
      previous = hash;
      return okay;
    });
  }
  profile(principal, id) {
    const p = this.state.profiles.find((p) => p.id === id);
    if (
      !p ||
      !principal.deployments.includes(id) ||
      (principal.role !== "operator" && p.tenantId !== principal.tenantId)
    )
      fail(404, "Deployment not found.");
    return p;
  }
  case(principal, id) {
    const c = this.state.cases.find((c) => c.id === id);
    if (!c) fail(404, "Case not found.");
    this.profile(principal, c.deploymentId);
    return c;
  }
  visibleProfiles(principal) {
    return this.state.profiles.filter(
      (p) =>
        principal.deployments.includes(p.id) &&
        (principal.role === "operator" || p.tenantId === principal.tenantId),
    );
  }
}
