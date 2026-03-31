import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';

export async function uploadRoutes(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE,
    },
  });

  // Upload file
  app.post('/api/uploads', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file provided' });
    }

    const fileId = crypto.randomUUID();
    // Use only ASCII in stored filename to avoid encoding issues
    const ext = path.extname(data.filename) || '';
    const baseName = path.basename(data.filename, ext).replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 100);
    const fileName = (baseName || 'file') + ext.toLowerCase();
    const dir = path.join(config.UPLOADS_DIR, fileId);

    await fs.promises.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, fileName);
    await pipeline(data.file, fs.createWriteStream(filePath));

    // Check if file was truncated (exceeded size limit)
    if (data.file.truncated) {
      await fs.promises.rm(dir, { recursive: true });
      return reply.code(413).send({ error: 'File too large. Max 15MB.' });
    }

    const stat = await fs.promises.stat(filePath);

    return {
      fileId,
      fileName,
      mimeType: data.mimetype,
      size: stat.size,
      url: `/api/uploads/${fileId}/${fileName}`,
    };
  });

  // Download file (no auth — fileId is a random UUID, acts as a secret URL)
  app.get('/api/uploads/:fileId/:fileName', async (request, reply) => {
    const { fileId, fileName } = request.params as { fileId: string; fileName: string };
    const filePath = path.join(config.UPLOADS_DIR, fileId, fileName);

    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const stat = await fs.promises.stat(filePath);
    const mimeType = getMimeType(fileName);

    reply.header('Content-Type', mimeType);
    reply.header('Content-Length', stat.size);

    // Images and videos: inline; others: attachment
    if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
      reply.header('Content-Disposition', `inline; filename="${decodeURIComponent(fileName)}"`);
    } else {
      reply.header('Content-Disposition', `attachment; filename="${decodeURIComponent(fileName)}"`);
    }

    reply.header('Cache-Control', 'private, max-age=86400');

    const stream = fs.createReadStream(filePath);
    return reply.send(stream);
  });
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
    '.aac': 'audio/aac', '.flac': 'audio/flac',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed', '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.txt': 'text/plain', '.csv': 'text/csv',
    '.json': 'application/json', '.xml': 'application/xml',
    '.apk': 'application/vnd.android.package-archive',
  };
  return types[ext] || 'application/octet-stream';
}
