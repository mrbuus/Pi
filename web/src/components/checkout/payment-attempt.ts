/** Payment attempt identity is persisted before any write request. No token or bank details are stored. */
export function paymentAttempt(
  userId: string,
  purpose: string,
  body: unknown,
): string {
  const key = `pi-payment-attempt-v1:${userId}:${purpose}`;
  const fingerprint = JSON.stringify(body);
  const raw = localStorage.getItem(key);
  if (raw) {
    const saved = JSON.parse(raw);
    if (
      !saved.completed &&
      saved.fingerprint === fingerprint &&
      typeof saved.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        saved.id,
      )
    )
      return saved.id;
  }
  const id = crypto.randomUUID();
  localStorage.setItem(key, JSON.stringify({ fingerprint, id }));
  return id;
}

export function pendingPaymentDraft(userId: string, purpose: string): unknown {
  const raw = localStorage.getItem(
    `pi-payment-attempt-v1:${userId}:${purpose}`,
  );
  if (!raw) return null;
  const saved = JSON.parse(raw);
  return saved.completed ? null : JSON.parse(saved.fingerprint);
}
export function acknowledgePaymentAttempt(userId: string, purpose: string) {
  const key = `pi-payment-attempt-v1:${userId}:${purpose}`;
  const saved = JSON.parse(localStorage.getItem(key) || "null");
  if (saved)
    localStorage.setItem(key, JSON.stringify({ ...saved, completed: true }));
}
