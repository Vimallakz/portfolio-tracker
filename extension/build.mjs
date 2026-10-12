// Bundles the extension into extension/dist. Run with `npm run ext:build`, or add --watch.
// `--zip <file>` also packs dist for download; `npm run build` uses it to serve the extension from the live app.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

import { zipDirectory } from "./zip.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const args = process.argv.slice(2);
const watch = args.includes("--watch");
const zipIndex = args.indexOf("--zip");
const zipFile = zipIndex === -1 ? null : resolve(args[zipIndex + 1]);

/** The address the popup suggests. EXTENSION_APP_URL wins; on Vercel the production domain is used. */
function defaultAppUrl() {
  if (process.env.EXTENSION_APP_URL) {
    return new URL(process.env.EXTENSION_APP_URL).origin;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return "http://localhost:3000";
}

const appUrl = defaultAppUrl();

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// Granting the default address up front means users are never asked for permission to reach it.
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const appOrigin = `${appUrl}/*`;
if (!manifest.host_permissions.includes(appOrigin)) {
  manifest.host_permissions.unshift(appOrigin);
}

await Promise.all([
  writeFile(join(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
  cp(join(root, "src/popup.html"), join(dist, "popup.html")),
  cp(join(root, "src/popup.css"), join(dist, "popup.css")),
  cp(join(root, "icons"), join(dist, "icons"), { recursive: true }),
]);

const options = {
  entryPoints: {
    background: join(root, "src/background.ts"),
    content: join(root, "src/content.ts"),
    popup: join(root, "src/popup.ts"),
  },
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome120",
  define: { __DEFAULT_APP_URL__: JSON.stringify(appUrl) },
  logLevel: "info",
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
} else {
  await esbuild.build(options);
  console.log(`  App address: ${appUrl}`);

  if (zipFile) {
    await mkdir(dirname(zipFile), { recursive: true });
    await zipDirectory(dist, zipFile, "portfolio-intelligence-extension");
    console.log(`  Packed: ${zipFile}`);
  }
}
