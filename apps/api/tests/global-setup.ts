import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Build a fresh SQLite schema once before the whole test run. */
export default function setup(): void {
  process.env.DATABASE_URL = "file:./prisma/test.db";
  for (const f of ["./prisma/test.db", "./prisma/test.db-journal"]) {
    try {
      rmSync(f, { force: true });
    } catch {
      /* ignore */
    }
  }
  execSync("npx prisma db push --force-reset --skip-generate", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
  });
}
