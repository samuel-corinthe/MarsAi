const Newsletter = require("../models/Newsletter");

exports.subscribe = async (req, res) => {
  const { firstName, email, preferences } = req.body;

  if (!firstName || !email) {
    return res
      .status(400)
      .json({ status: "error", message: "Prénom et email requis." });
  }

  try {
    // 1. Validation
    const validateResult = await Newsletter.validateEmail(email);
    if (!validateResult.valid) {
      return res
        .status(400)
        .json({ status: "error", message: "Email invalide." });
    }

    // 2. Brevo
    try {
      await Newsletter.addToBrevo(firstName, email, preferences);
    } catch (apiError) {
      console.error(
        "Erreur Brevo:",
        apiError.response ? apiError.response.body : apiError,
      );
      // On continue quand même pour envoyer le mail de bienvenue
    }

    // 3. Email de bienvenue
    await Newsletter.sendWelcomeEmail(firstName, email, preferences);

    return res
      .status(200)
      .json({ status: "success", message: "Inscription réussie !" });
  } catch (error) {
    console.error("Erreur Newsletter:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
};
