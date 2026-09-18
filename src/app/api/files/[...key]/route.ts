import { NextResponse } from "next/server";
import { access, readFile } from "fs/promises";
import path from "path";

import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ key: string[] }>;
}

function getLocalRoot(): string {
  const configured = process.env.STORAGE_LOCAL_PATH;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key: parts } = await params;
  const key = parts.map(decodeURIComponent).join("/");
  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const absolutePath = path.join(/*turbopackIgnore: true*/ getLocalRoot(), key);

  try {
    await access(/*turbopackIgnore: true*/ absolutePath);
    const data = await readFile(/*turbopackIgnore: true*/ absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".pdf"
              ? "application/pdf"
              : "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${path.basename(absolutePath)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
