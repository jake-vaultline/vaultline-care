# Existing authorities and connector requirements

Inspected 2026-10-12. No real client facts, tokens, credentials, deployment changes
or raw production logs were copied into this public fork.

## Source evidence

| Authority inspected | Source and observation | Care use |
|---|---|---|
| Core source | `jake-vaultline/vaultline-sandbox`, local HEAD `130ceb3f6278c5a5b498073c76143daecca6e1ff`; `docs/modules/support.md`, `docs/modules/mcp.md`, `vaultline_support.py`, `vaultline_tools.py`, `vaultline_mcp.py`, `vaultline_server.py` | Reuse its support and action authority; no live readiness claim from source |
| Media Nexus support | `GET /api/support/v1/status`, `GET /api/support/v1/history`; administrator or existing temporary support grant; unauthorized callers get 404 | Local status is unsanitized. A production connector must use existing grants and the sanitized bundle serializers; no new raw-log channel |
| Media Nexus MCP | `/api/mcp/v1/rpc`; closed tool catalog; `jobs_status` and `drive_status` accept empty arguments in inspected source | Read-only `MediaNexusReadConnector` implements exactly those observed calls; mocked contract test only |
| Client Portal | `jake-vaultline/vaultline-client-portal`, local HEAD `41f186b2e0568d6d28de29d7f859f66df8b084b4`; `app/api/auth/login/route.ts`, `app/api/requests/route.ts`, `app/support/page.tsx` | Existing authenticated organization/system-bound requests and membership remain production support intake |
| Console | CLI live lookup, task `VLP-2171`; Console MCP calls attempted for capabilities, open human inputs and development context but transport timed out | Development tracking and governance, not a new client-auth database. CLI writes and readbacks succeeded |

The documented public Sandbox MCP health address answered **404**. A 404 is not
proof that an installation lacks the feature: composition and authorization can
hide it. No approved Care-scoped connection credential was provisioned or used.
The localhost test address was not serving; one LAN reachability probe timed out.
Those probes do not establish outage or a root cause. The demo does not pretend
they are deployment diagnostics.

## Authority boundaries

Real deployment facts remain in private client overlays and their exact Core locks,
the Portal's installation records, and the installed Media Nexus host. The demo
profiles are synthetic fixtures, never a replacement deployment registry.

Care's new support workflow is behind adapters. Replace the demo principal resolver
with the existing Portal server-authenticated organization/member/system mapping;
never accept client-provided tenant IDs, operator roles or deployment endpoints.
Keep demo identity switching out of that production path. Resolve profile and document
references from existing authoritative records with per-request access checks.

The service/connector boundary is `inspect(profile, operation, args)` and
`execute(profile, action, args)`. Diagnostic results and case evidence are separate:
the service snapshots each successful or unavailable result with time and provenance.
For production, supply one approved connector per authorized deployment and normalize
only fields documented by that exact installed release into the diagnostic contract.
The supplied MCP adapter's deployment-wide queue/drive coverage **cannot establish an
exact stalled transfer**. An exact transfer mapping remains a commissioning requirement;
do not infer transfer status from a generic queue summary.

`MediaNexusReadConnector` is deliberately not enabled by an environment variable or
the client selector. It uses a trusted, fixed endpoint and a server-side credential
callback. It forwards only `jobs_status` and `drive_status`, rejects extra arguments,
refuses redirects, times out, and has no repair implementation. Existing MCP module,
remote-access and resource grants still apply. Its authorization is not a general
browser session or a temporary support account's new permanent credential.

Production repair adapters must route through the existing action-intent preview,
resource authorization, confirmation, audit, idempotency and durable job path.
Do not substitute Care's demo approval for Media Nexus authorization. Deletion,
credential changes and unsupported production writes remain unimplemented here,
even for the demo Jake role.

## Safety model implemented in this slice

- A server-derived principal is checked before profile, case, evidence, document,
  handoff or proposal access. Retrieval takes place inside the authorized profile,
  rather than searching a shared index and filtering afterward.
- The loopback server rejects unapproved Hosts/Origins, cross-site requests,
  expired/missing sessions and missing CSRF tokens on mutations. Demo identities
  are explicitly test identities, not real authentication.
- Closed diagnostics accept only a deployment-owned `transferId`. There is no shell,
  eval, subprocess, freeform script, arbitrary file read or document-supplied operation.
- Preview details are built by the server. Approval binds to the stored proposal
  fingerprint and current transfer digest, expires after 15 minutes, and is separate
  from execution. Permissions are checked again immediately before dispatch.
- Requests are serialized in one process. Dispatch is audited before execution;
  repeated/concurrent execution cannot dispatch the same proposal twice.
- Every executed demo action gets new transfer and destination reads. Failed or
  unavailable verification leaves the case for Jake, without an automatic replay.
- Client text, knowledge and logs are untrusted data. React renders source text
  without HTML execution. Optional model prose is unverified and has no action authority.

## Precise production blockers

1. Bind Care to the Portal's existing authenticated organization/system membership
   and request record; remove demo identity selection. No live identity integration
   or client enrollment is included in this slice.
2. Select an exact installed Media Nexus release and an existing approved read grant.
   Confirm live tool discovery and map its actual transfer/destination evidence.
   Synthetic operations `transfer_status`, `destination_status` and `diagnostic_log`
   are local adapter methods, **not invented Media Nexus API endpoints**.
3. Commission repair operations through that installation's governed action intents;
   qualify permissions, idempotency and physical read-back. The only executing adapter
   today is `demo.reconnect_destination`, which changes disposable fixture state.
4. Review retention, sanitized support evidence and external-model sharing for the
   real client. Current store is local, owner-readable, single-process demo JSON.
5. Review inherited npm advisories and native packaging before any public service or
   signed Care desktop release. Native build tools were absent on this Mac; no Care
   binary was built or deployed.

None of these blockers prevents running or reviewing the complete synthetic workflow.
