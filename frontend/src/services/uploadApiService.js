import axios from "axios";

function normalizeBasePath(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function buildApiPath(path) {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const configuredBasePath = normalizeBasePath(import.meta.env.VITE_API_BASE_PATH || "");

  if (configuredBasePath) {
    return `${configuredBasePath}${safePath}`;
  }

  if (typeof window !== "undefined") {
    const pathname = String(window.location?.pathname || "").toLowerCase();
    if (pathname === "/marsai" || pathname.startsWith("/marsai/")) {
      return `/MarsAi${safePath}`;
    }
  }

  return safePath;
}

export async function fetchAltchaChallenge() {
  const response = await axios.get(buildApiPath("/api/altcha/challenge"));
  return response?.data || {};
}

export async function fetchUploadCountries() {
  const response = await axios.get(buildApiPath("/api/upload/countries"));
  return response?.data || {};
}

export async function fetchYoutubeUploadStatus(videoId) {
  const safeVideoId = String(videoId || "").trim();
  if (!safeVideoId) return {};

  const response = await axios.get(
    buildApiPath(`/api/upload/youtube/status/${encodeURIComponent(safeVideoId)}`),
  );
  return response?.data || {};
}

export async function postYoutubeUpload(formData, onUploadProgress) {
  const uploadTimeoutMs = Number(import.meta.env.VITE_UPLOAD_TIMEOUT_MS || 900000);
  const response = await axios.post(buildApiPath("/api/upload/youtube"), formData, {
    onUploadProgress,
    timeout: Number.isFinite(uploadTimeoutMs) ? uploadTimeoutMs : 900000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return response?.data || {};
}

