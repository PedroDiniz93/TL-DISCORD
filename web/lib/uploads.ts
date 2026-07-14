import path from "path";

export function getItemUploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads", "items");
}

export function getItemUploadUrl(fileName: string) {
  return `/api/uploads/items/${encodeURIComponent(fileName)}`;
}
