require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { validate } = require("deep-email-validator");
const nodemailer = require("nodemailer");
const SibApiV3Sdk = require("@getbrevo/brevo");

const app = express();

app.use(cors({ origin: "http://localhost:5173", methods: ["POST"] }));
app.use(express.json());

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
      .json({ status: "error", message: "Tous les champs sont requis !" });
  }

  try {
    const validateResult = await validate({
      email: email,
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

    res.status(200).json({
      status: "success",
      message: "Message envoye avec succes via Brevo !",
    });
  } catch (error) {
    console.error("DETAILS DE L'ERREUR SMTP :");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    if (error.response) console.error("Reponse du serveur:", error.response);

    res.status(500).json({
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
      email: email,
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
      let contact = new SibApiV3Sdk.CreateContact();
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

    res
      .status(200)
      .json({ status: "success", message: "Inscription reussie !" });
  } catch (error) {
    console.error("Erreur generale:", error);
    res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
  console.log("Pret a envoyer des emails via Brevo.");
});

module.exports = app;
