import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid localhost vs 127.0.0.1 cookie / HMR breakage in dev.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Match MAX_UPLOAD_BYTES (10 MB) plus multipart overhead for attachments.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
