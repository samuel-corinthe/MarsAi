import {
  validateUploadedVideo,
  uploadToYoutube,
  buildUploadValidationError,
  buildUploadSuccess,
  removeTempFile,
} from "../services/uploadService.js";

export async function uploadYoutubeVideo(req, res) {
  const { title, description } = req.body || {};
  const videoFile = req.file;

  if (!videoFile) {
    return res.status(400).json({ error: "Aucun fichier video recu." });
  }

  try {
    console.log("[UPLOAD] Nouvelle soumission recue");
    console.log("[UPLOAD] Analyse de la video...");

    const validation = await validateUploadedVideo(videoFile.path);

    console.log("[UPLOAD] Validation des contraintes...");
    if (!validation.isValid) {
      console.log("[UPLOAD] Video non conforme:", validation.errors.map((entry) => entry.field));
      removeTempFile(videoFile.path);
      return res.status(400).json(buildUploadValidationError(validation));
    }

    console.log("[UPLOAD] Upload vers YouTube...");
    const videoId = await uploadToYoutube({
      title,
      description,
      filePath: videoFile.path,
    });

    console.log("[UPLOAD] Upload reussi, ID:", videoId);
    return res.status(200).json(buildUploadSuccess(videoId));
  } catch (error) {
    console.error("[UPLOAD] Erreur:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Erreur interne du serveur" });
    }
    return null;
  } finally {
    if (videoFile?.path) {
      console.log("[UPLOAD] Nettoyage fichier temporaire");
      removeTempFile(videoFile.path);
    }
  }
}
