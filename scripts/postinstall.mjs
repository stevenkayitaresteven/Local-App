// Runs automatically after `npm install`. Makes a fresh clone runnable with no
// manual setup: ensures the API has an env file, builds the shared package so the
// apps can import its compiled output, and generates the Prisma client.
import { execSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });

// 1. Ensure apps/api has a .env (Prisma CLI and the runtime both read it).
const apiEnv = resolve(root, "apps/api/.env");
const example = resolve(root, ".env.example");
if (!existsSync(apiEnv) && existsSync(example)) {
  copyFileSync(example, apiEnv);
  console.log("→ created apps/api/.env from .env.example");
}

// 2. Build the shared package so `@umuturanyi/shared` resolves to dist/.
try {
  run("npm run build -w @umuturanyi/shared");
} catch {
  console.warn("⚠ could not build @umuturanyi/shared — run `npm run build -w @umuturanyi/shared`");
}

// 3. Generate the Prisma client (skipped gracefully on restricted networks).
try {
  run("npm run prisma:generate -w @umuturanyi/api");
} catch {
  console.warn("⚠ prisma generate failed — run `npm run prisma:generate -w @umuturanyi/api` once your network allows engine downloads");
}
