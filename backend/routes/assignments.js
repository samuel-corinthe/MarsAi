import express from "express";
import {
  autoAssign,
  rebalance,
  claim,
  release,
  status,
  patchCapacity,
  my,
  workload,
} from "../controllers/assignmentController.js";

const router = express.Router();

router.post("/auto-assign", autoAssign);
router.post("/rebalance", rebalance);
router.post("/claim", claim);
router.post("/release", release);
router.post("/status", status);
router.patch("/capacity/:adminId", patchCapacity);
router.get("/my", my);
router.get("/workload", workload);

export default router;
