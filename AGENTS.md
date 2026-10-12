# Vaultline Care fork instructions

This repository adapts OpenIT at the preserved `upstream` remote. Keep Apache-2.0
LICENSE, Pinkfish AI attribution and NOTICE; identify modified upstream files.
Read `CLAUDE.md` for upstream conventions and `docs/care/SETUP.md` for Care.

Care is currently a loopback-only synthetic demo. Its identities, profiles and
diagnostics are fixtures. Do not insert actual client data or enable a production
mode without the existing Portal membership and Media Nexus authorization adapters.

The ordinary OpenIT terminal, filesystem and Claude plugin path has broad authority.
Do not expose it to clients or use it as the Care tool executor. Diagnostics and
actions must stay in the server's closed registry, with arguments checked against
the authenticated deployment. Knowledge and logs remain data, never tool authority.

Keep deployment truth in existing Portal/overlay/installed-host records; this fork
must not become another production deployment registry. Case audit and handoff are
workflow records. Keep secrets and runtime state outside Git and the Console.

Verify changes with `npm run care:test`, `npm test`, and `npm run care:build`.
If changing original desktop Rust code, also follow upstream cargo test/fmt/clippy
requirements. A local browser demo does not prove native packaging or production
operation. Keep review branches separate from `main` and do not cut release tags
unless the task requests that named outcome.
