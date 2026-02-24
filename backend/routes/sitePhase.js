import express from "express";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import {
  getPhase2Selection,
  getPhase3Selection,
  getPhase3Winners,
  getSitePhase,
  patchPhase2Selection,
  patchPhase3Selection,
  patchSitePhase,
  postValidatePhase2Selection,
  postValidatePhase3Selection,
} from "../controllers/sitePhaseController.js";

const router = express.Router();

router.get("/", getSitePhase);
router.get("/phase3-winners", getPhase3Winners);
router.get("/phase2-selection", requireAuth, requireRole(["admin", "superadmin"]), getPhase2Selection);
router.patch("/phase2-selection", requireAuth, requireRole(["admin", "superadmin"]), patchPhase2Selection);
router.post(
  "/phase2-selection/validate",
  requireAuth,
  requireRole(["superadmin"]),
  postValidatePhase2Selection,
);
router.get("/phase3-selection", requireAuth, requireRole(["admin", "superadmin"]), getPhase3Selection);
router.patch("/phase3-selection", requireAuth, requireRole(["admin", "superadmin"]), patchPhase3Selection);
router.post(
  "/phase3-selection/validate",
  requireAuth,
  requireRole(["superadmin"]),
  postValidatePhase3Selection,
);
router.patch("/", requireAuth, requireRole(["admin", "superadmin"]), patchSitePhase);

export default router;
