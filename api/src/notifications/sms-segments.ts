/**
 * SMS message segment count using GSM-7 septets or UCS-2 UTF-16 code units.
 * A single segment holds 160 GSM-7 septets / 70 UCS-2 units; concatenated
 * messages hold 153 / 67 units because each part reserves a concatenation header.
 */

/** GSM 03.38 default alphabet. The escape character itself is intentionally omitted. */
const GSM7_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
);

/** GSM 03.38 extension alphabet; each character consumes two septets. */
const GSM7_EXTENDED = new Set('^{}\\[~]|€');

function isGsm7Character(character: string): boolean {
  return GSM7_BASIC.has(character) || GSM7_EXTENDED.has(character);
}

/** Return how many SMS parts the provider must send for this text. */
export function calculateSmsSegments(message: string): number {
  if (!message) return 0;

  const characters = Array.from(message);
  if (characters.every(isGsm7Character)) {
    const septets = characters.reduce(
      (total, character) => total + (GSM7_EXTENDED.has(character) ? 2 : 1),
      0,
    );
    return septets <= 160 ? 1 : Math.ceil(septets / 153);
  }

  // JavaScript string length is UTF-16 code units, matching UCS-2 accounting
  // for astral symbols such as emoji (two code units each).
  const codeUnits = message.length;
  return codeUnits <= 70 ? 1 : Math.ceil(codeUnits / 67);
}

/** Character classification helper used by SMS diagnostics and tests. */
export function analyzeMessageCharacters(message: string): string {
  return Array.from(message, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if ((codePoint >= 0x0400 && codePoint <= 0x04ff) || (codePoint >= 0x0100 && codePoint <= 0x017f)) {
      return 'Cyrillic';
    }
    if (GSM7_BASIC.has(character)) return 'GSM7';
    if (GSM7_EXTENDED.has(character)) return 'GSM7-ext';
    return `Unknown(U+${codePoint.toString(16).toUpperCase()})`;
  }).join(' ');
}
