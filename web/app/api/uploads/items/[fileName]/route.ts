import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getItemUploadDir } from "@/lib/uploads";

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await params;
  const safeFileName = path.basename(decodeURIComponent(fileName));
  if (!safeFileName || safeFileName !== decodeURIComponent(fileName)) {
    return new NextResponse("Invalid file name", { status: 400 });
  }

  try {
    const filePath = path.join(getItemUploadDir(), safeFileName);
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentTypeFor(safeFileName),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

function contentTypeFor(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".svg") return "image/svg+xml";
  return "image/png";
}
