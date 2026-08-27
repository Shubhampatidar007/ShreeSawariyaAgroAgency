const MAX_IMAGE_BYTES = 1024 * 1024;

type CompressOptions = { maxBytes?: number; maxDimension?: number };

export async function compressImage(file: File, options: CompressOptions = {}): Promise<Blob> {
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;
  const maxDimension = options.maxDimension ?? 1600;
  if (file.size <= maxBytes && maxDimension >= 1600) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare the image for upload");
  }
  context.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.86;
  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= maxBytes) return blob;

      quality -= 0.06;
      if (quality < 0.5) {
        quality = 0.78;
        width = Math.max(64, Math.round(width * 0.8));
        height = Math.max(64, Math.round(height * 0.8));
        canvas.width = width;
        canvas.height = height;
        const resizedContext = canvas.getContext("2d");
        if (!resizedContext) throw new Error("Could not resize the image");
        resizedContext.drawImage(bitmap, 0, 0, width, height);
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error(`The image could not be compressed below ${Math.round(maxBytes / 1024)} KB`);
}

export function imageExtension(blob: Blob) {
  return blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
}

export { MAX_IMAGE_BYTES };
