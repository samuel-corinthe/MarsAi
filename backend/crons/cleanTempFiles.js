import fs from "node:fs";
import path from "node:path";

const UPLOADS_DIR = path.resolve("uploads");
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export function cleanTempFiles() {
  if (!fs.existsSync(UPLOADS_DIR)) return 0;

  const nowTs = Date.now();
  const entries = fs.readdirSync(UPLOADS_DIR);
  let cleaned = 0;

  for (const entry of entries) {
    const entryPath = path.join(UPLOADS_DIR, entry);
    let stats;
    try {
      stats = fs.statSync(entryPath);
    } catch (error) {
      console.warn(`[CRON][temp-clean] unable to stat "${entry}": ${error.message}`);
      continue;
    }

    // Keep nested directories such as uploads/videos untouched.
    if (!stats.isFile()) continue;

    const ageMs = nowTs - stats.mtimeMs;
    if (ageMs <= MAX_AGE_MS) continue;

    try {
      fs.unlinkSync(entryPath);
      cleaned += 1;
      console.log(`[CRON][temp-clean] deleted "${entry}"`);
    } catch (error) {
      console.warn(`[CRON][temp-clean] unable to delete "${entry}": ${error.message}`);
    }
  }

  console.log(`[CRON][temp-clean] done, deleted=${cleaned}`);
  return cleaned;
}
