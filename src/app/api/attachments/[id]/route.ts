import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getStorageProvider } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findFirst({
    where: {
      id,
      card: {
        list: {
          board: {
            workspace: {
              members: { some: { userId: session.user.id } },
            },
          },
        },
      },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const storage = getStorageProvider();
    const url = await storage.getSignedUrl(attachment.storageKey);
    return NextResponse.redirect(url);
  } catch {
    if (attachment.storageProvider === "local") {
      const keyPath = attachment.storageKey
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      return NextResponse.redirect(
        new URL(`/api/files/${keyPath}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
      );
    }
    return NextResponse.json({ error: "Unable to resolve file" }, { status: 500 });
  }
}
