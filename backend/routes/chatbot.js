import express from "express";
import {
  askChatbot,
  getChatbotCatalog,
} from "../controllers/chatbotController.js";
import {
  deleteAdminChatbotFaqEntry,
  getAdminChatbotFaqs,
  patchAdminChatbotFaq,
  postAdminChatbotFaq,
} from "../controllers/chatbotFaqAdminController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();
const adminGuard = [requireAuth, requireRole(["admin", "superadmin"])];

router.post("/ask", askChatbot);
router.get("/faqs", getChatbotCatalog);
router.get("/admin/faqs", ...adminGuard, getAdminChatbotFaqs);
router.post("/admin/faqs", ...adminGuard, postAdminChatbotFaq);
router.patch("/admin/faqs/:faqKey", ...adminGuard, patchAdminChatbotFaq);
router.delete("/admin/faqs/:faqKey", ...adminGuard, deleteAdminChatbotFaqEntry);

export default router;
