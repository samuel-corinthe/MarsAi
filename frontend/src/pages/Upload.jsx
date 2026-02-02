import { useEffect, useMemo, useRef, useState } from "react";

const MAX_BYTES = 300 * 1024 * 1024; // 300 Mo
const MIN_DURATION = 40;
const MAX_DURATION = 120;
const TARGET_RATIO = 16 / 9;
const RATIO_TOL = 0.02; // +/-2%

export default function Upload() {
  const [file, setFile] = useState(null);
  const [videoMeta, setVideoMeta] = useState(null);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    synopsis: "",
    contactEmail: "",
  });

  // Charge les metas video (durée + ratio) quand un fichier est choisi
  useEffect(() => {
    if (!file) {
      setVideoMeta(null);
      return;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      setVideoMeta({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      setErrors(["Impossible de lire la vidéo (metadata)."]);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Validation locale
  const validationErrors = useMemo(() => {
    const errs = [];
    if (!file) {
      errs.push("Choisis un fichier .mp4");
    } else {
      if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
        errs.push("Format refusé: on veut uniquement du .mp4");
      }
      if (file.size > MAX_BYTES) {
        errs.push(`Fichier trop gros: ${(file.size / 1024 / 1024).toFixed(2)} Mo (max 300 Mo)`);
      }
    }

    if (videoMeta) {
      const { width, height, duration } = videoMeta;
      if (!width || !height) errs.push("Impossible de lire la résolution.");
      else {
        const ratio = width / height;
        if (Math.abs(ratio - TARGET_RATIO) > TARGET_RATIO * RATIO_TOL) {
          errs.push(`Ratio non 16:9 (trouvé ${width}x${height})`);
        }
      }
      if (!duration || Number.isNaN(duration)) {
        errs.push("Impossible de lire la durée.");
      } else if (duration < MIN_DURATION || duration > MAX_DURATION) {
        errs.push(`Durée hors plage: ${duration.toFixed(1)}s (entre 40s et 120s)`);
      }
    }

    if (!form.title.trim()) errs.push("Titre requis");
    if (!form.synopsis.trim()) errs.push("Synopsis requis");
    if (!form.contactEmail.trim()) errs.push("Email requis");

    return errs;
  }, [file, videoMeta, form]);

  const handleFile = (e) => {
    setErrors([]);
    setMessage("");
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors(validationErrors);
    setMessage("");
    setProgress(0);
    if (validationErrors.length) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      fd.append("file", file); // fallback pour certains backends
      fd.append("title", form.title);
      fd.append("synopsis", form.synopsis);
      fd.append("contact_email", form.contactEmail);
      fd.append("duration_sec", Math.round(videoMeta.duration));
      fd.append("width", videoMeta.width);
      fd.append("height", videoMeta.height);

      // XMLHttpRequest pour suivre la progression
      const res = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = (evt.loaded / evt.total) * 100;
            setProgress(Number(pct.toFixed(1)));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ ok: true, status: xhr.status });
          } else {
            let msg = `Upload échoué (${xhr.status})`;
            try {
              const json = JSON.parse(xhr.responseText || "{}");
              if (json.error) msg = json.error;
              if (json.details?.length) msg += ` : ${json.details.join(", ")}`;
            } catch (_) {
              // ignore parse errors, keep default msg
            }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload"));
        xhr.send(fd);
      });

      if (!res.ok) throw new Error(`Upload échoué (${res.status})`);

      setMessage("Vidéo envoyée sur YouTube. Traitement en cours côté YouTube.");
      setFile(null);
      setVideoMeta(null);
      setForm({ title: "", synopsis: "", contactEmail: "" });
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <main className="app-container page">
      <div className="relative overflow-hidden card card-pad space-y-6">
        <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden>
          <div className="bg-gradient-to-r from-emerald-200 via-blue-200 to-fuchsia-200 blur-3xl h-full w-full" />
        </div>
        <div className="relative">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Upload film</p>
          <h1 className="h1 mt-2">Déposer un film (YouTube direct)</h1>
          <p className="text-slate-600 mt-2">
            Règles : mp4, ≤ 300 Mo, ratio 16:9, durée 40–120 s.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="alert alert-danger relative z-10">
            <ul className="list-disc pl-5">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {message && <div className="alert alert-success relative z-10">{message}</div>}

        <form className="space-y-5 relative z-10" onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="form-field">
              <span>Titre *</span>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Nom du film"
              />
            </label>
            <label className="form-field">
              <span>Email contact *</span>
              <input
                type="email"
                name="contactEmail"
                value={form.contactEmail}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="nom@domaine.com"
              />
            </label>
          </div>

          <label className="form-field">
            <span>Synopsis *</span>
            <textarea
              name="synopsis"
              rows={4}
              value={form.synopsis}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Quelques lignes pour présenter ton film"
            />
          </label>

          <label className="form-field">
            <span>Vidéo (mp4, ≤300Mo, 16:9, 40-120s) *</span>
            <div className="mt-2 flex flex-col gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/70 px-4 py-4 hover:border-emerald-400">
              <input
                type="file"
                name="video"
                accept="video/mp4"
                onChange={handleFile}
                ref={inputRef}
                required
                className="text-sm"
              />
              <p className="text-xs text-slate-500">
                Glisse ton .mp4 ici ou clique pour choisir un fichier.
              </p>
            </div>
          </label>

          {file && (
            <div className="text-sm text-slate-600">
              <div>
                Fichier: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} Mo)
              </div>
              {videoMeta && (
                <div>
                  Durée: {videoMeta.duration?.toFixed(1)} s — Résolution: {videoMeta.width}×{videoMeta.height}
                </div>
              )}
            </div>
          )}

          {submitting && (
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-emerald-500 transition-all" style={{ width: `${progress || 5}%` }} />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Envoi en cours..." : "Envoyer"}
          </button>
        </form>
      </div>
    </main>
  );
}
