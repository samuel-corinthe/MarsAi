

import { fileTypeFromFile } from 'file-type';
import fs from 'fs/promises';

const ACCEPTED_FILE_TYPES = {
  'video/mp4': { label: 'MP4', cleanExt: 'mp4' },
};

export async function  verifyVideoMagicBytes(filePath) {
  try {
    const fileType =  await fileTypeFromFile(filePath);

    if(!fileType){
      return{
        isValid: false,
        reason: 'Signature de fichier (Magic Bytes) inconnue ou fichier corrompu',
        code: 'UNKNOWN_TYPE'
      };
    }
    const config = ACCEPTED_FILE_TYPES[fileType.mime];

    if (config){
      return {
        isValid: true,
        reason: `Fichier ${config.label} valide`,
        detectedType: config.label,
        mime: fileType.mime,
        ext: fileType.ext
    };
  }
  return {
    isValid: false,
      reason: `Format non autorisé : ${fileType.mime} (.${fileType.ext})`,
      code: 'UNAUTHORIZED_FORMAT',
      detectedType: fileType.ext.toUpperCase()
  };
} catch (error) {
  console.error(' [MAGIC BYTES ERROR]:', error);
    return {
      isValid: false,
      reason: `Erreur technique lors de l'analyse : ${error.message}`,
      code: 'INTERNAL_ERROR'
};
}
}

export const validateFileMagicBytes = async (req, res, next) => {
  const videoFile = req.files?.video?.[0] || req.file;
  if (!videoFile) return next();

  const result = await verifyVideoMagicBytes(videoFile.path);

  if (!result.isValid) {
    console.warn(` [SECURITY] Fichier rejeté [${result.code}]: ${videoFile.originalname}`);


    try {
      await fs.unlink(videoFile.path);
    } catch (err) {
      console.error(' [CLEANUP ERROR]: Impossible de supprimer le fichier suspect', err);
    }

    return res.status(400).json({
      error: 'Invalid file content',
      message: result.reason,
      detectedType: result.detectedType
    });
  }



  console.log(` [MAGIC BYTES] ✓ ${videoFile.originalname} confirmé comme ${result.detectedType}`);
  next();
};