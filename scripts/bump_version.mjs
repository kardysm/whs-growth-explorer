/**
 * Patch-bump the package version for the commit being created (semver).
 *
 * Called by `.githooks/pre-commit` — pre-commit is the ONLY hook whose index changes land in the commit
 * (verified 2026-10-07: prepare-commit-msg/commit-msg run AFTER git snapshots the commit tree, so their
 * `git add` is left staged for the NEXT commit; a commit-msg bump therefore lags one commit behind).
 * pre-commit cannot see the current message (COMMIT_EDITMSG is empty/stale there), so the bump is always
 * a patch; for a minor/major release run `npm version minor|major` first — the hook then skips because
 * package.json is already staged.
 */
import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const cur = String(pkg.version || "0.0.0");
const [maj, min, pat] = cur.split(".").map((n) => Number(n) || 0);
const next = `${maj}.${min}.${pat + 1}`;
pkg.version = next;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log(`[version] patch bump: ${cur} -> ${next}`);
