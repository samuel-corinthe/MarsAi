import express from "express";
import { exportMoviesCSV } from "../controllers/exportCSVController.js";

const router = express.Router();

router.get("/movies", exportMoviesCSV);

export default router;
