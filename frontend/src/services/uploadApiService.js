import axios from "axios";
import { buildApiPath } from "../utils/deploymentPath";

function uniqueCandidates(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function buildApiCandidates(path) {
  const safePath = String(path || "").startsWith("/") ? String(path) : `/${path || ""}`;
  const apiOrigin = String(import.meta.env.VITE_API_ORIGIN || "").trim().replace(/\/+$/, "");
  const locationPrefix = (() => {
    if (typeof window === "undefined") return "";
    const first = String(window.location?.pathname || "/").split("/").filter(Boolean)[0] || "";
    return first ? `/${first}` : "";
  })();

  return uniqueCandidates([
    buildApiPath(safePath),
    apiOrigin ? `${apiOrigin}${safePath}` : "",
    safePath,
    `/MarsAi${safePath}`,
    `/MarsAiFestival${safePath}`,
    `/backend${safePath}`,
    locationPrefix ? `${locationPrefix}${safePath}` : "",
  ]);
}

async function requestApiWithFallback({
  method = "get",
  path,
  data,
  config = {},
} = {}) {
  const candidates = buildApiCandidates(path);
  let lastError = null;

  for (const url of candidates) {
    try {
      const response = await axios({
        method,
        url,
        data,
        ...config,
      });
      const contentType = String(response?.headers?.["content-type"] || "").toLowerCase();
      if (contentType.includes("text/html")) {
        continue;
      }
      return response?.data || {};
    } catch (error) {
      const status = Number(error?.response?.status);
      const contentType = String(error?.response?.headers?.["content-type"] || "").toLowerCase();

      if (status === 404 || contentType.includes("text/html")) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastError) throw lastError;
  throw new Error("Impossible de joindre l'API backend.");
}

export async function fetchAltchaChallenge() {
  return requestApiWithFallback({
    method: "get",
    path: "/api/altcha/challenge",
  });
}

export async function fetchUploadCountries() {
  return requestApiWithFallback({
    method: "get",
    path: "/api/upload/countries",
  });
}

export async function fetchYoutubeUploadStatus(videoId) {
  const safeVideoId = String(videoId || "").trim();
  if (!safeVideoId) return {};

  return requestApiWithFallback({
    method: "get",
    path: `/api/upload/youtube/status/${encodeURIComponent(safeVideoId)}`,
  });
}

export async function postYoutubeUpload(formData, onUploadProgress) {
  return requestApiWithFallback({
    method: "post",
    path: "/api/upload/youtube",
    data: formData,
    config: {
      onUploadProgress,
    },
  });
}
