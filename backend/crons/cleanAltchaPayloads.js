import { cleanExpiredPayloads } from "../utils/AltchaValidator.js";

export function cleanAltchaPayloads() {
  const removed = cleanExpiredPayloads();
  console.log(`[CRON][altcha] cleanup done, removed=${removed}`);
}
