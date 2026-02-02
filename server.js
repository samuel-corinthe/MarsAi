// Minimal API server: validate video then upload to YouTube (no DB, no local keep)
// Rules: mp4 only, size <= 300MB, duration 40-120s, ratio ~16:9

const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const multer = require("multer");
const { execFile } = require("child_process");
const { google } = require("googleapis");
const ffprobePath = require("ffprobe-static").path;

const PORT = process.env.PORT || 4000;
const MAX_BYTES = 300 * 1024 * 1024;
const MIN_DURATION = 40;
const MAX_DURATION = 120;
const TARGET_RATIO = 16 / 9;
const RATIO_TOL = 0.02;
const TOKEN_PATH = path.resolve("token-node.json");
const CREDENTIALS_PATH = path.resolve("client_secret.json");

// Multer in global middleware (parse any files, no mimetype filter)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

function loadOAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) throw new Error("client_secret.json manquant");
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const cfg = creds.installed || creds.web;
  if (!cfg) throw new Error("client_secret.json doit contenir installed ou web");
  const redirect = (cfg.redirect_uris || []).find((u) => u.startsWith("http://localhost")) || "http://localhost:5173";
  const oauth2 = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, redirect);
  if (!fs.existsSync(TOKEN_PATH)) throw new Error("token-node.json manquant (lance upload_node.js une fois)");
  oauth2.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8")));
  return oauth2;
}

function probe(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        filePath,
      ],
      (err, stdout) => {
        if (err) return reject(err);
        try {
          const info = JSON.parse(stdout);
          const stream = info.streams && info.streams[0];
          const duration = info.format ? Number(info.format.duration) : NaN;
          resolve({ width: stream?.width, height: stream?.height, duration });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

function validateMeta(filePath, meta) {
  const errs = [];
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".mp4") errs.push("format");
  const { width, height, duration } = meta;
  if (!width || !height) errs.push("resolution");
  else {
    const ratio = width / height;
    if (Math.abs(ratio - TARGET_RATIO) > TARGET_RATIO * RATIO_TOL) errs.push("ratio");
  }
  if (!duration || Number.isNaN(duration)) errs.push("duration");
  else if (duration < MIN_DURATION || duration > MAX_DURATION) errs.push("duration_range");
  return errs;
}

async function uploadToYoutube(oauth2, filePath, body) {
  const youtube = google.youtube({ version: "v3", auth: oauth2 });
  const res = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: {
        title: body.title || "Sans titre",
        description: body.synopsis || "",
        tags: body.tags || [],
        categoryId: body.category_id || "22",
      },
      status: { privacyStatus: body.privacy || "private" },
    },
    media: { body: fs.createReadStream(filePath) },
  });
  return res.data.id;
}

const app = express();

// CORS + CSP permissifs (dev)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; img-src * data: blob:; media-src * data: blob:;"
  );
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Logs
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ct=${req.headers["content-type"] || ""}`);
  next();
});

// Multer parsing globally
app.use(upload.any());

app.get("/api", (_req, res) => res.json({ ok: true }));
app.get("/api/Upload", (_req, res) => res.json({ ok: true }));
app.get("/favicon.ico", (_req, res) => res.status(204).end());

async function handleUpload(req, res) {
  const file =
    (req.files?.find((f) => f.fieldname === "video")) ||
    (req.files?.find((f) => f.fieldname === "file")) ||
    (Array.isArray(req.files) && req.files[0]);

  console.log(
    "files reçus:",
    Array.isArray(req.files) ? req.files.map((f) => `${f.fieldname}:${f.originalname} ${f.mimetype} ${f.size}o`) : "none"
  );

  if (!file) {
    return res.status(400).json({
      error: "Fichier manquant (champ attendu: video/file)",
      receivedFields: Object.keys(req.body || {}),
    });
  }

  let tmpPath;
  try {
    tmpPath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
    fs.writeFileSync(tmpPath, file.buffer);

    const meta = await probe(tmpPath);
    const metaErrors = validateMeta(tmpPath, meta);
    if (metaErrors.length) {
      fs.unlink(tmpPath, () => {});
      return res.status(400).json({ error: "Video invalide", details: metaErrors });
    }

    const oauth2 = loadOAuthClient();
    const youtubeId = await uploadToYoutube(oauth2, tmpPath, req.body || {});

    fs.unlink(tmpPath, () => {});
    res.json({ ok: true, youtube_id: youtubeId });
  } catch (err) {
    console.error(err);
    if (tmpPath) fs.unlink(tmpPath, () => {});
    if (err.message === "FORMAT_NOT_ALLOWED")
      return res.status(400).json({ error: "Format refuse, mp4 uniquement" });
    if (err.message.includes("token-node")) return res.status(401).json({ error: err.message });
    res.status(500).json({ error: "Upload failed", detail: err.message });
  }
}

app.post("/api/upload", handleUpload);
app.post("/api/Upload", handleUpload);

app.use((err, req, res, _next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Fichier trop gros (>300Mo)" });
  if (err && err.message === "FORMAT_NOT_ALLOWED") return res.status(400).json({ error: "Format refuse, mp4 uniquement" });
  console.error(err);
  res.status(500).json({ error: "Upload failed", detail: err.message });
});

app.listen(PORT, () => console.log(`API upload dispo sur http://localhost:${PORT}/api/upload`));
