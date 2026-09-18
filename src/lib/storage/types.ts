export type StorageProviderName = "local" | "cloudinary";

export interface StoredFile {
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
  provider: StorageProviderName;
  url: string;
}

export interface UploadInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  size: number;
  /** Optional path prefix, e.g. "cards/abc123" */
  prefix?: string;
}

export interface StorageProvider {
  readonly name: StorageProviderName;
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getPublicUrl(key: string): string;
}

/** Max upload size: 10 MB */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export function assertValidUpload(input: {
  mimeType: string;
  size: number;
}): void {
  if (input.size > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds the 10 MB size limit.");
  }
  if (
    !ALLOWED_MIME_TYPES.includes(
      input.mimeType as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw new Error("File type is not allowed.");
  }
}
