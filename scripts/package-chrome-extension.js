#!/usr/bin/env node

import { execSync } from "child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const workspaceRoot = join(projectRoot, "..");
const manifestPath = join(projectRoot, "manifest.json");

if (!existsSync(manifestPath)) {
  throw new Error("manifest.json not found. Run this script from the extension project.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const version = manifest.version || "0.0.0";
const packageName = `daywatch-v${version}`;

const distRoot = join(workspaceRoot, "dist", "chrome");
const packageDir = join(distRoot, packageName);
const zipPath = join(distRoot, `${packageName}.zip`);

const runtimeEntries = [
  "manifest.json",
  "index.html",
  "script.js",
  "style.css",
  "dark-mode.css",
  "images",
  "icons",
  "modules",
  "vendor"
];

function ensureRequiredEntries() {
  const missing = runtimeEntries.filter((entry) => !existsSync(join(projectRoot, entry)));
  if (missing.length > 0) {
    throw new Error(`Missing required runtime entries: ${missing.join(", ")}`);
  }
}

function buildPackageDirectory() {
  rmSync(packageDir, { recursive: true, force: true });
  mkdirSync(packageDir, { recursive: true });

  runtimeEntries.forEach((entry) => {
    cpSync(join(projectRoot, entry), join(packageDir, entry), { recursive: true });
  });
}

function stripGlob(pattern) {
  // Turns a manifest glob ("modules/*.js", "icons/*") into a RegExp.
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
}

function pathExistsInPackage(relativePath) {
  if (!relativePath.includes("*")) {
    return existsSync(join(packageDir, relativePath));
  }

  const dir = dirname(relativePath);
  const dirAbs = join(packageDir, dir);
  if (!existsSync(dirAbs)) return false;

  const pattern = stripGlob(relativePath.split("/").pop());
  return readdirSync(dirAbs).some((file) => pattern.test(file));
}

function collectManifestReferences(m) {
  const refs = [];

  const addAll = (obj) => {
    if (!obj) return;
    if (typeof obj === "string") refs.push(obj);
    else if (Array.isArray(obj)) obj.forEach(addAll);
    else if (typeof obj === "object") Object.values(obj).forEach(addAll);
  };

  addAll(m.icons);
  if (m.action) {
    addAll(m.action.default_icon);
    if (m.action.default_popup) refs.push(m.action.default_popup);
  }
  if (m.background && m.background.service_worker) refs.push(m.background.service_worker);
  (m.content_scripts || []).forEach((cs) => {
    addAll(cs.js);
    addAll(cs.css);
  });
  (m.web_accessible_resources || []).forEach((war) => addAll(war.resources));
  addAll(m.chrome_url_overrides);
  if (m.options_page) refs.push(m.options_page);
  if (m.options_ui && m.options_ui.page) refs.push(m.options_ui.page);
  if (m.devtools_page) refs.push(m.devtools_page);

  return [...new Set(refs)];
}

function getPngDimensions(filePath) {
  const buffer = readFileSync(filePath);
  const isPng = buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47;
  if (!isPng) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function validateManifestReferences() {
  const packagedManifest = JSON.parse(readFileSync(join(packageDir, "manifest.json"), "utf8"));
  const refs = collectManifestReferences(packagedManifest);

  const missing = refs.filter((ref) => !pathExistsInPackage(ref));
  if (missing.length > 0) {
    throw new Error(
      `manifest.json references files that don't exist in the package:\n  ${missing.join("\n  ")}`
    );
  }
}

function validateIconDimensions() {
  const packagedManifest = JSON.parse(readFileSync(join(packageDir, "manifest.json"), "utf8"));
  const iconMaps = [packagedManifest.icons, packagedManifest.action?.default_icon];

  const problems = [];
  iconMaps.forEach((iconMap) => {
    if (!iconMap || typeof iconMap !== "object") return;
    Object.entries(iconMap).forEach(([size, relPath]) => {
      const declared = Number(size);
      if (!Number.isFinite(declared)) return;

      const absPath = join(packageDir, relPath);
      if (!existsSync(absPath)) return; // already reported by validateManifestReferences

      const dims = getPngDimensions(absPath);
      if (!dims) {
        problems.push(`${relPath} is not a valid PNG file`);
      } else if (dims.width !== declared || dims.height !== declared) {
        problems.push(
          `${relPath} is declared as ${declared}x${declared} in manifest.json but is actually ${dims.width}x${dims.height}`
        );
      }
    });
  });

  if (problems.length > 0) {
    throw new Error(`Icon size mismatch:\n  ${problems.join("\n  ")}`);
  }
}

function checkDescriptionForKeywordStuffing() {
  const description = manifest.description || "";
  const words = description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  const counts = {};
  words.forEach((w) => (counts[w] = (counts[w] || 0) + 1));
  const repeated = Object.entries(counts).filter(([, count]) => count > 2);

  if (repeated.length > 0) {
    console.warn(
      `⚠️  manifest description repeats: ${repeated.map(([w, c]) => `"${w}" x${c}`).join(", ")}. ` +
        "Chrome Web Store rejects listings with excessive/repeated keywords — also double-check the Store Listing description text in the Developer Dashboard, which is separate from this file."
    );
  }
}

function cleanMacJunk(dir) {
  execSync(`find "${dir}" \\( -name ".DS_Store" -o -name "._*" -o -name "__MACOSX" \\) -delete`, {
    stdio: "ignore"
  });
}

function createZipArchive() {
  rmSync(zipPath, { force: true });
  cleanMacJunk(packageDir);

  try {
    execSync(`zip -r -X "${zipPath}" .`, {
      cwd: packageDir,
      stdio: "inherit"
    });
  } catch (error) {
    throw new Error(
      "Failed to create zip archive. Ensure the `zip` command is available on your machine."
    );
  }
}

function verifyZipRoot() {
  const listing = execSync(`unzip -l "${zipPath}"`, { encoding: "utf8" });
  if (!/\smanifest\.json$/m.test(listing)) {
    throw new Error(
      "manifest.json is not at the root of the zip. Chrome Web Store requires manifest.json " +
        "to be a top-level entry, not nested inside a subfolder."
    );
  }
  if (/__MACOSX|\._/.test(listing)) {
    throw new Error("The zip contains macOS junk files (__MACOSX or ._*). Re-run the packager.");
  }
}

function main() {
  ensureRequiredEntries();
  mkdirSync(distRoot, { recursive: true });
  buildPackageDirectory();

  console.log("🔍 Validating manifest.json against packaged files...");
  validateManifestReferences();
  validateIconDimensions();
  checkDescriptionForKeywordStuffing();
  console.log("✅ Manifest validation passed");

  createZipArchive();
  verifyZipRoot();

  console.log(`\nChrome Web Store package created: ${zipPath}`);
  console.log("Upload this zip directly — do not re-zip it or wrap it in another folder.");
}

main();
