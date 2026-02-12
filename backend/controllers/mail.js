const emailService = require("../services/emailService");

exports.sendContactEmail = async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ status: "error", message: "Tous les champs sont requis !" });
  }

  try {
    const check = await emailService.validateEmail(email);
    if (!check.valid)
      return res
        .status(400)
        .json({ status: "error", message: "Email invalide." });

    await emailService.sendMail({
      from: `"${name}" <namasse.medamine@gmail.com>`,
      replyTo: email,
      to: "namasse.medamine@gmail.com",
      subject: subject,
      text: `Nouveau message de : ${name} (${email})\n\n${message}`,
    });

    res.status(200).json({ status: "success", message: "Message envoyé !" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.subscribeNewsletter = async (req, res) => {
  const { firstName, email, preferences } = req.body;
  const safePrefs = Array.isArray(preferences) ? preferences : [];

  if (!firstName || !email) {
    return res
      .status(400)
      .json({ status: "error", message: "Prénom et email requis." });
  }

  try {
    const check = await emailService.validateEmail(email);
    if (!check.valid)
      return res
        .status(400)
        .json({ status: "error", message: "Email invalide." });

    // Ajout Brevo
    try {
      await emailService.subscribeToBrevo(email, firstName, safePrefs);
    } catch (e) {
      console.error("Brevo API Error", e);
    }

    // Email de confirmation
    await emailService.sendMail({
      from: '"marsAI Festival" <namasse.medamine@gmail.com>',
      to: email,
      subject: `Bienvenue à bord, ${firstName} !`,
      html: `<h1>Bienvenue ${firstName} !</h1><p>Tes préférences : ${safePrefs.join(", ")}</p>`,
    });

    res
      .status(200)
      .json({ status: "success", message: "Inscription réussie !" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
};
