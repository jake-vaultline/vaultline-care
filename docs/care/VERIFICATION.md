# Verification receipt

Checked 2026-10-12 on macOS / Apple Silicon / Node 24.13.0. Task: `VLP-2171`.
Branch: `codex/vlp-2171-vaultline-care`. This is branch evidence for a local synthetic
workflow, not integrated source, a production deployment, installed-client proof
or physical Media Nexus qualification.

## Upstream baseline ran before modifications

- Cloned upstream at `1b3141604e8c04aaecad1c4655f797791afb8238`, exactly `v3.2.0`.
- Read README, CLAUDE.md, CONTRIBUTING.md, actual LICENSE, package scripts, React
  entrypoint, Vite/Vitest configuration, and Tauri/plugin architecture.
- Installed JavaScript dependencies with `npm ci` before editing.
- Downloaded upstream's official `OpenIT_aarch64.app.tar.gz` release and launched
  the native application. Its UI displayed vault onboarding and detected Claude
  Code. No Claude session was started and no existing vault was changed.
- Release archive SHA-256:
  `4e1c1ce825e02be3abe139120dec107ba67e17b3e33b6caab0b8b640bbde12c9`, matching the
  digest reported by GitHub's upstream release metadata.
- Source and shipped release are the same version. The native source build was
  not run because Rust/cargo is absent on this Mac. No Care native package is claimed.

## Automated evidence

| Command | Result | Coverage |
|---|---|---|
| `npm run care:test` | 22/22 pass | Real HTTP session/tenant/CSRF/host checks; cross-client profiles, docs, evidence, handoffs and proposals; injection; read-only nonmutation; approval, revocation, expiry, changed state, concurrent/repeated execution; fresh and failed read-back; persistence, audit corruption, crash recovery; exclusive vault lock; provider failure and token reporting; exact MCP read contract |
| `npm test` | 346/346 pass in 25 files | Upstream frontend regression suite |
| `npm run care:build` | Pass | TypeScript, production Care bundle, upstream and browser license distribution |
| `npm run build` | Pass | Original OpenIT frontend remains buildable; existing bundle-size/dynamic import warnings remain |
| `git diff --check` | Pass | Patch whitespace |

The HTTP end-to-end test opens a case, follows captured evidence and document URLs,
refuses unapproved execution, approves the exact preview, races two dispatches (only
one succeeds), checks new progress, exports a handoff and reads the case as Jake.
The separate South test proves a distinct capacity diagnosis, unavailable logs,
preserved follow-ups, handoff, and refusal to resolve before verified recovery.

Existing frontend CI jobs now run the Care tests/build alongside upstream checks.
Hosted CI results are separate from these local results. No Rust code was changed;
local cargo test/fmt/clippy and real Pinkfish API integration tests were not run.

## Browser workflow evidence

The built frontend was served by the real Care server at `http://127.0.0.1:4317`.
All interactions below used the UI, not a frontend mock:

1. **North case opened and diagnosed.** Transfer stalled at 42%, destination
   disconnected, 780 GB free. Four source citations appeared. The transfer status
   citation opened the actual captured JSON in an evidence dialog.
   [Screenshot](../../evidence/care/01-north-diagnosis.png).
2. **Repair reviewed and approved.** Preview showed deployment, effect, recovery
   boundary, required authorization and expiry. Approval was disabled until the
   explicit checkbox was checked. Approval exposed a separate execution button.
   [Screenshot](../../evidence/care/02-repair-review.png).
3. **Repair executed and read back.** New evidence showed `running`, 43%, and a
   reachable destination; the case said recovery verified while explicitly stating
   that transfer completion was not proved.
   [Screenshot](../../evidence/care/03-recovery-verified.png).
4. **South isolated.** Identity switching removed North's profile, cases and guide.
   The same complaint produced a 68% stalled transfer with 0 GB free, unavailable
   log diagnostic, no reconnection proposal and Jake handoff recommendation.
   [Screenshot](../../evidence/care/04-south-isolated.png).
5. **Handoff and operator review.** Added a follow-up, downloaded the handoff through
   the UI, then selected Jake's operator identity, South and its existing case. Full
   conversation, findings, limitations, sources and review next action were visible.
   [Screenshot](../../evidence/care/05-jake-handoff.png).

The downloaded [synthetic handoff](../../evidence/care/south-handoff.json) was parsed
from the actual Downloads file: 4 messages, 8 evidence records and 19 audit entries;
audit chain verified and no North Studio content. The browser automation download
event wait timed out, but the downloaded file existed and its content was verified
directly. Nothing was sent to Jake or another person.

## Known limitations and advisories

- Demo identity switching is intentionally available only on loopback. This is not
  authentication suitable for real client information. Production mode refuses startup.
- Real MCP calls were not exercised. An unauthenticated public health probe returned
  404; that does not establish whether a granted connection would work. The supplied
  MCP adapter is verified with a mocked transport and cannot execute writes.
- No external model calls were made. Configurable OpenAI-compatible provider behavior
  and reported token counts were tested with a mocked provider. Local evidence rules
  drove the browser demonstration.
- Inherited `npm ci`/`npm audit` reported 17 dependency advisories: 8 high, 7 moderate,
  2 low. They include original PDF/Excel viewers and development/build dependencies.
  Care's production bundle excludes the original PDF/Excel/PTY workspace, but that
  is not a blanket dismissal of the advisories. Major upstream dependency migration
  is outside this slice and remains a production-release review item.
- Case audit is a local hash chain, not an externally anchored or tamper-proof ledger.
  The snapshot is single-process JSON. See [integration requirements](INTEGRATIONS.md)
  for real identity, deployment, diagnostics, action, retention and release gates.
