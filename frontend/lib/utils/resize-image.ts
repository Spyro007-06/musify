/**
 * Downscales an image file into a small square-fit JPEG data URL. Avatars
 * are stored directly in the `avatarUrl` string column via the existing
 * profile-update endpoint, so keeping the encoded size small here is what
 * keeps that request (and the stored row) lightweight — there's no
 * dedicated file-storage/upload endpoint to offload that to.
 */
export function fileToAvatarDataUrl(file: File, maxDim = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(objectUrl);

      if (!ctx) {
        reject(new Error('Canvas is not supported in this browser.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read this image file.'));
    };

    img.src = objectUrl;
  });
}
