export const UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE_BYTES: 300 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ["video/mp4"],
};

export function buildYoutubeInsertRequest({ title, description, fileStream }) {
  return {
    part: "snippet,status",
    requestBody: {
      snippet: {
        title: title || "Upload MarsAI",
        description: description || "Video uploadee via MarsAI",
      },
      status: {
        privacyStatus: "private",
      },
    },
    media: {
      body: fileStream,
    },
  };
}

export function buildUploadSuccessPayload(videoId) {
  return {
    message: "Upload reussi !",
    videoId,
    videoUrl: `https://youtube.com/watch?v=${videoId}`,
  };
}

export function buildValidationFailurePayload(validation) {
  const refusalReasons = validation.errors.map((entry) => entry.message).join(" ; ");

  return {
    error: `Video refusee : ${refusalReasons}`,
    validationErrors: validation.errors,
    validationWarnings: validation.warnings,
    metadata: validation.metadata,
  };
}
