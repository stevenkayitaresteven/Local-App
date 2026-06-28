import { config } from "dotenv";
import { resolve } from "node:path";

/**
 * Load environment variables from local files so a fresh clone runs with no manual
 * setup. Precedence (highest first): real process env → apps/api/.env → repo-root
 * .env. dotenv never overrides variables already set in the environment, so
 * containers and CI (which inject real env vars) are unaffected.
 *
 * Imported for its side effect at the very top of config/env.ts and the seed, so
 * variables exist before anything reads `process.env`.
 */
const cwd = process.cwd();
for (const path of [resolve(cwd, ".env"), resolve(cwd, "../../.env")]) {
  config({ path, override: false });
}
