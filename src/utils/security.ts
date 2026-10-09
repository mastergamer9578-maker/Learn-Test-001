/**
 * Security & Input Protection Utilities
 * - XSS Prevention (HTML sanitization & tag stripping)
 * - Input validation & Length boundaries
 * - Rate limiting against brute-force and spamming
 */

/**
 * Sanitizes generic user input string:
 * - Strips control and non-printable characters
 * - Strips HTML tags and potential script injection strings
 * - Truncates to safe maximum length
 */
export function sanitizeString(input: unknown, maxLength = 255): string {
  if (typeof input !== 'string') return '';

  // Remove dangerous control characters and null bytes
  let clean = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF]/g, '');

  // Strip HTML / script / event tags
  clean = clean.replace(/<[^>]*>?/gm, '');

  // Strip javascript: pseudo-protocols
  clean = clean.replace(/javascript:/gi, '');

  return clean.trim().slice(0, maxLength);
}

/**
 * Escapes HTML characters for safe rendering in case strings are inserted into innerHTML or attributes
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return input.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validates phone numbers (digits, +, -, spaces only, 7-15 chars)
 */
export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^\+?[0-9]{7,15}$/.test(clean);
}

/**
 * Client-side in-memory sliding window rate limiter
 */
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  actionKey: string,
  maxAttempts: number,
  windowSeconds: number
): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = rateLimitStore.get(actionKey);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(actionKey, record);
  }

  // Prune timestamps older than window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxAttempts) {
    const oldest = record.timestamps[0];
    const waitSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return { allowed: false, waitSeconds };
  }

  record.timestamps.push(now);
  return { allowed: true };
}
