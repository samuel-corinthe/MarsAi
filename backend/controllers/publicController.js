import {
  validateEmailAddress,
  sendContactMail,
  createOrUpdateBrevoContact,
  sendNewsletterWelcomeMail,
} from "../services/messagingService.js";

export async function sendEmail(req, res) {
  const { name, email, subject, message, lang } = req.body || {};
  // normalize language
  const normalizedLang = String(lang || "fr").split("-")[0];

  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ status: "error", message: "Tous les champs sont requis." });
  }

  try {
    const validateResult = await validateEmailAddress(email);

    if (!validateResult.valid) {
      return res.status(400).json({
        status: "error",
        message: "L'adresse email saisie est invalide.",
        reason: validateResult.reason,
      });
    }

    await sendContactMail({ name, email, subject, message, lang });

    return res.status(200).json({
      status: "success",
      message:
        normalizedLang === "ar"
          ? "تم إرسال الرسالة بنجاح."
          : "Message envoye avec succes via Brevo.",
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
}

export async function subscribeNewsletter(req, res) {
  const { firstName, email, preferences, lang } = req.body || {};
  const safePreferences = Array.isArray(preferences) ? preferences : [];
  const normalizedLang = String(lang || "fr").split("-")[0];

  if (!firstName || !email) {
    return res
      .status(400)
      .json({ status: "error", message: "Prenom et email requis." });
  }

  try {
    const validateResult = await validateEmailAddress(email);

    if (!validateResult.valid) {
      return res
        .status(400)
        .json({ status: "error", message: "Email invalide." });
    }

    try {
      await createOrUpdateBrevoContact({ firstName, email, safePreferences });
      console.log(`Contact ${email} ajoute a la liste Brevo.`);
    } catch (apiError) {
      console.error(
        "Erreur ajout contact Brevo:",
        apiError.response ? apiError.response.body : apiError,
      );
    }

    await sendNewsletterWelcomeMail({
      firstName,
      email,
      safePreferences,
      lang,
    });

    return res.status(200).json({
      status: "success",
      message:
        normalizedLang === "ar"
          ? "تم الاشتراك بنجاح !"
          : "Inscription reussie !",
    });
  } catch (error) {
    console.error("Erreur generale:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
}
