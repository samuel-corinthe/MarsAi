// upload_node.js
// Petit script node pour uploader une video YouTube, mode simple (avec qq fautes volontaire)
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const http = require("http");
const { execFile } = require("child_process");
const ffprobePath = require("ffprobe-static").path;

// Scopes: upload + gestion playlists
const SCOPES = [
  "https://www.googleapis.com/auth/youtube",
];
const TOKEN_PATH = "token-node.json";
const CREDENTIALS_PATH = "client_secret.json";

function hasScopes(tokenScope, requiredScopes) {
  if (!tokenScope) return false;
  const scopes = Array.isArray(tokenScope) ? tokenScope : String(tokenScope).split(/\s+/);
  return requiredScopes.every((scope) => scopes.includes(scope));
}

// Gere le login Google et garde le token pour eviter de recliquer a chaque fois
async function authorize() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const cfg = creds.installed || creds.web;
  if (!cfg) {
    throw new Error("client_secret.json doit contenir une section 'installed' ou 'web'.");
  }

  const redirectUri =
    (cfg.redirect_uris && cfg.redirect_uris.find((u) => u.startsWith("http://localhost"))) ||
    "http://localhost:5173";

  const oauth2 = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, redirectUri);

  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    if (hasScopes(tokens.scope, SCOPES)) {
      oauth2.setCredentials(tokens);
      return oauth2;
    }
    console.warn("Token missing required scopes, re-auth needed.");
  }

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    response_type: "code",
    include_granted_scopes: true,
    redirect_uri: redirectUri,
  });

  console.log("Ouvre ce lien pour autoriser (copie/colle si besoin) :");
  console.log(authUrl);
  try {
    fs.writeFileSync("oauth-url.txt", authUrl);
  } catch (_) {
    // ignore
  }
  const code = await waitForAuthCode(authUrl, redirectUri);
  const { tokens } = await oauth2.getToken(code.trim());
  oauth2.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return oauth2;
}

// Attend le callback localhost, recup le code automatiquement (pas de copier/coller)
async function waitForAuthCode(authUrl, redirectUri) {
  return new Promise(async (resolve, reject) => {
    const redirect = new URL(redirectUri);
    const server = http.createServer((req, res) => {
      const qs = new URL(req.url, redirectUri).searchParams;
      const error = qs.get("error");
      const code = qs.get("code");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Erreur d'autorisation: " + error);
        server.close();
        return reject(new Error("OAuth error: " + error));
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Paramètre 'code' manquant.");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Autorisation reçue. Vous pouvez fermer cet onglet.");
      server.close();
      return resolve(code);
    });

    server.listen(redirect.port || 80, redirect.hostname, async () => {
      // `open` est un module ESM; on le charge dynamiquement pour rester en CommonJS.
      try {
        const open = (await import("open")).default;
        await open(authUrl);
      } catch (err) {
        console.warn("Impossible d'ouvrir automatiquement le navigateur, ouvre le lien manuellement.");
      }
      console.log(`En attente du callback sur ${redirect.href}`);
    });

    // Sécurité : time-out au bout de 5 minutes.
    setTimeout(() => {
      server.close();
      reject(new Error("Temps dépassé pour l'autorisation (5 min). Relance le script."));
    }, 5 * 60 * 1000);
  });
}

// Envoie le fichier et affiche un pourcent maison
async function upload(auth, filePath, title, desc, tags, categoryId, privacy) {
  await checkVideoRules(filePath); // on verifie vite fait avant d'envoyer
  const youtube = google.youtube({ version: "v3", auth });
  const res = await youtube.videos.insert(
    {
      part: "snippet,status",
      requestBody: {
        snippet: { title, description: desc, tags, categoryId },
        status: { privacyStatus: privacy },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    },
    {
      onUploadProgress: (evt) => {
        const pct = ((evt.bytesRead / fs.statSync(filePath).size) * 100).toFixed(1);
        process.stdout.write(`\rUpload ${pct}%`);
      },
    }
  );
  console.log(`\nTerminé. ID vidéo: ${res.data.id}`);
}

// Vérifs basiques: <=3 Mo, mp4 only, ratio 16:9, durée entre 40s et 2min
async function checkVideoRules(filePath) {
  const stat = fs.statSync(filePath);
  const max = 300 * 1024 * 1024; // 300 Mo
  if (stat.size > max) {
    throw new Error(
      `Fichier trop gros (>300Mo). Taille detectee: ${(stat.size / 1024 / 1024).toFixed(
        2
      )} Mo. Réduis la taille avant upload.`
    );
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".mp4") {
    throw new Error("Format refusé. On veut seulement du .mp4");
  }

  const { width, height, duration } = await probeVideo(filePath);
  if (!width || !height) {
    throw new Error("Impossible de lire la taille vidéo (ffprobe).");
  }
  const ratio = width / height;
  const target = 16 / 9;
  const tolerance = 0.02; // +/-2%
  if (Math.abs(ratio - target) > target * tolerance) {
    throw new Error(`Ratio non 16:9 (trouvé ${width}x${height}). Exporte en 16:9 avant.`);
  }

  if (!duration || Number.isNaN(duration)) {
    throw new Error("Impossible de lire la durée vidéo.");
  }
  if (duration < 40 || duration > 120) {
    throw new Error(
      `Durée refusée (${duration.toFixed(1)}s). On veut entre 40s et 120s. Coupe ou rallonge.`
    );
  }
}

function probeVideo(filePath) {
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

// Point d'entree: on demande le fichier en argument obligatoire puis on lance l'upload
(async () => {
  const cliPath = process.argv[2];
  if (!cliPath) {
    throw new Error("Donne le nom du fichier à uploader : node upload_node.js monfichier.mp4");
  }
  const filePath = path.resolve(cliPath);
  if (!fs.existsSync(filePath)) throw new Error(`Fichier vidéo introuvable: ${filePath}`);
  console.log(`Fichier choisi: ${filePath}`);
  const auth = await authorize();
  await upload(
    auth,
    filePath,
    "Titre de test Node",
    "Description via Node",
    ["test", "api", "node"],
    "22",
    "private"
  );
})();
