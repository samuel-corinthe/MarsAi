import {
  getChatbotFaqCatalog,
  getChatbotReply,
} from "../services/chatbotService.js";

export async function askChatbot(req, res) {
  const message = String(req.body?.message || "").trim();
  const language = String(req.body?.language || "fr").trim().toLowerCase().slice(0, 8) || "fr";

  if (!message) {
    return res.status(400).json({ error: "message requis." });
  }

  if (message.length > 800) {
    return res.status(400).json({ error: "message trop long (800 caracteres max)." });
  }

  try {
    const payload = await getChatbotReply({ message, language });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    console.error("[CHATBOT] ask error:", error.message);
    return res.status(500).json({
      error: "Impossible de traiter la question pour le moment.",
      details: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
}

export async function getChatbotCatalog(req, res) {
  const language = String(req.query?.language || "fr").trim().toLowerCase().slice(0, 8) || "fr";

  try {
    const payload = await getChatbotFaqCatalog({ language });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    console.error("[CHATBOT] catalog error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les questions du chatbot.",
      details: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
}
