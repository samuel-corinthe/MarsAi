import cron from "node-cron";
import { cleanTempFiles } from "./cleanTempFiles.js";
import { checkYoutubeStatus } from "./checkYoutubeStatus.js";
import { resetRateLimits } from "./resetRateLimits.js";
import { cleanAltchaPayloads } from "./cleanAltchaPayloads.js";

let started = false;

function schedule(expression, label, task) {
  const timezone = String(process.env.CRON_TIMEZONE || "").trim();
  const options = timezone ? { timezone } : undefined;

  cron.schedule(
    expression,
    async () => {
      try {
        console.log(`[CRON] start ${label}`);
        await task();
      } catch (error) {
        console.error(`[CRON] ${label} failed:`, error.message);
      }
    },
    options,
  );
}

export function startCrons() {
  if (started) {
    console.log("[CRON] already started, skipping duplicate initialization");
    return;
  }

  // Every 6 hours: delete stale temp files from uploads root.
  schedule("0 */6 * * *", "cleanTempFiles", cleanTempFiles);

  // Daily at 22:00: verify YouTube upload statuses and mark invalid entries.
  schedule("0 22 * * *", "checkYoutubeStatus", checkYoutubeStatus);

  // Daily at 00:00: reset in-memory rate-limit counters.
  schedule("0 0 * * *", "resetRateLimits", resetRateLimits);

  // Every hour: purge expired ALTCHA anti-replay payload hashes.
  schedule("0 * * * *", "cleanAltchaPayloads", cleanAltchaPayloads);

  started = true;
  console.log("[CRON] jobs initialized");
}
