import express from "express";
import cors from "cors";
import "./env.js";
import multer from "multer";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import uploadRoutes from "./routes/upload.js";
import altchaRoutes from "./routes/altcha.js";
import dashboardRoutes from "./routes/dashboard.js";
import authRoutes, { requireAuth, requireRole } from "./routes/auth.js";

const require = createRequire(import.meta.url);
const { validate } = require("deep-email-validator");
const nodemailer = require("nodemailer");
const SibApiV3Sdk = require("@getbrevo/brevo");

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

function isOriginAllowed(origin = "") {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  if (!isProduction) {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost) return true;
  }

  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isOriginAllowed(origin || ""));
    },
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

const verifyOrigin = (req, res, next) => {
  const origin = req.get("Origin") || req.get("Referer") || "";
  const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed))
    || isOriginAllowed(origin);

  if (!isAllowed) {
    return res.status(403).json({ error: "Origine non autorisee" });
  }

  return next();
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Brevo Contacts API (newsletter)
const apiInstance = new SibApiV3Sdk.ContactsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

// Nodemailer configuration (Brevo SMTP)
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Contact form (page contact)
app.post("/send-email", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ status: "error", message: "Tous les champs sont requis." });
  }

  try {
    const validateResult = await validate({
      email,
      validateRegex: true,
      validateMX: true,
      validateTypo: false,
      validateDisposable: true,
      validateSMTP: false,
    });

    if (!validateResult.valid) {
      return res.status(400).json({
        status: "error",
        message: "L'adresse email saisie est invalide.",
        reason: validateResult.reason,
      });
    }

    const mailOptions = {
      from: `"${name}" <namasse.medamine@gmail.com>`,
      replyTo: email,
      to: "namasse.medamine@gmail.com",
      subject: `${subject} `,
      text: `Nouveau message recu de : ${name} (${email})\n\nMessage :\n${message}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      status: "success",
      message: "Message envoye avec succes via Brevo.",
    });
  } catch (error) {
    console.error("DETAILS DE L'ERREUR SMTP :");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    if (error.response) console.error("Reponse du serveur:", error.response);

    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Newsletter
app.post("/subscribe-newsletter", async (req, res) => {
  const { firstName, email, preferences } = req.body;
  const safePreferences = Array.isArray(preferences) ? preferences : [];

  if (!firstName || !email) {
    return res
      .status(400)
      .json({ status: "error", message: "Prenom et email requis." });
  }

  try {
    const validateResult = await validate({
      email,
      validateRegex: true,
      validateMX: true,
      validateTypo: false,
      validateDisposable: true,
      validateSMTP: false,
    });

    if (!validateResult.valid) {
      return res
        .status(400)
        .json({ status: "error", message: "Email invalide." });
    }

    try {
      const contact = new SibApiV3Sdk.CreateContact();
      contact.email = email;
      contact.attributes = {
        PRENOM: firstName,
        PREFERENCES: safePreferences.join(", "),
      };
      contact.listIds = [3];
      contact.updateEnabled = true;

      await apiInstance.createContact(contact);
      console.log(`Contact ${email} ajoute a la liste Brevo.`);
    } catch (apiError) {
      console.error(
        "Erreur ajout contact Brevo:",
        apiError.response ? apiError.response.body : apiError,
      );
    }

    const mailOptions = {
      from: '"marsAI Festival" <namasse.medamine@gmail.com>',
      to: email,
      subject: `Bienvenue a bord, ${firstName} !`,
      html: `<h1>Bienvenue ${firstName} !</h1>
             <p>Merci de rejoindre la communaute <strong>marsAI</strong>.</p>
             <p>Tes preferences : ${safePreferences.join(", ")}</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({ status: "success", message: "Inscription reussie !" });
  } catch (error) {
    console.error("Erreur generale:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
});

app.use("/api/altcha", altchaRoutes);
app.use("/api/upload", verifyOrigin, uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", requireAuth, requireRole(["admin", "superadmin"]), dashboardRoutes);

app.get("/", (req, res) => {
  res.send("Serveur MarsAI operationnel");
});

app.use((err, req, res, next) => {
  console.error("[SERVEUR] Erreur:", err.message);

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "JSON invalide dans la requete.",
      details: err.message,
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Le fichier est trop volumineux : max 300Mo" });
    }
    return res.status(400).json({ error: `Erreur d'upload : ${err.message}` });
  }

  if (err.message && err.message.startsWith("Type non autorise")) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({
    error: "Erreur interne du serveur",
    details: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

export default app;

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Serveur demarre sur http://localhost:${PORT}`);
  });
}
