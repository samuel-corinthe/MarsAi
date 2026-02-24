import express from "express";
import cors from "cors";
import "./env.js";
import multer from "multer";
import { fileURLToPath } from "node:url";
import publicRoutes from "./routes/public.js";
import uploadRoutes from "./routes/upload.js";
import altchaRoutes from "./routes/altcha.js";
import dashboardRoutes from "./routes/dashboard.js";
import assignmentRoutes from "./routes/assignments.js";
import ratingRoutes from "./routes/ratings.js";
import authRoutes from "./routes/auth.js";
import movieRoutes from "./routes/movie.js";
import sitePhaseRoutes from "./routes/sitePhase.js";
import { requireAuth, requireRole } from "./middlewares/authMiddleware.js";

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

function isOriginAllowed(origin = "") {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  if (!isProduction) {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost) return true;
  }

  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isOriginAllowed(origin || ""));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

const verifyOrigin = (req, res, next) => {
  const origin = req.get("Origin") || req.get("Referer") || "";
  const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed))
    || isOriginAllowed(origin);

  if (!isAllowed) {
    return res.status(403).json({ error: "Origine non autorisee" });
  }

  return next();
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use("/MarsAi/uploads", express.static("uploads"));

app.use(publicRoutes);
app.use("/api", publicRoutes);
app.use("/api/mail", publicRoutes);
app.use("/MarsAi", publicRoutes);
app.use("/MarsAi/api", publicRoutes);
app.use("/MarsAi/api/mail", publicRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/movie", movieRoutes);
app.use("/api/altcha", altchaRoutes);
app.use("/api/upload", verifyOrigin, uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/MarsAi/api/movies", movieRoutes);
app.use("/MarsAi/api/movie", movieRoutes);
app.use("/MarsAi/api/altcha", altchaRoutes);
app.use("/MarsAi/api/upload", verifyOrigin, uploadRoutes);
app.use("/MarsAi/api/auth", authRoutes);
app.use("/api/dashboard", requireAuth, requireRole(["admin", "superadmin"]), dashboardRoutes);
app.use("/api/assignments", requireAuth, requireRole(["admin", "superadmin"]), assignmentRoutes);
app.use("/api/ratings", requireAuth, requireRole(["admin", "superadmin"]), ratingRoutes);
app.use("/api/site-phase", sitePhaseRoutes);
app.use("/MarsAi/api/site-phase", sitePhaseRoutes);

app.get("/", (req, res) => {
  res.send("Serveur MarsAI operationnel");
});

app.use((err, req, res, next) => {
  console.error("[SERVEUR] Erreur:", err.message);

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "JSON invalide dans la requete.",
      details: err.message,
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Le fichier est trop volumineux : max 300Mo" });
    }
    return res.status(400).json({ error: `Erreur d'upload : ${err.message}` });
  }

  if (err.message && err.message.startsWith("Type non autorise")) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({
    error: "Erreur interne du serveur",
    details: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

export default app;

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Serveur demarre sur http://localhost:${PORT}`);
  });
}
