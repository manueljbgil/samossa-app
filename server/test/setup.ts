import { rmSync } from "node:fs";
import path from "node:path";
import { afterAll } from "vitest";

const testDbPath = path.resolve(process.cwd(), "data.test.db");

process.env.DATABASE_FILE = testDbPath;
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ?? "test-google-client-id";

rmSync(testDbPath, { force: true });

afterAll(() => {
  rmSync(testDbPath, { force: true });
});
