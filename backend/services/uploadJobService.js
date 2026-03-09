import { randomUUID } from "node:crypto";

const DEFAULT_HISTORY_LIMIT = 250;
const DEFAULT_CONCURRENCY = 1;

const parsedHistoryLimit = Number.parseInt(process.env.UPLOAD_JOB_HISTORY_LIMIT || "", 10);
const parsedConcurrency = Number.parseInt(process.env.UPLOAD_JOB_CONCURRENCY || "", 10);

const HISTORY_LIMIT = Number.isFinite(parsedHistoryLimit) && parsedHistoryLimit > 0
  ? parsedHistoryLimit
  : DEFAULT_HISTORY_LIMIT;
const CONCURRENCY = Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
  ? parsedConcurrency
  : DEFAULT_CONCURRENCY;

const jobs = new Map();
const queue = [];
let activeWorkers = 0;

function nowIso() {
  return new Date().toISOString();
}

function toSafeString(value) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    message: job.message,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    trackingId: job.id,
    youtubeVideoId: job.youtubeVideoId,
    movieId: job.movieId,
    youtubeUrl: job.youtubeUrl,
    videoUrl: job.videoUrl,
    confirmationEmailSent: job.confirmationEmailSent,
    confirmationEmailError: job.confirmationEmailError,
  };
}

function applyResult(job, result = {}) {
  if (!job || !result || typeof result !== "object") return;

  const safeYoutubeVideoId = toSafeString(result.youtubeVideoId);
  if (safeYoutubeVideoId) job.youtubeVideoId = safeYoutubeVideoId;

  const safeMovieId = toSafeNumber(result.movieId);
  if (safeMovieId) job.movieId = safeMovieId;

  const safeYoutubeUrl = toSafeString(result.youtubeUrl);
  if (safeYoutubeUrl) job.youtubeUrl = safeYoutubeUrl;

  const safeVideoUrl = toSafeString(result.videoUrl);
  if (safeVideoUrl) job.videoUrl = safeVideoUrl;

  if (typeof result.confirmationEmailSent === "boolean") {
    job.confirmationEmailSent = result.confirmationEmailSent;
  }

  const safeMailError = toSafeString(result.confirmationEmailError);
  job.confirmationEmailError = safeMailError || "";
}

function trimCompletedJobs() {
  if (jobs.size <= HISTORY_LIMIT) return;

  const removable = [...jobs.values()]
    .filter((job) => job.status === "succeeded" || job.status === "failed")
    .sort((a, b) => {
      const aTs = new Date(a.updatedAt).getTime();
      const bTs = new Date(b.updatedAt).getTime();
      return aTs - bTs;
    });

  while (jobs.size > HISTORY_LIMIT && removable.length > 0) {
    const oldest = removable.shift();
    if (!oldest) break;
    jobs.delete(oldest.id);
  }
}

function processQueue() {
  while (activeWorkers < CONCURRENCY && queue.length > 0) {
    const next = queue.shift();
    if (!next) continue;

    const job = jobs.get(next.id);
    if (!job || job.status !== "queued") {
      continue;
    }

    activeWorkers += 1;
    job.status = "processing";
    job.stage = "processing";
    job.message = "Upload processing started.";
    job.startedAt = job.startedAt || nowIso();
    job.updatedAt = nowIso();

    Promise.resolve()
      .then(() => next.worker({ jobId: next.id, payload: next.payload }))
      .then((result) => {
        markUploadJobSucceeded(next.id, result || {});
      })
      .catch((error) => {
        markUploadJobFailed(next.id, error);
      })
      .finally(() => {
        activeWorkers = Math.max(0, activeWorkers - 1);
        trimCompletedJobs();
        processQueue();
      });
  }
}

export function enqueueUploadJob(worker, payload) {
  if (typeof worker !== "function") {
    throw new Error("Upload worker must be a function.");
  }

  const id = randomUUID();
  const stamp = nowIso();
  const job = {
    id,
    status: "queued",
    stage: "queued",
    message: "Upload queued.",
    error: "",
    createdAt: stamp,
    updatedAt: stamp,
    startedAt: null,
    finishedAt: null,
    youtubeVideoId: null,
    movieId: null,
    youtubeUrl: null,
    videoUrl: null,
    confirmationEmailSent: false,
    confirmationEmailError: "",
  };

  jobs.set(id, job);
  queue.push({ id, worker, payload });
  trimCompletedJobs();
  processQueue();

  return normalizeJob(job);
}

export function setUploadJobStage(jobId, stage, message = "", details = {}) {
  const job = jobs.get(String(jobId || "").trim());
  if (!job) return null;

  if (stage) job.stage = String(stage).trim() || job.stage;
  if (message) job.message = String(message).trim() || job.message;
  applyResult(job, details);
  job.updatedAt = nowIso();
  return normalizeJob(job);
}

export function markUploadJobSucceeded(jobId, result = {}) {
  const job = jobs.get(String(jobId || "").trim());
  if (!job) return null;

  applyResult(job, result);
  job.status = "succeeded";
  job.stage = toSafeString(result?.stage) || "completed";
  job.message = toSafeString(result?.message) || job.message || "Upload processed successfully.";
  job.error = "";
  job.finishedAt = nowIso();
  job.updatedAt = nowIso();
  return normalizeJob(job);
}

export function markUploadJobFailed(jobId, error) {
  const job = jobs.get(String(jobId || "").trim());
  if (!job) return null;

  const errorMessage = toSafeString(error?.message || error) || "Unknown upload error.";
  job.status = "failed";
  job.stage = "failed";
  job.message = "Upload processing failed.";
  job.error = errorMessage;
  job.finishedAt = nowIso();
  job.updatedAt = nowIso();
  return normalizeJob(job);
}

export function getUploadJob(jobId) {
  const key = String(jobId || "").trim();
  if (!key) return null;
  return normalizeJob(jobs.get(key) || null);
}

