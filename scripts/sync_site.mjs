// Copies the built bundle into site/ (stable filenames) for the GitHub Pages branch-mode
// fallback loader in index.html. Runs automatically at the end of `npm run build`.
// Commit the refreshed site/ files together with source changes.
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const assets = "dist/assets";
let files;
try {
  files = readdirSync(assets);
} catch {
  console.error("[sync_site] dist/assets not found — run vite build first");
  process.exit(1);
}
const js = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
const css = files.find((f) => f.startsWith("index-") && f.endsWith(".css"));
if (!js || !css) {
  console.error("[sync_site] expected index-*.js and index-*.css in dist/assets");
  process.exit(1);
}
const jsAll = files.filter((f) => f.endsWith(".js"));
if (jsAll.length > 1) {
  console.error("[sync_site] multiple JS chunks found — the fallback expects a single self-contained bundle:", jsAll.join(", "));
  process.exit(1);
}
mkdirSync("site", { recursive: true });
cpSync(join(assets, js), join("site", "app.js"));
cpSync(join(assets, css), join("site", "app.css"));
console.log(`[sync_site] site/app.js <- ${js}; site/app.css <- ${css}`);
