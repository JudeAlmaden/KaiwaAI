/**
 * In-browser image compression utility using HTML Canvas.
 * Downscales images to max 1400px wide, encodes as JPEG at ~80% quality.
 * Prevents bloated database storage (< 500 KB limit enforced).
 */

export type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number; // Defaults to 500 KB
};

const DEFAULT_MAX_WIDTH = 1400;
const DEFAULT_MAX_HEIGHT = 1400;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_MAX_SIZE = 500 * 1024; // 500 KB

export async function compressImageToDataUrl(
  file: File | Blob,
  options?: CompressImageOptions
): Promise<string> {
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE;

  return new Promise((resolve, reject) => {
    // Check if FileReader is available
    if (typeof window === "undefined" || typeof FileReader === "undefined") {
      reject(new Error("Image compression is only supported in browser environments"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image for processing"));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          reject(new Error("Invalid image dimensions"));
          return;
        }

        // Scale proportionally to fit within maxWidth and maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not initialize 2D canvas context"));
          return;
        }

        // Draw white background in case image has transparency (JPEG doesn't support transparency)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Approximate size of base64 in bytes: (length * 3/4) - header
        const approximateBytes = Math.round((dataUrl.length * 3) / 4);
        if (approximateBytes > maxSizeBytes) {
          reject(
            new Error(
              `Compressed image is too large (${Math.round(approximateBytes / 1024)} KB). Maximum allowed is ${Math.round(maxSizeBytes / 1024)} KB.`
            )
          );
          return;
        }

        resolve(dataUrl);
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
