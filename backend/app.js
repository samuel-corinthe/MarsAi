import express from "express";
import cors from "cors";
import "dotenv/config";
import multer from "multer";
import dns from "node:dns/promises";
import { createRequire } from "node:module";
import validator from "validator";
import uploadRoutes from "./routes/upload.js";
import altchaRoutes from "./routes/altcha.js";
import moviesRoutes from "./routes/movies.js";

const require = createRequire(import.meta.url);
const disposableDomains = require("disposable-email-domains");
const nodemailer = require("nodemailer");
const SibApiV3Sdk = require("@getbrevo/brevo");

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

const verifyOrigin = (req, res, next) => {
  const origin = req.get("Origin") || req.get("Referer") || "";
  const isAllowed = allowedOrigins.some((allowed) =>
    origin.startsWith(allowed),
  );

  if (!isAllowed) {
    return res.status(403).json({ error: "Origine non autorisee" });
  }

  return next();
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const disposableSet = new Set(disposableDomains);

async function validateEmail(email) {
  if (!validator.isEmail(email)) {
    return { valid: false, reason: "regex" };
  }

  const domain = email.split("@")[1];

  if (disposableSet.has(domain)) {
    return { valid: false, reason: "disposable" };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: "mx" };
    }
  } catch {
    return { valid: false, reason: "mx" };
  }

  return { valid: true };
}

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
  tls: {
    rejectUnauthorized: false,
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
    const validateResult = await validateEmail(email);

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
    const validateResult = await validateEmail(email);

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

app.use("/uploads/posters", express.static("uploads/posters"));

app.use("/api/altcha", altchaRoutes);
app.use("/api/upload", verifyOrigin, uploadRoutes);
app.use("/api/movies", moviesRoutes);

app.get("/", (req, res) => {
  res.send("Serveur MarsAI operationnel");
});

app.use((err, req, res, next) => {
  console.error("[SERVEUR] Erreur:", err.message);

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

  return res.status(500).json({ error: "Erreur interne du serveur" });
});

export default app;
