import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function toNonEmptyString(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function resolveFromEnv(envKey) {
  return toNonEmptyString(process.env[envKey]);
}

function resolveFfprobeStaticPath() {
  try {
    const pkg = require("ffprobe-static");
    const candidate = toNonEmptyString(pkg?.path);
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // optional dependency
  }
  return "";
}

function resolveFfmpegStaticPath() {
  try {
    const pkg = require("ffmpeg-static");
    const candidate = toNonEmptyString(pkg);
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // optional dependency
  }
  return "";
}

export function resolveFfprobeCommand() {
  const fromEnv = resolveFromEnv("FFPROBE_PATH");
  if (fromEnv) return fromEnv;

  const fromStaticPackage = resolveFfprobeStaticPath();
  if (fromStaticPackage) return fromStaticPackage;

  return "ffprobe";
}

export function resolveFfmpegCommand() {
  const fromEnv = resolveFromEnv("FFMPEG_PATH");
  if (fromEnv) return fromEnv;

  const fromStaticPackage = resolveFfmpegStaticPath();
  if (fromStaticPackage) return fromStaticPackage;

  return "ffmpeg";
}
