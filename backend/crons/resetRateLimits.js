import { ipLimiter, emailLimiter } from "../routes/upload.js";
import { challengeLimiter } from "../routes/altcha.js";

function resetLimiter(limiter, name) {
  if (!limiter || typeof limiter.resetAll !== "function") {
    console.warn(`[CRON][rate-limit] ${name} does not support resetAll()`);
    return false;
  }

  limiter.resetAll();
  return true;
}

export function resetRateLimits() {
  const ipReset = resetLimiter(ipLimiter, "ipLimiter");
  const emailReset = resetLimiter(emailLimiter, "emailLimiter");
  const challengeReset = resetLimiter(challengeLimiter, "challengeLimiter");

  console.log(
    `[CRON][rate-limit] reset done (ip=${ipReset}, email=${emailReset}, challenge=${challengeReset})`,
  );
}
