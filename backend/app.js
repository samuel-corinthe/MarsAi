require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { validate } = require("deep-email-validator");
const nodemailer = require("nodemailer");

const app = express();

// --- Middlewares ---
app.use(
  cors({
    origin: "http://localhost:5173", // Port du Front React
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

// Route spécifique pour la Newsletter
app.post("/subscribe-newsletter", async (req, res) => {
  const { firstName, email, preferences } = req.body;

  try {
    // 1. Validation
    const validateResult = await validate({
      email: email,
      validateRegex: true, // Vérifie le format @
      validateMX: true, // Vérifie que le domaine existe
      validateTypo: false, // DESACTIVÉ : Empêche de bloquer laplateforme.io
      validateDisposable: true, // Bloque les emails jetables
      validateSMTP: false, // Désactivé car instable en local/cloud
    });

    if (!validateResult.valid) {
      return res.status(400).json({
        status: "error",
        message: "Email invalide ou mal orthographié.",
      });
    }

    // 2. Préparation de l'email de bienvenue (via Brevo)
    const mailOptions = {
      from: '"marsAI Festival" <namasse.medamine@gmail.com>',
      to: email, // L'abonné reçoit le mail
      subject: `Bienvenue à bord, ${firstName} ! 🚀`,
      text: `Merci de vous être inscrit à la newsletter.\nVos préférences : ${preferences.join(", ")}`,
      html: `<h1>Bienvenue ${firstName} !</h1>
             <p>Merci de rejoindre la communauté <strong>marsAI</strong>.</p>
             <p>Tu recevras bientôt nos news sur : ${preferences.join(", ")}</p>`,
    };

    // 3. Envoi via ton transporteur Brevo déjà configuré
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      status: "success",
      message: "Inscription réussie et mail envoyé !",
    });
  } catch (error) {
    console.error("Erreur Newsletter:", error);
    res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
});
// --- Lancement du serveur ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log("Prêt à envoyer des emails via Brevo.");
});

module.exports = app;
