// Vaultline Care addition. A closed registry: no shell, dynamic scripts or document-authored tools.
import { fail, clone } from "./store.mjs";

export const diagnostics = new Set([
  "transfer_status",
  "destination_status",
  "diagnostic_log",
]);
export function validateDiagnostic(
  profile,
  operation,
  args,
  checkAvailability = true,
) {
  if (!diagnostics.has(operation))
    fail(400, "Unsupported diagnostic operation.");
  if (
    !args ||
    typeof args !== "object" ||
    Array.isArray(args) ||
    Object.keys(args).some((k) => k !== "transferId")
  )
    fail(400, "Diagnostic arguments must contain only transferId.");
  if (args.transferId !== profile.transfer.id)
    fail(404, "Transfer not found in this deployment.");
  if (checkAvailability && !profile.tools.includes(operation))
    fail(503, "This diagnostic is not available for this deployment.");
}

export class DemoConnector {
  async inspect(profile, operation, args) {
    validateDiagnostic(profile, operation, args);
    const t = profile.transfer;
    if (operation === "transfer_status")
      return {
        transferId: t.id,
        name: t.name,
        status: t.status,
        progress: t.progress,
        blocker: t.blocker,
        revision: t.revision,
      };
    if (operation === "destination_status")
      return {
        online: t.destinationOnline,
        freeGb: t.freeGb,
        revision: t.revision,
      };
    return {
      entries: [
        {
          level: "warning",
          code: t.blocker || "none",
          message: t.blocker
            ? "Destination connection interrupted; checkpoint retained."
            : "Destination reachable; transfer resumed.",
        },
      ],
      contentTrust: "untrusted-diagnostic-content",
      revision: t.revision,
    };
  }
  async execute(profile, action, args) {
    if (
      !profile.synthetic ||
      action !== "demo.reconnect_destination" ||
      args.transferId !== profile.transfer.id ||
      Object.keys(args).length !== 1
    )
      fail(403, "Action is not supported by this connector.");
    if (
      profile.transfer.blocker !== "destination_offline" ||
      profile.transfer.freeGb <= 0
    )
      fail(409, "Conditions changed. Inspect again before proposing a repair.");
    profile.transfer = {
      ...profile.transfer,
      destinationOnline: true,
      status: "running",
      progress: profile.transfer.progress + 1,
      blocker: null,
      revision: profile.transfer.revision + 1,
    };
    return {
      outcome:
        "Synthetic destination reconnected; copy resumed from checkpoint.",
    };
  }
}

// Production connector seam. Observed Core MCP tools accept no arguments for these reads.
// It deliberately does not pretend queue-wide results identify an exact transfer.
export class MediaNexusReadConnector {
  constructor({ endpoint, credential, fetchImpl = fetch }) {
    const url = new URL(endpoint);
    if (
      url.pathname !== "/api/mcp/v1/rpc" ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["127.0.0.1", "localhost"].includes(url.hostname)
        )) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error("Use the approved Media Nexus MCP endpoint.");
    this.endpoint = endpoint;
    this.credential = credential;
    this.fetch = fetchImpl;
  }
  async inspect(_profile, operation, args) {
    const tools = { jobs_status: "jobs_status", drive_status: "drive_status" };
    if (!Object.hasOwn(tools, operation) || !args || Object.keys(args).length)
      fail(
        400,
        "Only allowlisted MCP reads with empty arguments are supported.",
      );
    const response = await this.fetch(this.endpoint, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${await this.credential()}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: tools[operation], arguments: {} },
      }),
    }).catch(() => fail(503, "Media Nexus could not be reached."));
    if (!response.ok)
      fail(
        503,
        "Media Nexus refused this read; check the existing grant and module configuration.",
      );
    const body = await response.json();
    if (body.error || body.result?.isError || !body.result)
      fail(503, "The Media Nexus diagnostic is unavailable.");
    return {
      source: "media-nexus-mcp",
      coverage:
        "Deployment-wide status; exact transfer diagnosis requires a reviewed mapping.",
      contentTrust: "untrusted-diagnostic-content",
      result: clone(body.result),
    };
  }
  async execute() {
    fail(
      403,
      "Production repairs must use Media Nexus action intents and existing authorization. This adapter is read-only.",
    );
  }
}
