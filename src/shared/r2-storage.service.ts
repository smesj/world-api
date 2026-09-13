import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Thin wrapper around Cloudflare R2's S3-compatible API. R2 buckets are
// configured with a public URL (either the r2.dev dev subdomain or a custom
// domain bound in the Cloudflare dashboard) — uploads go through the
// S3-compatible endpoint, but reads are served directly from that public URL,
// not proxied back through this API.
@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket = process.env.R2_BUCKET_NAME;
  private readonly publicUrl = process.env.R2_PUBLIC_URL;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket || !this.publicUrl) {
      this.logger.warn(
        'R2 storage is not configured (missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_URL) — photo uploads will be rejected',
      );
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  // Uploads a buffer to R2 under `key` and returns its public URL.
  async uploadImage(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Photo uploads are not configured on this server (missing R2 credentials)',
      );
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    // publicUrl is guaranteed set here — it's part of the same guard as `client` in the constructor
    return `${this.publicUrl!.replace(/\/$/, '')}/${key}`;
  }
}
