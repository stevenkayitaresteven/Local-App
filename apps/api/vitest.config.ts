import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // SQLite is single-writer; run test files serially to avoid lock contention.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./prisma/test.db",
      JWT_ACCESS_SECRET: "test-access-secret-test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret-test-refresh-secret",
      STORAGE_LOCAL_DIR: "./uploads-test",
    },
    include: ["tests/**/*.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 20_000,
  },
});
