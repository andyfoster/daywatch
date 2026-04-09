#!/usr/bin/env node

import { execSync } from "child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "fs";
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

function createZipArchive() {
  rmSync(zipPath, { force: true });
  execSync(`find "${packageDir}" -name ".DS_Store" -delete`);

  try {
    execSync(`zip -r "${zipPath}" .`, {
      cwd: packageDir,
      stdio: "inherit"
    });
  } catch (error) {
    throw new Error(
      "Failed to create zip archive. Ensure the `zip` command is available on your machine."
    );
  }
}

function main() {
  ensureRequiredEntries();
  mkdirSync(distRoot, { recursive: true });
  buildPackageDirectory();
  createZipArchive();

  console.log(`Chrome Web Store package created: ${zipPath}`);
}

main();
