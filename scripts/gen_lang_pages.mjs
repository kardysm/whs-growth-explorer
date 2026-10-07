// Generates the /pl/ and /en/ entry pages (user request 2026-10-07: the language lives in the
// URL path). Two sets:
//   - dist/pl/index.html, dist/en/index.html — copies of the built entry; GitHub Pages serves
//     them at /pl/ and /en/ (the Actions deployment uploads dist/).
//   - pl/index.html, en/index.html at the repo root — same trick for the branch-mode fallback
//     (Pages source "Deploy from a branch" serves the repo root raw; the entry's fallback
//     loader picks up ../site/app.js).
// Relative asset URLs are rewritten one level up (./assets/ -> ../assets/, ./site/ -> ../site/)
// so the pages work from a subdirectory WITHOUT a <base> tag — a base tag would also rewrite
// fragment links (#calc, #top) and clicking them would leave the language page.
// The html lang attribute matches the directory; the app itself reads the language from the pathname.
// Runs automatically in `npm run build`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

function make(src, lang) {
  let html = src.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  html = html.replaceAll("./assets/", "../assets/").replaceAll("./site/", "../site/");
  return html;
}

let dist;
try {
  dist = readFileSync("dist/index.html", "utf8");
} catch {
  console.error("[gen_lang_pages] dist/index.html not found — run vite build first");
  process.exit(1);
}
for (const l of ["pl", "en"]) {
  mkdirSync(`dist/${l}`, { recursive: true });
  writeFileSync(`dist/${l}/index.html`, make(dist, l));
}

const src = readFileSync("index.html", "utf8");
for (const l of ["pl", "en"]) {
  mkdirSync(l, { recursive: true });
  writeFileSync(`${l}/index.html`, make(src, l));
}
console.log("[gen_lang_pages] entry pages written: dist/pl, dist/en, pl/, en/");
