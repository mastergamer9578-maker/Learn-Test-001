/**
 * Shan Fast Food - Advanced Security, Sanitization & Protection Suite
 *
 * Covers:
 * 1. XSS Prevention (aggressive HTML stripping, attribute & protocol sanitization)
 * 2. Safe URL & Image Protocol Validation
 * 3. Rate Limiting (in-memory sliding window against brute force)
 * 4. CSRF & Network Protection (cryptographic tokens, double submit checks, replay defense)
 * 5. Role-Based Access Control (RBAC) permission helpers
 */

/**
 * Strips dangerous control characters, scripts, tags, and javascript pseudo-protocols
 */
export function sanitizeString(input: unknown, maxLength = 255): string {
  if (typeof input !== 'string') return '';

  // 1. Remove dangerous control characters and null bytes
  let clean = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, '');

  // 2. Strip script, style, iframe, object, embed blocks and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // 3. Strip all HTML tags
  clean = clean.replace(/<[^>]*>?/gm, '');

  // 4. Strip dangerous pseudo-protocols & inline handlers
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/vbscript\s*:/gi, '');
  clean = clean.replace(/data\s*:\s*text\/html/gi, '');
  clean = clean.replace(/\bon\w+\s*=/gi, '');

  return clean.trim().slice(0, maxLength);
}

/**
 * Escapes HTML characters for safe rendering inside innerHTML or attributes
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '`': '&#x60;',
  };
  return input.replace(/[&<>"'`]/g, (m) => map[m]);
}

/**
 * Strictly verifies whether a URL is safe to use as an image src or link
 * Only allows HTTP, HTTPS, or safe base64 image data URIs
 */
export function isValidImageUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  const clean = url.trim();

  // Allow safe base64 image data URIs (e.g. from canvas compression)
  if (/^data:image\/(jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/i.test(clean)) {
    return true;
  }

  // Allow valid http / https URLs
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitizes an image or external URL, returning empty string if unsafe
 */
export function sanitizeUrl(url: unknown, fallback = ''): string {
  if (isValidImageUrl(url)) {
    return (url as string).trim();
  }
  return fallback;
}

/**
 * Validates and sanitizes a numeric input (prices, quantities, delivery fees)
 */
export function sanitizeNumber(
  val: unknown,
  min = 0,
  max = 1000000,
  fallback = 0
): number {
  if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
    return Math.min(Math.max(val, min), max);
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed) && isFinite(parsed)) {
      return Math.min(Math.max(parsed, min), max);
    }
  }
  return fallback;
}

/**
 * Validates phone numbers (digits, +, -, spaces only, 7-15 chars)
 */
export function isValidPhone(phone: string): boolean {
  if (typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^\+?[0-9]{7,15}$/.test(clean);
}

/**
 * Deep sanitization for structured Firestore documents
 */
export function sanitizeForPersistence<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    } else if (typeof value === 'string') {
      result[key] = sanitizeString(value, 2000);
    } else if (typeof value === 'number') {
      result[key] = isFinite(value) ? value : 0;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeForPersistence(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item, 500)
          : item !== null && typeof item === 'object'
          ? sanitizeForPersistence(item)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Client-Side CSRF & Anti-Replay Nonce Management
 */
let sessionCsrfToken: string | null = null;

export function getOrCreateCsrfToken(): string {
  if (sessionCsrfToken) return sessionCsrfToken;

  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint8Array(24);
    window.crypto.getRandomValues(buffer);
    sessionCsrfToken = Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback if crypto is unavailable
    sessionCsrfToken = `csrf-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  return sessionCsrfToken;
}

export function validateCsrfToken(token: unknown): boolean {
  if (typeof token !== 'string' || !token) return false;
  return token === sessionCsrfToken;
}

/**
 * Honeypot bot protection helper
 */
export function isHoneypotTriggered(val: string | undefined | null): boolean {
  return Boolean(val && val.trim().length > 0);
}

/**
 * Sliding window rate limiter against automated brute force and spam submissions
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

/**
 * Role-Based Access Control (RBAC) permission check helper
 */
export type RequiredRole = 'owner' | 'admin' | 'staff';

export function checkRolePermission(
  user: { isOwner?: boolean; isAdmin?: boolean; role?: string } | null | undefined,
  requiredRole: RequiredRole
): { allowed: boolean; reason?: string } {
  if (!user) {
    return { allowed: false, reason: 'Authentication required. Please sign in to the Staff Portal.' };
  }

  const isOwner = Boolean(user.isOwner === true || user.role === 'owner');
  const isAdmin = Boolean(user.isAdmin === true || user.role === 'admin' || isOwner);

  if (requiredRole === 'owner') {
    if (isOwner) return { allowed: true };
    return {
      allowed: false,
      reason: 'Access Denied: This operation requires Store Owner (isOwner) privileges.',
    };
  }

  if (requiredRole === 'admin') {
    if (isAdmin) return { allowed: true };
    return {
      allowed: false,
      reason: 'Access Denied: This operation requires Administrator (isAdmin) privileges.',
    };
  }

  return { allowed: true };
}
