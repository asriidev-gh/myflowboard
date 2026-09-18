import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink, access } from "fs/promises";
import path from "path";

import {
  assertValidUpload,
  type StorageProvider,
  type StoredFile,
  type UploadInput,
} from "./types";

function getLocalRoot(): string {
  const configured = process.env.STORAGE_LOCAL_PATH;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;

  async upload(input: UploadInput): Promise<StoredFile> {
    assertValidUpload(input);

    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = path.posix.join(
      input.prefix ?? "uploads",
      `${randomUUID()}-${safeName}`,
    );
    const absolutePath = path.join(/*turbopackIgnore: true*/ getLocalRoot(), key);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ absolutePath, input.buffer);

    return {
      key,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
      provider: this.name,
      url: this.getPublicUrl(key),
    };
  }

  async delete(key: string): Promise<void> {
    const absolutePath = path.join(/*turbopackIgnore: true*/ getLocalRoot(), key);
    try {
      await access(/*turbopackIgnore: true*/ absolutePath);
      await unlink(/*turbopackIgnore: true*/ absolutePath);
    } catch {
      // File already missing — ignore
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.getPublicUrl(key);
  }

  getPublicUrl(key: string): string {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const encoded = key
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    return `${base}/api/files/${encoded}`;
  }
}
