# Attribution and redistribution

Vaultline Care is an Apache-2.0 derivative of [OpenIT](https://github.com/openit-app/openit-app).
The inspected baseline is `1b3141604e8c04aaecad1c4655f797791afb8238` (`v3.2.0`).
Its actual LICENSE states “Copyright 2026 Pinkfish AI”. The complete upstream LICENSE
is unchanged. There was no upstream NOTICE file. The added root NOTICE identifies
upstream and the Vaultline modifications; it does not change the license or imply endorsement.

Modified upstream files carry modification notices: `src/main.tsx`, `package.json`
(the `vaultlineCare.modificationNotice` field), `vitest.config.ts`, `.gitignore`,
`index.html`, `README.md`, `CLAUDE.md`, and `.github/workflows/ci.yml`. New Care files identify their addition. The upstream
README, copyright notices, Rust source, plugin and original desktop application remain
in the source distribution. Brand names and trademarks are not granted by Apache-2.0.

`npm run care:build` copies LICENSE, NOTICE and the bundled font licenses into
`dist-care/legal/`. The browser build uses React (MIT), React DOM (MIT), lucide-react
(ISC) and OpenIT's bundled fonts (SIL Open Font License). Corresponding notices and
license texts are included in `dist-care/legal/THIRD_PARTY.txt`. Redistribution of a
future native package must include its additional Rust/Tauri and plugin dependency
notices; this browser build does not redistribute that native binary.
