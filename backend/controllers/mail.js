const Mail = require("../models/Mail");

exports.sendContactEmail = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation simple
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    // Appel au modèle
    await Mail.sendContactEmail({ name, email, subject, message });

    res.status(200).json({ message: "Email envoyé avec succès !" });
  } catch (error) {
    console.error("Erreur MailController:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'email" });
  }
};
