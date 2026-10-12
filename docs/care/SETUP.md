# Run Vaultline Care

This is a working **local synthetic demo** of Media Nexus support. It uses OpenIT's
React/TypeScript toolchain, bundled fonts and file-based workspace approach, with a
new constrained Node gateway. It does not connect to production, launch Claude Code,
or expose the general OpenIT terminal, filesystem tools, plugin scripts or updater.

## Quick start

Use Node 22 or newer (verified on Node 24) and npm. Rust is not required for Care.

```bash
git clone https://github.com/jake-vaultline/vaultline-care.git
cd vaultline-care
git switch codex/vlp-2171-vaultline-care
npm ci
npm run care:build
npm run care:start
```

Open **http://127.0.0.1:4317**. Use that exact address: Host and Origin checks reject
other hostnames. `--production` means built frontend assets, **not production clients**.
`CARE_MODE=production` deliberately refuses to start.

For frontend changes, run `npm run care:dev` instead. It serves Vite through the same
loopback gateway. Do not use `npm run dev` or `vite preview` to run the Care workflow:
those do not supply the Care authorization service.

The original OpenIT desktop path is retained: `npm run tauri dev` with Rust and
Tauri prerequisites. It is not the Care runtime and its unrestricted Claude/PTY
capabilities must not be exposed to support clients. A native Vaultline Care package
has not been built, signed or notarized.

## Reproduce the scenario

1. Choose **North Studio client** and open the demo workspace.
2. Leave “My transfer stalled.” in the case form; choose **Open case & investigate**.
3. Inspect the numbered evidence sources and deployment guide. North's destination
   is disconnected, with 780 GB free; its transfer has a checkpoint at 42%.
4. **Review proposal** shows effect, deployment, authorization and recovery boundary.
   Check approval and choose **Approve proposal**. Approval alone changes no transfer.
5. Choose **Run approved demo repair**. A fresh read must show `running`, 43%, and a
   reachable destination. This proves synthetic recovery, not transfer completion.
6. Switch to **South House client**. North's cases, guides and evidence disappear.
   Open the same complaint: South has 0 GB free. Its log tool is unavailable. It gets
   a capacity diagnosis and a handoff recommendation, not North's repair.
7. Add a follow-up, then **Prepare Jake handoff**. A JSON download contains history,
   evidence, attempted actions, approvals, verification, limitations and audit.
   Nothing is emailed or sent to anyone.
8. Choose **Jake · demo operator**, select South, and open its case in the case list.
   The complete context is available without reconstructing the conversation.

Only confirm a case resolved after the client reports completion. The demo connector
does not finish the transfer; `resolved` records a client report, not completion proof.

## State and recovery

The default vault is `~/.vaultline-care-demo/care-vault.json`, outside Git. Files are
written with owner-only modes. An exclusive `.server.lock` allows one server process
per vault and is released on normal server close. After a crash, confirm the recorded
PID has stopped before removing only that lock, or choose a new `CARE_DATA_DIR`.
The case snapshot
and hash-chain audit are written together by atomic rename. This is a local demo
store, not a multi-process database or a tamper-proof external audit authority.

Cases survive restart; sessions do not. Select a demo identity after restarting.
An in-flight dispatch becomes `verification_required` and `needs_jake` on restart,
and cannot be replayed. Corrupt JSON or audit chains fail startup rather than reset.

For a fresh stalled-transfer replay, use a new directory instead of deleting cases:

```bash
CARE_DATA_DIR="$(mktemp -d /tmp/vaultline-care-demo.XXXXXX)" CARE_PORT=4318 npm run care:dev
```

Open http://127.0.0.1:4318. The default demo's state stays intact.

## Model configuration

Default `CARE_MODEL_PROVIDER=evidence-rules` is deterministic and local: zero model
calls, tokens and cost. All diagnoses and repair selection come from observed structured
evidence and a closed action registry.

An optional `openai-compatible` provider can add a separately labeled, unverified
explanation. It receives only the authorized deployment's findings and guide, has no
tools, and cannot approve or dispatch actions. Configure these **server-side**:

| Setting | Value |
|---|---|
| `CARE_MODEL_PROVIDER` | `openai-compatible` |
| `CARE_MODEL_BASE_URL` | Approved HTTPS API base, normally ending in `/v1`; loopback HTTP allowed for a local provider |
| `CARE_MODEL_NAME` | Provider's model identifier |
| `CARE_MODEL_KEY` | Secret supplied through the deployment's secret manager; never browser/Git |
| `CARE_ALLOW_MODEL_EGRESS` | `true` only after authorizing that destination and data sharing |

No provider was called during verification. Missing credentials, disabled egress,
invalid configuration or provider failures produce an honest limitation and retain
the local evidence diagnosis. Provider-reported token counts are recorded; absent
counts and cost stay unknown. Set these variables in the launching process; `.env`
files are not implicitly loaded by the Care server.

## Checks

```bash
npm run care:test
npm test
npm run care:build
```

Care uses Node's test runner for real HTTP authorization and support state tests.
The upstream jsdom suite remains separate. External Pinkfish integration tests and
Rust desktop tests are not required to run the Care browser workflow.
