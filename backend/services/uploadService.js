import fs from "node:fs";
import oauth2Client from "../utils/YT-client.js";
import { google } from "googleapis";
import { analyzeVideo } from "../utils/VideoAnalyser.js";
import { validateVideoData } from "../utils/VideoValidator.js";
import {
  buildYoutubeInsertRequest,
  buildUploadSuccessPayload,
  buildValidationFailurePayload,
} from "../models/uploadModel.js";

export async function validateUploadedVideo(filePath) {
  const metadata = await analyzeVideo(filePath);
  return validateVideoData(metadata);
}

export async function uploadToYoutube({ title, description, filePath }) {
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const insertRequest = buildYoutubeInsertRequest({
    title,
    description,
    fileStream: fs.createReadStream(filePath),
  });

  const response = await youtube.videos.insert(insertRequest);
  return response?.data?.id;
}

export function buildUploadValidationError(validation) {
  return buildValidationFailurePayload(validation);
}

export function buildUploadSuccess(videoId) {
  return buildUploadSuccessPayload(videoId);
}

export function removeTempFile(filePath) {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
