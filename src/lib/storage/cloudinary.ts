import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

import {
  assertValidUpload,
  type StorageProvider,
  type StoredFile,
  type UploadInput,
} from "./types";

type CloudinaryResourceType = "image" | "raw" | "video" | "auto";

function resourceTypeForMime(mimeType: string): CloudinaryResourceType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw";
}

/**
 * Cloudinary storage for production uploads (images, PDFs, docs).
 */
export class CloudinaryStorageProvider implements StorageProvider {
  readonly name = "cloudinary" as const;
  private configured = false;

  private configure(): {
    cloudName: string;
    folder: string;
  } {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = process.env.CLOUDINARY_FOLDER ?? "my-flowboard";

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      );
    }

    if (!this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
    }

    return { cloudName, folder };
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    assertValidUpload(input);
    const { folder } = this.configure();

    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const publicId = `${input.prefix ?? "uploads"}/${randomUUID()}-${safeName}`.replace(
      /\.[^.]+$/,
      "",
    );
    const resourceType = resourceTypeForMime(input.mimeType);

    const result = await new Promise<{
      public_id: string;
      secure_url: string;
      bytes: number;
      resource_type: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: resourceType,
          overwrite: false,
          use_filename: false,
          unique_filename: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error("Cloudinary upload failed."));
            return;
          }
          resolve({
            public_id: uploaded.public_id,
            secure_url: uploaded.secure_url,
            bytes: uploaded.bytes,
            resource_type: uploaded.resource_type,
          });
        },
      );

      stream.end(input.buffer);
    });

    // Store resource type with the key so delete/url can use it later.
    const key = `${result.resource_type}:${result.public_id}`;

    return {
      key,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: result.bytes || input.size,
      provider: this.name,
      url: result.secure_url,
    };
  }

  async delete(key: string): Promise<void> {
    this.configure();
    const { resourceType, publicId } = parseCloudinaryKey(key);

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  }

  async getSignedUrl(key: string): Promise<string> {
    // Uploads are public by default; return the CDN URL.
    // Switch to authenticated/signed delivery later if needed.
    return this.getPublicUrl(key);
  }

  getPublicUrl(key: string): string {
    this.configure();
    const { resourceType, publicId } = parseCloudinaryKey(key);

    return cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
    });
  }
}

function parseCloudinaryKey(key: string): {
  resourceType: CloudinaryResourceType;
  publicId: string;
} {
  const separator = key.indexOf(":");
  if (separator === -1) {
    return { resourceType: "image", publicId: key };
  }

  const resourceType = key.slice(0, separator) as CloudinaryResourceType;
  const publicId = key.slice(separator + 1);
  return { resourceType, publicId };
}
