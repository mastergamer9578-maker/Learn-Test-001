import { useState, useEffect, useCallback } from 'react';

/**
 * Client-Side Rate Limiting & Temporary Lockout Protection Suite
 *
 * Implements:
 * 1. Tracking failed login attempts in localStorage/sessionStorage per email/session.
 * 2. 3 consecutive failed attempts threshold triggering a 25-minute temporary lockout.
 * 3. Real-time countdown timer preventing brute-force submissions.
 * 4. Graceful handling and dedicated lockout for Firebase Auth 'auth/too-many-requests' errors.
 */

export const MAX_FAILED_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MINUTES = 25;
export const LOCKOUT_DURATION_MS = LOCKOUT_DURATION_MINUTES * 60 * 1000; // 25 minutes = 1,500,000 ms

const STORAGE_PREFIX = 'shan_auth_lockout_';
const GLOBAL_SESSION_KEY = 'shan_auth_global_session_lockout';

export interface StoredLockoutRecord {
  identifier: string;
  failedAttempts: number;
  lockedUntil: number | null; // timestamp in ms
  lastAttemptAt: number;
  reason?: string;
}

export interface LoginLockoutState {
  identifier: string;
  failedAttempts: number;
  maxAttempts: number;
  remainingAttempts: number;
  isLocked: boolean;
  lockedUntil: number | null;
  remainingLockoutMs: number;
  remainingSeconds: number;
  remainingMinutes: number;
  formattedTimeRemaining: string;
  isFirebaseTooManyRequests: boolean;
  warningMessage: string | null;
}

// In-memory fallback in case localStorage / sessionStorage is blocked (private browsing / strict sandboxes)
const memoryStore = new Map<string, StoredLockoutRecord>();

/**
 * Normalizes email or identifier for consistent lookup
 */
export function normalizeIdentifier(identifier: string): string {
  if (!identifier) return 'anonymous_session';
  return identifier.trim().toLowerCase().slice(0, 150);
}

/**
 * Safe storage reader with fallback
 */
function readStorage(key: string): StoredLockoutRecord | null {
  if (typeof window === 'undefined') return memoryStore.get(key) || null;

  try {
    const raw = window.localStorage.getItem(key) || window.sessionStorage?.getItem(key);
    if (raw) {
      return JSON.parse(raw) as StoredLockoutRecord;
    }
  } catch {
    // Storage access restricted; fallback to memory
    return memoryStore.get(key) || null;
  }
  return memoryStore.get(key) || null;
}

/**
 * Safe storage writer with dual persistence (localStorage + sessionStorage)
 */
function writeStorage(key: string, record: StoredLockoutRecord | null): void {
  if (record) {
    memoryStore.set(key, record);
  } else {
    memoryStore.delete(key);
  }

  if (typeof window === 'undefined') return;

  try {
    if (record) {
      const serialized = JSON.stringify(record);
      window.localStorage.setItem(key, serialized);
      try {
        window.sessionStorage?.setItem(key, serialized);
      } catch {}
    } else {
      window.localStorage.removeItem(key);
      try {
        window.sessionStorage?.removeItem(key);
      } catch {}
    }
  } catch (err) {
    console.warn('[Lockout] Notice persisting to web storage:', err);
  }
}

/**
 * Formats milliseconds into human-readable format e.g. "24m 45s" or "32s"
 */
export function formatLockoutDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

/**
 * Evaluates current lockout state for a given email or identifier
 */
export function getLoginLockoutState(identifier: string): LoginLockoutState {
  const norm = normalizeIdentifier(identifier);
  const key = `${STORAGE_PREFIX}${norm}`;
  const record = readStorage(key);
  const now = Date.now();

  let failedAttempts = record?.failedAttempts || 0;
  let lockedUntil = record?.lockedUntil || null;
  const isFirebaseTooManyRequests = Boolean(record?.reason === 'auth/too-many-requests');

  // Check if active lockout has expired
  if (lockedUntil !== null && now >= lockedUntil) {
    // Lockout period has elapsed! Reset the failed counter to give the user a fresh chance
    failedAttempts = 0;
    lockedUntil = null;
    writeStorage(key, null);
  }

  const isLocked = Boolean(lockedUntil && now < lockedUntil);
  const remainingLockoutMs = isLocked && lockedUntil ? Math.max(0, lockedUntil - now) : 0;
  const remainingSeconds = Math.ceil(remainingLockoutMs / 1000);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const formattedTimeRemaining = isLocked ? formatLockoutDuration(remainingLockoutMs) : '0s';
  const remainingAttempts = isLocked ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);

  let warningMessage: string | null = null;
  if (isLocked) {
    if (isFirebaseTooManyRequests) {
      warningMessage = `Firebase Security: Access temporarily disabled due to too many failed attempts. Temporary lockout active for ${formattedTimeRemaining}.`;
    } else {
      warningMessage = `Account temporarily locked out due to ${MAX_FAILED_ATTEMPTS} consecutive failed login attempts. Please wait ${formattedTimeRemaining} before trying again.`;
    }
  } else if (failedAttempts > 0) {
    const attemptsLeft = MAX_FAILED_ATTEMPTS - failedAttempts;
    if (attemptsLeft === 1) {
      warningMessage = `Warning: 1 attempt remaining before a ${LOCKOUT_DURATION_MINUTES}-minute temporary lockout is enforced.`;
    } else if (attemptsLeft > 1) {
      warningMessage = `Notice: ${failedAttempts} of ${MAX_FAILED_ATTEMPTS} failed attempts. Access will be locked for ${LOCKOUT_DURATION_MINUTES} minutes after 3 failures.`;
    }
  }

  return {
    identifier: norm,
    failedAttempts,
    maxAttempts: MAX_FAILED_ATTEMPTS,
    remainingAttempts,
    isLocked,
    lockedUntil,
    remainingLockoutMs,
    remainingSeconds,
    remainingMinutes,
    formattedTimeRemaining,
    isFirebaseTooManyRequests,
    warningMessage,
  };
}

