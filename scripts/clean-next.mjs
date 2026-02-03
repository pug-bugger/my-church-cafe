import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const nextDir = join(process.cwd(), ".next");

if (existsSync(nextDir)) {
  await rm(nextDir, { recursive: true, force: true });
  // eslint-disable-next-line no-console
  console.log("Removed .next/");
} else {
  // eslint-disable-next-line no-console
  console.log(".next/ does not exist (nothing to clean)");
}
