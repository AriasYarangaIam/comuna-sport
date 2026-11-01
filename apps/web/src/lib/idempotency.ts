/**
 * Ciclo de vida de la Idempotency-Key (DESIGN.md §6.2):
 * - Se genera al abrir el asistente.
 * - Se rota cuando cambian userId, role o timeSlot, o tras un 422 payload_mismatch.
 * - Un reintento o doble toque reutiliza la misma llave.
 */
export const createIdempotencyKey = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Referencia visible y truncada para la UI (mono, 12 px). */
export const shortIdempotencyKey = (key: string): string => {
  if (key.length <= 14) {
    return key;
  }
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
};
