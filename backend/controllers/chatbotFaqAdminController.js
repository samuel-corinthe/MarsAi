import {
  createAdminChatbotFaq,
  deleteAdminChatbotFaq,
  listAdminChatbotFaqs,
  updateAdminChatbotFaq,
} from "../services/chatbotFaqAdminService.js";

function sendServiceError({ res, error, logLabel, defaultError }) {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(logLabel, error.message);
  return res.status(500).json({
    error: defaultError,
    details: error.message,
  });
}

export async function getAdminChatbotFaqs(_req, res) {
  try {
    const payload = await listAdminChatbotFaqs();
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[CHATBOT_FAQ_ADMIN] get error:",
      defaultError: "Impossible de lire les FAQ admin.",
    });
  }
}

export async function postAdminChatbotFaq(req, res) {
  try {
    const payload = await createAdminChatbotFaq({
      payload: req.body || {},
    });
    return res.status(201).json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[CHATBOT_FAQ_ADMIN] create error:",
      defaultError: "Impossible de creer la FAQ admin.",
    });
  }
}

export async function patchAdminChatbotFaq(req, res) {
  try {
    const payload = await updateAdminChatbotFaq({
      faqKey: req.params?.faqKey,
      payload: req.body || {},
    });
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[CHATBOT_FAQ_ADMIN] patch error:",
      defaultError: "Impossible de mettre a jour la FAQ admin.",
    });
  }
}

export async function deleteAdminChatbotFaqEntry(req, res) {
  try {
    const payload = await deleteAdminChatbotFaq({
      faqKey: req.params?.faqKey,
    });
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[CHATBOT_FAQ_ADMIN] delete error:",
      defaultError: "Impossible de supprimer la FAQ admin.",
    });
  }
}
