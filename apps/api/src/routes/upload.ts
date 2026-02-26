import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAuth } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for videos

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export default async function uploadRoutes(server: FastifyInstance) {
  // Upload single file
  server.post('/', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Dosya bulunamadı' });
      }

      const mimetype = data.mimetype;
      if (!ALLOWED_TYPES.includes(mimetype)) {
        return reply.status(400).send({
          error: 'Desteklenmeyen dosya formatı. Desteklenen: JPG, PNG, WebP, GIF, SVG, MP4, WebM, OGG'
        });
      }

      // Generate unique filename
      const ext = path.extname(data.filename) || getExtFromMime(mimetype);
      const uniqueName = `${randomUUID()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);

      // Save file to disk
      const buffer = await data.toBuffer();

      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({ error: 'Dosya boyutu çok büyük. Maksimum 50MB' });
      }

      fs.writeFileSync(filePath, buffer);

      // Determine media type
      const isVideo = ALLOWED_VIDEO_TYPES.includes(mimetype);

      // Return the URL path
      const fileUrl = `/uploads/${uniqueName}`;

      return {
        success: true,
        file: {
          url: fileUrl,
          filename: data.filename,
          mimetype,
          size: buffer.length,
          isVideo,
        },
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      return reply.status(500).send({ error: 'Dosya yükleme hatası: ' + (error.message || 'Bilinmeyen hata') });
    }
  });

  // Delete uploaded file
  server.delete('/:filename', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { filename } = request.params as { filename: string };

    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, safeName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }

    return reply.status(404).send({ error: 'Dosya bulunamadı' });
  });
}

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogg',
    'video/quicktime': '.mov',
  };
  return map[mime] || '.bin';
}
