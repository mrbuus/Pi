/**
 * Профайл зургийг төхөөрөмж дээр нь 512px дөрвөлжин JPEG болгоно (2026-11-12).
 *
 * Утасны камерын зураг 2–12MB, зарим нь HEIC, Android-ийн зарим галерей төрлөө
 * (file.type) хоосон өгдөг. Аватар хуудас бүрийн толгойд харагддаг тул том файл
 * удаан ачаалагдаж, HEIC нь компьютер/Android дээр огт харагддаггүй. Энд нэг
 * хэвийн жижиг JPEG болгосноор аль ч төхөөрөмжөөс солиход адилхан ажиллана.
 */
const MAX_SIDE = 512;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i;
const HEIC_EXT = /\.(heic|heif)$/i;

/** Зураг мөн эсэх — төрөл хоосон ирэх (Android) тохиолдолд өргөтгөлөөр шалгана */
export function looksLikeImage(file: File): boolean {
  return file.type.startsWith("image/") || (!file.type && IMAGE_EXT.test(file.name));
}

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    // imageOrientation — утасны EXIF эргэлтийг зөв тусгана (хажуу тийш харагдахгүй)
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Дөрвөлжин (төвөөс тайрсан) 512px JPEG буцаана. Хөтөч зургийг уншиж чадахгүй бол:
 * HEIC → алдаа (бусад төхөөрөмж дээр харагдахгүй тул), бусад → эх файлыг хэвээр.
 */
export async function prepareAvatar(file: File): Promise<File> {
  let source: Awaited<ReturnType<typeof decode>>;
  try {
    source = await decode(file);
  } catch {
    if (file.type === "image/heic" || file.type === "image/heif" || HEIC_EXT.test(file.name)) {
      throw new Error("Энэ зургийг уншиж чадсангүй. JPG эсвэл PNG зураг сонгоно уу");
    }
    return file;
  }
  const side = Math.min(source.width, source.height);
  const out = Math.min(MAX_SIDE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff"; // тунгалаг PNG-ийн ард хар болохгүй (canvas-ийн арын өнгө, UI өнгө биш)
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(
    source,
    (source.width - side) / 2,
    (source.height - side) / 2,
    side,
    side,
    0,
    0,
    out,
    out,
  );
  if ("close" in source && typeof source.close === "function") source.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) return file;
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}
