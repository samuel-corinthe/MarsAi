require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { validate } = require("deep-email-validator");
const nodemailer = require("nodemailer");
const SibApiV3Sdk = require("@getbrevo/brevo");

// 1. Configuration de l'API Contacts (Vérifie bien ta clé dans le .env)
let apiInstance = new SibApiV3Sdk.ContactsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

const app = express();

app.use(cors({ origin: "http://localhost:5173", methods: ["POST"] }));
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

app.post("/subscribe-newsletter", async (req, res) => {
  const { firstName, email, preferences } = req.body;

  try {
    // 2. Validation
    const validateResult = await validate({
      email: email,
      validateSMTP: false,
      validateTypo: false,
    });

    if (!validateResult.valid) {
      return res
        .status(400)
        .json({ status: "error", message: "Email invalide." });
    }

    // --- AJOUT À LA LISTE DE CONTACTS BREVO ---
    try {
      let contact = new SibApiV3Sdk.CreateContact();
      contact.email = email;
      contact.attributes = {
        PRENOM: firstName,
        PREFERENCES: preferences.join(", "),
      };
      contact.listIds = [3]; // l'ID de ta liste sur Brevo
      contact.updateEnabled = true;

      await apiInstance.createContact(contact);
      console.log(`Contact ${email} ajouté à la liste Brevo.`);
    } catch (apiError) {
      // On log l'erreur mais on ne bloque pas l'envoi du mail de confirmation
      console.error(
        "Erreur ajout contact Brevo:",
        apiError.response ? apiError.response.body : apiError,
      );
    }
    // ------------------------------------------

    // 3. Préparation et Envoi de l'email (HTML corrigé avec ton design IA)
    const mailOptions = {
      from: '"marsAI Festival" <namasse.medamine@gmail.com>',
      to: email,
      subject: `Bienvenue à bord, ${firstName} ! 🚀`,
      html: `<h1>Bienvenue ${firstName} !</h1>
             <p>Merci de rejoindre la communauté <strong>marsAI</strong>.</p>
             <p>Tes préférences : ${preferences.join(", ")}</p>`,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .json({ status: "success", message: "Inscription réussie !" });
  } catch (error) {
    console.error("Erreur générale:", error);
    res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

module.exports = app;
