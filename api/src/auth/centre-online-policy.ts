/** Centre-led online classes are not open. Existing accounts are unaffected. */
export function centreOnlineClassEnabled(): boolean {
  return process.env.CENTRE_ONLINE_CLASS_ENABLED === 'true';
}

export const CENTRE_ONLINE_CLOSED_MESSAGE =
  'Төвийн шинэ онлайн ангийн элсэлт нээгдээгүй байна. Ном, тестээр бие даан суралцах бол худалдан авагчаар бүртгүүлнэ үү.';
