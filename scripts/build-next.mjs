import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import path from "node:path";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const root = process.cwd();
const apiRoutesPath = path.join(root, "app", "api");
const disabledApiRoutesPath = path.join(root, ".next-github-pages-disabled-api");

async function runNextBuild() {
  const nextCliPath = path.join(root, "node_modules", "next", "dist", "bin", "next");

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [nextCliPath, "build"], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });

    child.on("close", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

async function disableApiRoutesForStaticExport() {
  if (!isGithubPages || !existsSync(apiRoutesPath)) return false;

  await rm(disabledApiRoutesPath, { force: true, recursive: true });
  await rename(apiRoutesPath, disabledApiRoutesPath);
  return true;
}

async function restoreApiRoutes(wereDisabled) {
  if (!wereDisabled) return;

  await rm(apiRoutesPath, { force: true, recursive: true });
  await rename(disabledApiRoutesPath, apiRoutesPath);
}

let apiRoutesWereDisabled = false;

try {
  apiRoutesWereDisabled = await disableApiRoutesForStaticExport();
  const { code, signal } = await runNextBuild();

  if (signal) {
    console.error(`next build exited with signal ${signal}`);
    process.exitCode = 1;
  } else {
    process.exitCode = code;
  }
} finally {
  await restoreApiRoutes(apiRoutesWereDisabled);
}
