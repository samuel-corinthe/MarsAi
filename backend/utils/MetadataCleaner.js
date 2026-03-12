import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { resolveFfmpegCommand } from './mediaBinaryResolver.js';


export function cleanMetadata(filePath, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    if (!filePath || typeof filePath !== 'string') {
      return reject(new Error('Chemin de fichier invalide'));
    }

    if (!existsSync(filePath)) {
      return reject(new Error('Fichier vidéo introuvable'));
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const cleanedPath = path.join(dir, `${base}_clean${ext}`);

    const args = [
      '-i', filePath,
      '-map_metadata', '-1',
      '-c', 'copy',
      '-f', 'mp4',
      '-y',
      cleanedPath
    ];

    const ffmpegCommand = resolveFfmpegCommand();
    const ffmpeg = spawn(ffmpegCommand, args);

    let stderr = '';

    const timeoutId = setTimeout(() => {
      ffmpeg.kill('SIGKILL');
      reject(new Error(`Timeout nettoyage métadonnées (${timeout} ms)`));
    }, timeout);

    ffmpeg.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    ffmpeg.on('close', async (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        return reject(
          new Error(`FFmpeg a échoué (code ${code}) : ${stderr}`)
        );
      }

      try {
        await fs.unlink(filePath);
        await fs.rename(cleanedPath, filePath);
        console.log('[METADATA] Métadonnées supprimées avec succès');
        resolve(filePath);
      } catch (error) {
        reject(new Error(`Erreur remplacement fichier : ${error.message}`));
      }
    });

    ffmpeg.on('error', error => {
      clearTimeout(timeoutId);

      if (error.code === 'ENOENT') {
        reject(new Error('ffmpeg introuvable. Configurez FFMPEG_PATH ou installez ffmpeg sur le systeme.'));
      } else {
        reject(error);
      }
    });
  });
}

export const cleanMetadataMiddleware = async (req, res, next) => {
  const videoFile = req.files?.video?.[0] || req.file;
  const filePath = videoFile?.path;

  if (!filePath) {
    return next();
  }

  try {
    await cleanMetadata(filePath);
    next();
  } catch (error) {
    console.error('[METADATA ERROR]', error.message);
    return res.status(500).json({
      error: 'Erreur lors du nettoyage des métadonnées vidéo'
    });
  }
};
