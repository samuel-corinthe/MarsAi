import { spawn } from 'child_process';
import fs from 'fs';
import { resolveFfprobeCommand } from './mediaBinaryResolver.js';


function parseFraction(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const parts = value.split('/').map(Number);

  if (parts.length !== 2 || parts.some(Number.isNaN)) {
    return null;
  }

  const [numerator, denominator] = parts;

  return denominator === 0 ? null : numerator / denominator;
}


export function analyzeVideo(filePath, timeout = 10_000) {
  return new Promise((resolve, reject) => {

    if (!filePath || typeof filePath !== 'string') {
      return reject(new Error('Chemin de fichier invalide'));
    }

    if (!fs.existsSync(filePath)) {
      return reject(new Error('Fichier vidéo introuvable'));
    }

    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ];

    const ffprobeCommand = resolveFfprobeCommand();
    const ffprobe = spawn(ffprobeCommand, args);

    let stdout = '';
    let stderr = '';

    const timeoutId = setTimeout(() => {
      ffprobe.kill('SIGKILL');
      reject(new Error(`Timeout dépassé (${timeout} ms)`));
    }, timeout);

    ffprobe.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    ffprobe.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    ffprobe.on('close', code => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        return reject(
          new Error(`FFprobe a échoué (code ${code}) : ${stderr}`)
        );
      }

      try {
        const metadata = JSON.parse(stdout);

        const videoStream = metadata.streams?.find(
          stream => stream.codec_type === 'video'
        );

        if (!videoStream) {
          throw new Error('Aucun flux vidéo détecté');
        }

        const duration =
          Number(videoStream.duration) ||
          Number(metadata.format?.duration) ||
          null;

        const bitrate =
          Number(videoStream.bit_rate) ||
          Number(metadata.format?.bit_rate) ||
          null;

        const fps = parseFraction(videoStream.r_frame_rate);

        resolve({
          width: videoStream.width ?? null,
          height: videoStream.height ?? null,
          aspectRatio:
            videoStream.width && videoStream.height
              ? videoStream.width / videoStream.height
              : null,
          duration,
          codec: videoStream.codec_name ?? null,
          bitrate,
          fps,
          fileSize: Number(metadata.format?.size) || null,
          hasAudio: metadata.streams?.some(
            stream => stream.codec_type === 'audio'
          ) ?? false
        });
      } catch (error) {
        reject(new Error(`Erreur de parsing : ${error.message}`));
      }
    });

    ffprobe.on('error', error => {
      clearTimeout(timeoutId);

      if (error.code === 'ENOENT') {
        reject(new Error("ffprobe introuvable. Configurez FFPROBE_PATH ou installez ffprobe sur le systeme."));
      } else {
        reject(error);
      }
    });
  });
}

