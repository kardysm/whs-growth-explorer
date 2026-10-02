import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

/** Build-time metadata: version from package.json, date + commit from the git repo. */
function buildMeta(): { version: string; date: string; commit: string } {
  const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: string };
  let commit = "no-git";
  try {
    const head = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().length > 0;
    commit = head + (dirty ? "+" : "");
  } catch {
    /* not a git checkout — keep the fallback */
  }
  return {
    version: pkg.version ?? "0.0.0",
    date: new Date().toISOString().slice(0, 10),
    commit,
  };
}

const meta = buildMeta();

export default defineConfig({
  base: "./",
  define: {
    __BUILD_VERSION__: JSON.stringify(meta.version),
    __BUILD_DATE__: JSON.stringify(meta.date),
    __BUILD_COMMIT__: JSON.stringify(meta.commit),
  },
  build: {
    outDir: "dist",
    target: "es2020",
    chunkSizeWarningLimit: 1200,
  },
});
