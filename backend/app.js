require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { validate } = require("deep-email-validator");
const nodemailer = require("nodemailer");

const app = express();

// --- Middlewares ---
app.use(
  cors({
    origin: "http://localhost:5173", // Port de ton Front React (Vite)
    methods: ["POST"],
  }),
);
app.use(express.json());

// --- Configuration de Nodemailer pour BREVO ---
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// --- Route d'envoi d'email ---
app.post("/send-email", async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Vérification des champs vides
  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ status: "error", message: "Tous les champs sont requis !" });
  }

  try {
    // 1. Validation de l'email (Format, fautes de frappe et jetable)
    // On laisse validateSMTP à false car Brevo gère déjà la délivrabilité
    const validateResult = await validate({
      email: email,
      validateSMTP: false,
    });

    if (!validateResult.valid) {
      return res.status(400).json({
        status: "error",
        message: "L'adresse email saisie est invalide.",
        reason: validateResult.reason,
      });
    }

    // 2. Préparation de l'email
    const mailOptions = {
      from: `"${name}" <namasse.medamine@gmail.com>`,
      replyTo: email, // L'adresse du client pour pouvoir lui répondre
      to: "namasse.medamine@gmail.com",
      subject: `[Contact Form] ${subject} - de ${name}`,
      text: `Nouveau message reçu de : ${name} (${email})\n\nMessage :\n${message}`,
    };

    // 3. Envoi via Brevo
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      status: "success",
      message: "Message envoyé avec succès via Brevo !",
    });
  } catch (error) {
    // Affiche l'erreur détaillée dans ton terminal (le texte en rouge)
    console.error("DÉTAILS DE L'ERREUR SMTP :");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    if (error.response) console.error("Réponse du serveur:", error.response);

    res.status(500).json({
      status: "error",
      message: error.message, // Renvoie le vrai message à Postman/React pour debugger
    });
  }
});

// --- Lancement du serveur ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log("Prêt à envoyer des emails via Brevo.");
});

module.exports = app;
