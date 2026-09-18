import { CloudinaryStorageProvider } from "./cloudinary";
import { LocalStorageProvider } from "./local";
import type { StorageProvider, StorageProviderName } from "./types";

export * from "./types";

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;

  const name = (process.env.STORAGE_PROVIDER ?? "local") as StorageProviderName;

  cached =
    name === "cloudinary"
      ? new CloudinaryStorageProvider()
      : new LocalStorageProvider();

  return cached;
}
