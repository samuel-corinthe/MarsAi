import jwt from "jsonwebtoken";
import crypto from "crypto";
import { generateChallenge } from "../utils/AltchaValidator.js";

function generateRandomFieldName() {
  return `field_${crypto.randomBytes(6).toString("hex")}`;
}

export async function getAltchaChallenge(req, res) {
  try {
    console.log("[ALTCHA] Nouveau challenge demande");

    const challenge = await generateChallenge();

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET manquant dans .env");
    }

    const honeypotFieldName = generateRandomFieldName();
    const honeypotToken = jwt.sign(
      {
        fieldName: honeypotFieldName,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" },
    );

    return res.status(200).json({
      ...challenge,
      honeypot: {
        token: honeypotToken,
        fieldName: honeypotFieldName,
      },
    });
  } catch (error) {
    console.error("[ALTCHA] Erreur:", error.message);
    return res.status(500).json({
      error: "Erreur lors de la generation du challenge CAPTCHA",
    });
  }
}
