/**
 * Version bump for the commit being created (semver).
 *
 * Called by `.githooks/commit-msg` with the path to the message file — git only guarantees the CURRENT
 * message there; a pre-commit hook sees a STALE COMMIT_EDITMSG (one commit behind; verified in a scratch
 * repo on 2026-10-07), which is why this is a commit-msg hook.
 *
 * Level: patch by default; "#minor" / "#major" in the message raise it; "[skip version]" or a merge
 * commit ("Merge …") skip the bump. The hook stages package.json so the bump is part of the commit.
 */
import { readFileSync, writeFileSync } from "node:fs";

const msgFile = process.argv[2] || "";
let msg = "";
try {
  msg = readFileSync(msgFile, "utf8");
} catch {
  msg = "";
}
const firstLine = (msg.split("\n")[0] || "").trim();
if (/\[skip version\]/i.test(msg) || /^Merge\b/.test(firstLine)) {
  console.log("[version] skipped (marker or merge commit)");
  process.exit(0);
}

let type = "patch";
if (/#major\b/i.test(msg)) type = "major";
else if (/#minor\b/i.test(msg)) type = "minor";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const cur = String(pkg.version || "0.0.0");
const [maj, min, pat] = cur.split(".").map((n) => Number(n) || 0);
const next = type === "major" ? `${maj + 1}.0.0` : type === "minor" ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;
pkg.version = next;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log(`[version] ${type} bump: ${cur} -> ${next}`);
