import { google } from "googleapis";
import oauth2Client from "../utils/YT-client.js";

export function mapYoutubeStatus(item) {
  return {
    id: item?.id || null,
    uploadStatus: item?.status?.uploadStatus || null,
    privacyStatus: item?.status?.privacyStatus || null,
    rejectionReason: item?.status?.rejectionReason || null,
    processingStatus: item?.processingDetails?.processingStatus || null,
    processingFailureReason: item?.processingDetails?.processingFailureReason || null,
  };
}

export async function fetchYoutubeStatus(videoId) {
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const response = await youtube.videos.list({
    part: "status,processingDetails",
    id: videoId,
  });

  return response?.data?.items?.[0] || null;
}

