require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { validate } = require("deep-email-validator");
const nodemailer = require("nodemailer");

const app = express();

// Middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["POST"],
  }),
);
app.use(express.json());

// Configuration de Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Ton adresse @laplateforme.io
    pass: process.env.MAIL_PASS, // TON MOT DE PASSE D'APPLICATION (16 caractères)
  },
});

// Route d'envoi d'email
app.post("/send-email", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ status: "error", message: "Tous les champs sont requis !" });
  }

  try {
    // 1. Validation de l'email (CORRECTION ICI)
    // On désactive validateSMTP pour éviter l'erreur de connexion serveur
    const validateResult = await validate({
      email: email,
      validateSMTP: false,
    });

    if (!validateResult.valid) {
      return res.status(400).json({
        status: "error",
        message: "L'adresse email est mal formée ou invalide.",
        reason: validateResult.reason,
      });
    }

    // 2. Préparation de l'email
    const mailOptions = {
      from: process.env.EMAIL_USER, // Il est préférable de mettre ton propre email ici pour éviter d'être bloqué par le spam
      replyTo: email, // L'adresse de l'utilisateur pour pouvoir lui répondre directement
      to: process.env.EMAIL_USER,
      subject: `Nouveau message de ${name} : ${subject}`,
      text: `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    };

    // 3. Envoi réel
    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .json({ status: "success", message: "Email envoyé avec succès !" });
  } catch (error) {
    console.error("Erreur d'envoi :", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Le serveur de mail a rencontré un problème.",
      });
  }
});

// N'oublie pas d'ajouter l'écoute du port si ce n'est pas fait ailleurs
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

module.exports = app;
