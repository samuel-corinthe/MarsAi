import { createChallenge, verifySolution } from "altcha-lib";
import crypto from "crypto";

const ALTCHA_SECRET = process.env.ALTCHA_SECRET || crypto.randomBytes(32).toString("hex");
const PAYLOAD_TTL_MS = 24 * 60 * 60 * 1000;

// In-memory anti-replay store (hash(payload) -> first-seen timestamp).
const usedPayloads = new Map();

const CHALLENGE_OPTIONS = {
  algorithm: "SHA-256",
  maxNumber: 1_000_000,
  saltLength: 16,
  hmacKey: ALTCHA_SECRET,
};

export function cleanExpiredPayloads(nowTs = Date.now()) {
  let removed = 0;

  for (const [payloadHash, createdAt] of usedPayloads.entries()) {
    if (nowTs - createdAt > PAYLOAD_TTL_MS) {
      usedPayloads.delete(payloadHash);
      removed += 1;
    }
  }

  console.log(
    `[ALTCHA] anti-replay cleanup: removed=${removed}, remaining=${usedPayloads.size}`,
  );

  return removed;
}

export const generateChallenge = async () => {
  try {
    const challenge = await createChallenge(CHALLENGE_OPTIONS);

    console.log("[ALTCHA] challenge generated");

    return {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      maxnumber: challenge.maxnumber,
      salt: challenge.salt,
      signature: challenge.signature,
    };
  } catch (error) {
    console.error("[ALTCHA] challenge generation error:", error.message);
    throw new Error("Unable to generate captcha challenge");
  }
};

export const verifyAltchaSolution = async (payload) => {
  if (!payload) {
    console.log("[ALTCHA] missing payload");
    return false;
  }

  try {
    const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
    if (usedPayloads.has(payloadHash)) {
      console.log("[ALTCHA] replay detected for payload");
      return false;
    }

    const decodedPayload = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    const isValid = await verifySolution(decodedPayload, ALTCHA_SECRET);

    if (isValid) {
      usedPayloads.set(payloadHash, Date.now());
      console.log("[ALTCHA] captcha valid");
      return true;
    }

    console.log("[ALTCHA] captcha invalid");
    return false;
  } catch (error) {
    console.error("[ALTCHA] validation error:", error.message);
    return false;
  }
};

export const validateAltchaMiddleware = async (req, res, next) => {
  const altchaPayload = req.body?.altcha;

  if (!altchaPayload) {
    return res.status(400).json({
      error: "Validation CAPTCHA requise. Veuillez rafraichir la page.",
    });
  }

  const isValid = await verifyAltchaSolution(altchaPayload);
  if (!isValid) {
    return res.status(400).json({
      error: "Validation CAPTCHA echouee. Veuillez reessayer.",
    });
  }

  return next();
};
