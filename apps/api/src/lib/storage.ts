import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

export interface StoredObject {
  key: string;
  url: string;
}

export interface Storage {
  put(buffer: Buffer, mime: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/**
 * Local-disk driver. Files are written under STORAGE_LOCAL_DIR and served by the
 * API at /uploads/*. Good for dev and single-node deployments; swap STORAGE_DRIVER
 * to "s3" for object storage (implementation stub documented in DEPLOYMENT.md).
 */
class LocalStorage implements Storage {
  private dir = resolve(process.cwd(), env.STORAGE_LOCAL_DIR);

  async put(buffer: Buffer, mime: string): Promise<StoredObject> {
    await mkdir(this.dir, { recursive: true });
    const ext = MIME_EXT[mime] ?? ".bin";
    const key = `${new Date().toISOString().slice(0, 10)}/${nanoid()}${ext}`;
    const full = join(this.dir, key);
    await mkdir(join(this.dir, key.split("/")[0]!), { recursive: true });
    await writeFile(full, buffer);
    return { key, url: `${env.API_PUBLIC_URL}/uploads/${key}` };
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(join(this.dir, key));
    } catch {
      // already gone — ignore
    }
  }

  get directory(): string {
    return this.dir;
  }
}

export const localStorage = new LocalStorage();
export const storage: Storage = localStorage;

export const ALLOWED_IMAGE_MIME = Object.keys(MIME_EXT);
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function isAllowedImage(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.includes(mime);
}

void extname;
