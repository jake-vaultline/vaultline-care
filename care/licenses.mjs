// Vaultline Care addition. Ship upstream and browser dependency license texts with built assets.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
const destination = "dist-care/legal";
mkdirSync(destination, { recursive: true });
for (const name of ["LICENSE", "NOTICE"])
  copyFileSync(name, `${destination}/${name}`);
const dependencies = [
  ["react", "LICENSE"],
  ["react-dom", "LICENSE"],
  ["scheduler", "LICENSE"],
  ["lucide-react", "LICENSE"],
  ["@fontsource/inter", "LICENSE"],
  ["@fontsource/jetbrains-mono", "LICENSE"],
  ["@fontsource/fraunces", "LICENSE"],
  ["@fontsource-variable/source-serif-4", "LICENSE"],
];
const text = dependencies
  .map(
    ([name, license]) =>
      `${name}\n${"=".repeat(name.length)}\n${readFileSync(`node_modules/${name}/${license}`, "utf8")}`,
  )
  .join("\n\n");
writeFileSync(`${destination}/THIRD_PARTY.txt`, text);
