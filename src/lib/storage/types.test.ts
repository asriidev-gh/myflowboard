import { describe, expect, it } from "vitest";

import {
  assertValidUpload,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage/types";

describe("assertValidUpload", () => {
  it("accepts allowed mime types under the size limit", () => {
    expect(() =>
      assertValidUpload({ mimeType: "image/png", size: 1024 }),
    ).not.toThrow();
  });

  it("rejects oversized files", () => {
    expect(() =>
      assertValidUpload({
        mimeType: "image/png",
        size: MAX_UPLOAD_BYTES + 1,
      }),
    ).toThrow(/10 MB/);
  });

  it("rejects disallowed mime types", () => {
    expect(() =>
      assertValidUpload({ mimeType: "application/zip", size: 10 }),
    ).toThrow(/not allowed/);
  });
});
