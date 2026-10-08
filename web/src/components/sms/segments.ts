/** Immediate preview of SMS encoding. Batch cost always comes from the API estimate. */
const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);
const GSM_EXTENDED = new Set("^{}\\[~]|€");

export interface SmsSegmentPreview {
  encoding: "GSM-7" | "UCS-2";
  units: number;
  segments: number;
  singleLimit: number;
  multipartLimit: number;
}

export function previewSmsSegments(text: string): SmsSegmentPreview {
  const chars = Array.from(text);
  const gsm = chars.every((char) => GSM_BASIC.has(char) || GSM_EXTENDED.has(char));
  if (!gsm) {
    const units = text.length; // UCS-2 uses UTF-16 code units; surrogate pairs consume two.
    const segments = units === 0 ? 0 : units <= 70 ? 1 : Math.ceil(units / 67);
    return { encoding: "UCS-2", units, segments, singleLimit: 70, multipartLimit: 67 };
  }
  const units = chars.reduce((sum, char) => sum + (GSM_EXTENDED.has(char) ? 2 : 1), 0);
  const segments = units === 0 ? 0 : units <= 160 ? 1 : Math.ceil(units / 153);
  return { encoding: "GSM-7", units, segments, singleLimit: 160, multipartLimit: 153 };
}