/**
 * Records a failed login attempt for the specified email/identifier.
 * If 3 failed attempts are reached, enforces a 25-minute temporary lockout.
 */
export function recordFailedLoginAttempt(
  identifier: string,
  options?: {
    isFirebaseTooManyRequests?: boolean;
    customLockoutMs?: number;
    reason?: string;
  }
): LoginLockoutState {
  const norm = normalizeIdentifier(identifier);
  const key = `${STORAGE_PREFIX}${norm}`;
  const record = readStorage(key);
  const now = Date.now();

  let attempts = (record?.failedAttempts || 0) + 1;
  let lockedUntil: number | null = record?.lockedUntil || null;
  let reason = options?.reason || record?.reason || 'failed_credentials';

  if (options?.isFirebaseTooManyRequests) {
    attempts = Math.max(attempts, MAX_FAILED_ATTEMPTS);
    lockedUntil = now + (options.customLockoutMs || LOCKOUT_DURATION_MS);
    reason = 'auth/too-many-requests';
  } else if (attempts >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = now + (options?.customLockoutMs || LOCKOUT_DURATION_MS);
    reason = 'consecutive_failures_exceeded';
  }

  const updatedRecord: StoredLockoutRecord = {
    identifier: norm,
    failedAttempts: attempts,
    lockedUntil,
    lastAttemptAt: now,
    reason,
  };

  writeStorage(key, updatedRecord);

  // Also update global session record to prevent automated bot rotation across accounts
  const globalRecord = readStorage(GLOBAL_SESSION_KEY);
  const globalAttempts = (globalRecord?.failedAttempts || 0) + 1;
  const globalLockedUntil =
    globalAttempts >= 10 ? now + LOCKOUT_DURATION_MS : globalRecord?.lockedUntil || null;
  writeStorage(GLOBAL_SESSION_KEY, {
    identifier: 'global_session',
    failedAttempts: globalAttempts,
    lockedUntil: globalLockedUntil,
    lastAttemptAt: now,
  });

  return getLoginLockoutState(identifier);
}

/**
 * Resets failed attempt counters and removes lockouts upon successful authentication
 */
export function recordSuccessfulLogin(identifier: string): void {
  const norm = normalizeIdentifier(identifier);
  const key = `${STORAGE_PREFIX}${norm}`;
  writeStorage(key, null);
  writeStorage(GLOBAL_SESSION_KEY, null);
}

/**
 * Explicit trigger for Firebase Auth 'auth/too-many-requests'
 */
export function triggerFirebaseLockout(
  identifier: string,
  durationMs: number = LOCKOUT_DURATION_MS
): LoginLockoutState {
  return recordFailedLoginAttempt(identifier, {
    isFirebaseTooManyRequests: true,
    customLockoutMs: durationMs,
    reason: 'auth/too-many-requests',
  });
}

/**
 * React Hook for real-time lockout management and reactive countdown ticking
 */
export function useLoginLockout(identifier: string) {
  const [lockoutState, setLockoutState] = useState<LoginLockoutState>(() =>
    getLoginLockoutState(identifier)
  );

  // Synchronize state when identifier changes
  useEffect(() => {
    setLockoutState(getLoginLockoutState(identifier));
  }, [identifier]);

  // Real-time ticking interval when locked out
  useEffect(() => {
    if (!lockoutState.isLocked) return;

    const interval = setInterval(() => {
      const current = getLoginLockoutState(identifier);
      setLockoutState(current);

      if (!current.isLocked) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [identifier, lockoutState.isLocked, lockoutState.lockedUntil]);

  const recordFailure = useCallback(
    (isTooManyRequests = false) => {
      const updated = recordFailedLoginAttempt(identifier, {
        isFirebaseTooManyRequests: isTooManyRequests,
      });
      setLockoutState(updated);
      return updated;
    },
    [identifier]
  );

  const recordSuccess = useCallback(() => {
    recordSuccessfulLogin(identifier);
    setLockoutState(getLoginLockoutState(identifier));
  }, [identifier]);

  const handleFirebaseTooManyRequests = useCallback(() => {
    const updated = triggerFirebaseLockout(identifier);
    setLockoutState(updated);
    return updated;
  }, [identifier]);

  const resetLockout = useCallback(() => {
    recordSuccessfulLogin(identifier);
    setLockoutState(getLoginLockoutState(identifier));
  }, [identifier]);

  return {
    lockoutState,
    recordFailure,
    recordSuccess,
    handleFirebaseTooManyRequests,
    resetLockout,
    isLocked: lockoutState.isLocked,
    remainingAttempts: lockoutState.remainingAttempts,
    failedAttempts: lockoutState.failedAttempts,
    formattedTimeRemaining: lockoutState.formattedTimeRemaining,
    warningMessage: lockoutState.warningMessage,
    maxAttempts: lockoutState.maxAttempts,
  };
}
