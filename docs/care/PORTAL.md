# Vaultline Care in the Client Portal

The production workflow lives in Vaultline Client Portal, not the desktop application's unrestricted terminal. The Portal adapter preserves its first-party authentication, organization membership, systems, documents, and requests. This fork supplies the portable diagnosis and approval policy (`care/production-policy.ts`) and retains the runnable synthetic local slice.

The Portal integration is tracked by VLP-2171 on `codex/vlp-2171-care-portal` in `jake-vaultline/vaultline-client-portal`. Its `docs/CARE_SUPPORT.md` specifies migration, HTTPS connector bindings, read-only grants, exact action approval, readback, rollback, and synthetic validation. Source integration does not establish live activation or a client's deployment qualification.

No Portal secrets, client facts, or production diagnostic results are stored in this public fork. The pure policy has no network, filesystem, shell, or authentication authority. Portal deployments must use the Portal server adapter and persisted authorization; never expose the loopback demo server as a multi-client service.
