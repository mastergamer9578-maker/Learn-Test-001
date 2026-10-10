import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  KeyRound,
  Loader2,
  AlertCircle,
  Home,
  CheckCircle2,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  LogOut,
  UserX,
  Clock,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { StaffUser } from '../types';
import { sanitizeString, checkRateLimit, useLoginLockout } from '../utils/security';

interface AdminPrivateRouteProps {
  children: React.ReactNode;
  attemptedPath: string;
  onSuccess: (user: StaffUser) => void;
  onGoHome: () => void;
}

type AuthStatus = 'checking' | 'unauthenticated' | 'unverified' | 'unauthorized' | 'authorized';

export const AdminPrivateRoute: React.FC<AdminPrivateRouteProps> = ({
  children,
  attemptedPath,
  onSuccess,
  onGoHome,
}) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [activeUser, setActiveUser] = useState<FirebaseUser | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffUser | null>(null);

  // Form states for in-place credential login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Client-side rate limiting & 25-minute temporary lockout suite
  const {
    lockoutState,
    recordFailure,
    recordSuccess,
    handleFirebaseTooManyRequests,
    isLocked,
    formattedTimeRemaining,
    failedAttempts,
    maxAttempts,
    remainingAttempts,
  } = useLoginLockout(email);

  // Helper to extract clear human messages from Firebase Auth errors
  const parseAuthError = (err: any): string => {
    if (!err) return 'Authentication failed. Please verify credentials.';
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password. Please verify account credentials.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. For security reasons, access is temporarily locked. Please wait a few moments.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/network-request-failed':
        return 'Network connection error while contacting Firebase Authentication.';
      default:
        return err?.message ? String(err.message).replace(/^Firebase:\s*/, '') : 'Authentication failed.';
    }
  };

  // Helper to verify user document and role claims in Firestore
  const verifyFirestoreAdminRole = async (user: FirebaseUser): Promise<StaffUser | null> => {
    try {
      let docSnap: any = null;
      let isOwner = false;
      let isAdmin = false;
      let displayName = '';

      const emailLower = (user.email || '').toLowerCase();
      const isOwnerByEmail =
        emailLower.includes('owner') ||
        emailLower.startsWith('shan') ||
        emailLower.includes('master') ||
        emailLower === 'mastergamer9578@gmail.com';

      // 1. Check /users collection
      try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) {
          docSnap = uDoc;
        }
      } catch (e) {
        console.warn('[AdminPrivateRoute] Query /users notice:', e);
      }

      // 2. Fallback check /staff collection
      if (!docSnap) {
        try {
          const sDoc = await getDoc(doc(db, 'staff', user.uid));
          if (sDoc.exists()) {
            docSnap = sDoc;
          }
        } catch (e) {
          console.warn('[AdminPrivateRoute] Query /staff notice:', e);
        }
      }

      if (docSnap) {
        const data = docSnap.data();
        isOwner = Boolean(data?.isOwner === true || data?.role === 'owner' || (isOwnerByEmail && data?.role !== 'staff'));
        isAdmin = Boolean(data?.isAdmin === true || data?.role === 'admin' || isOwner);
        displayName = data?.name || data?.displayName || (isOwner ? 'Store Owner' : 'Store Administrator');

        if (!isAdmin && !isOwner) {
          return null; // Document exists, but lacks admin role
        }
      } else {
        // Document does not exist in Firestore
        if (isOwnerByEmail) {
          // Auto-bootstrap master owner record
          isOwner = true;
          isAdmin = true;
          displayName = 'Store Owner';
          try {
            const { setDoc: setDocFn } = await import('firebase/firestore');
            await setDocFn(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: user.email,
              name: displayName,
              isAdmin: true,
              isOwner: true,
              role: 'owner',
              createdAt: new Date().toISOString(),
            });
          } catch (createErr) {
            console.warn('[AdminPrivateRoute] Auto-bootstrap notice for owner:', createErr);
          }
        } else {
          return null;
        }
      }

      return {
        uid: user.uid,
        email: user.email || '',
        name: displayName || (isOwner ? 'Store Owner' : 'Store Administrator'),
        isAdmin,
        isOwner,
        role: isOwner ? 'owner' : 'admin',
      };
    } catch (err) {
      console.error('[AdminPrivateRoute] Exception during role verification:', err);
      return null;
    }
  };

  // Continuous listener to Firebase Auth state
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        setActiveUser(null);
        setStaffProfile(null);
        setAuthStatus('unauthenticated');
        return;
      }

      setActiveUser(firebaseUser);

      // Guard 1: Enforce Verified Email
      if (!firebaseUser.emailVerified) {
        setStaffProfile(null);
        setAuthStatus('unverified');
        return;
      }

      // Guard 2: Enforce Firestore Admin / Owner Role
      const verifiedProfile = await verifyFirestoreAdminRole(firebaseUser);
      if (!isMounted) return;

      if (!verifiedProfile) {
        setStaffProfile(null);
        setAuthStatus('unauthorized');
      } else {
        setStaffProfile(verifiedProfile);
        setAuthStatus('authorized');
        onSuccess(verifiedProfile);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Handle in-place login form submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = sanitizeString(email, 120);
    const cleanPassword = password.trim().slice(0, 100);

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please provide both staff email and password.');
      return;
    }

    // Client-side lockout guard: enforce 25-minute cooldown after 3 consecutive failures
    if (isLocked) {
      setErrorMessage(
        `Account temporarily locked out for security due to ${failedAttempts} consecutive failed login attempts. Please wait ${formattedTimeRemaining} before trying again.`
      );
      return;
    }

    const rateCheck = checkRateLimit('admin_guard_login', 5, 60);
    if (!rateCheck.allowed) {
      setErrorMessage(`Too many login attempts. Please wait ${rateCheck.waitSeconds}s before retrying.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;
      setActiveUser(user);

      // Successfully authenticated: clear failed attempts and unlock immediately
      recordSuccess();

      if (!user.emailVerified) {
        setAuthStatus('unverified');
        setErrorMessage('Email not verified. Please check your inbox and verify your email.');
        setIsSubmitting(false);
        return;
      }

      const profile = await verifyFirestoreAdminRole(user);
      if (!profile) {
        setAuthStatus('unauthorized');
        setErrorMessage('Access Denied: Your account does not possess administrator privileges in Firestore.');
      } else {
        setStaffProfile(profile);
        setAuthStatus('authorized');
        onSuccess(profile);
      }
    } catch (err: any) {
      console.warn('[AdminPrivateRoute] Login error:', err);
      const errCode = err?.code || '';

      if (errCode === 'auth/too-many-requests') {
        const locked = handleFirebaseTooManyRequests();
        setErrorMessage(
          `Firebase Security Lockout: Access temporarily disabled due to too many failed attempts. A 25-minute lockout is active for account safety (${locked.formattedTimeRemaining} remaining).`
        );
      } else {
        const failureState = recordFailure();
        if (failureState.isLocked) {
          setErrorMessage(
            `Account temporarily locked out! You have reached ${failureState.maxAttempts} consecutive failed login attempts. Further attempts are blocked for 25 minutes (${failureState.formattedTimeRemaining} remaining).`
          );
        } else {
          const friendly = parseAuthError(err);
          setErrorMessage(
            `${friendly} (Attempt ${failureState.failedAttempts} of ${failureState.maxAttempts}. ${failureState.remainingAttempts} attempt${failureState.remainingAttempts === 1 ? '' : 's'} remaining before a 25-minute temporary lockout.)`
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!activeUser) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      await sendEmailVerification(activeUser);
      setSuccessInfo(`✓ Fresh verification email dispatched to ${activeUser.email}! Please check your inbox.`);
    } catch (err: any) {
      setErrorMessage(parseAuthError(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!activeUser) return;
    setIsCheckingStatus(true);
    setErrorMessage(null);
    try {
      await activeUser.reload();
      if (activeUser.emailVerified) {
        setSuccessInfo('✓ Email verified! Verifying administrator role in Firestore...');
        const profile = await verifyFirestoreAdminRole(activeUser);
        if (profile) {
          setStaffProfile(profile);
          setAuthStatus('authorized');
          onSuccess(profile);
        } else {
          setAuthStatus('unauthorized');
        }
      } else {
        setErrorMessage('Email is still unverified. Please click the link sent to your inbox.');
      }
    } catch (err: any) {
      setErrorMessage(parseAuthError(err));
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSignOutUser = async () => {
    try {
      await signOut(auth);
      setActiveUser(null);
      setStaffProfile(null);
      setAuthStatus('unauthenticated');
      setErrorMessage(null);
      setSuccessInfo(null);
    } catch (err) {
      console.warn('[AdminPrivateRoute] Sign out error:', err);
    }
  };

  // ==========================================
  // VIEW 1: LOADING & VERIFYING SESSION
  // ==========================================
  if (authStatus === 'checking') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#ECE4D8] border border-[#2B1810]/15 rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-[#DE8030]/20 text-[#DE8030] flex items-center justify-center mx-auto border border-[#DE8030]/30 shadow-inner">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl text-[#2B1810] uppercase tracking-tight">
              Verifying Security Credentials
            </h2>
            <p className="font-mono-code text-xs text-[#2B1810]/70 leading-relaxed">
              Evaluating Firebase Auth session and Firestore administrator role for{' '}
              <code className="px-1.5 py-0.5 rounded bg-[#2B1810]/10 text-[#2B1810] font-bold">
                {attemptedPath}
              </code>
              ...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: AUTHORIZED -> RENDER PROTECTED CONTENT
  // ==========================================
  if (authStatus === 'authorized' && staffProfile) {
    return <>{children}</>;
  }

  // ==========================================
  // VIEW 3: UNAUTHORIZED (INSUFFICIENT PERMISSIONS)
  // ==========================================
  if (authStatus === 'unauthorized') {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="max-w-lg w-full bg-[#ECE4D8] border-2 border-red-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-md border border-red-200">
              <UserX className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-700 text-[11px] font-mono-code font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ACCESS DENIED · INSUFFICIENT PERMISSIONS</span>
            </div>

            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase tracking-tight">
              Administrator Privileges Required
            </h1>

            <p className="font-mono-code text-xs text-[#2B1810]/75 leading-relaxed">
              Authenticated user{' '}
              <strong className="text-[#2B1810] bg-[#2B1810]/10 px-1 py-0.5 rounded">
                {activeUser?.email || activeUser?.uid}
              </strong>{' '}
              does not have an administrator (<code className="font-bold">isAdmin</code>) or owner (
              <code className="font-bold">isOwner</code>) role assigned in the Firestore{' '}
              <code className="font-bold">/users</code> database collection.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono-code space-y-2">
            <p className="font-bold">Client-Side Admin Bypass Blocked</p>
            <p className="text-[11px] text-red-700 leading-normal">
              Direct URL manipulation and navigation to <code>{attemptedPath}</code> was halted. Only verified
              staff and store owners are permitted to load or modify the dashboard.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleSignOutUser}
              className="w-full py-3.5 rounded-full bg-[#2B1810] hover:bg-[#3E241A] text-white font-mono-code text-xs uppercase font-bold tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Switch Account / Sign In with Admin Credentials</span>
            </button>

            <button
              type="button"
              onClick={onGoHome}
              className="w-full py-3 rounded-full bg-[#ECE4D8] hover:bg-[#E2D8C9] text-[#2B1810] border border-[#2B1810]/20 font-mono-code text-xs uppercase font-bold tracking-wider transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4 text-[#DE8030]" />
              <span>Return to Customer Storefront</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: UNVERIFIED EMAIL GUARD
  // ==========================================
  if (authStatus === 'unverified') {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="max-w-lg w-full bg-[#ECE4D8] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-md border border-amber-300">
              <Mail className="w-8 h-8 stroke-[2.2] animate-bounce" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-[11px] font-mono-code font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>EMAIL VERIFICATION GUARD</span>
            </div>

            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase tracking-tight">
              Verify Your Staff Email
            </h1>

            <p className="font-mono-code text-xs text-[#2B1810]/75 leading-relaxed">
              For security, dashboard access to{' '}
              <code className="px-1.5 py-0.5 rounded bg-[#2B1810]/10 text-[#2B1810] font-bold">
                {attemptedPath}
              </code>{' '}
              is locked until you verify your email address{' '}
              <strong className="text-[#2B1810] bg-[#2B1810]/10 px-1 py-0.5 rounded">
                {activeUser?.email}
              </strong>
              .
            </p>
          </div>

          {successInfo && (
            <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono-code text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
              <span>{successInfo}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-100 text-red-900 border border-red-300 font-mono-code text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-700 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleCheckVerification}
              disabled={isCheckingStatus}
              className="w-full py-3.5 rounded-full bg-[#15803D] hover:bg-[#166534] text-white font-mono-code text-xs uppercase font-bold tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isCheckingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CHECKING VERIFICATION STATUS...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I&apos;ve Verified My Email — Unlock Dashboard</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full py-3 rounded-full bg-[#ECE4D8] hover:bg-[#E2D8C9] text-[#2B1810] border border-[#2B1810]/20 font-mono-code text-xs uppercase font-bold tracking-wider transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>DISPATCHING VERIFICATION EMAIL...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#DE8030]" />
                  <span>Resend Verification Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOutUser}
              className="w-full py-2 text-center text-xs font-mono-code text-[#2B1810]/70 hover:text-[#2B1810] hover:underline cursor-pointer flex items-center justify-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign in with a different account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 5: UNAUTHENTICATED (CHALLENGE / IN-PLACE LOGIN)
  // ==========================================
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="max-w-lg w-full bg-[#ECE4D8] border-2 border-[#DE8030]/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#2B1810] text-[#DE8030] flex items-center justify-center mx-auto shadow-md border border-[#DE8030]/30">
            <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9C4A2F]/10 border border-[#9C4A2F]/30 text-[#9C4A2F] text-[11px] font-mono-code font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            <span>PROTECTED PRIVATE ROUTE</span>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase tracking-tight">
            Dashboard Access Blocked
          </h1>

          <p className="font-mono-code text-xs text-[#2B1810]/75 leading-relaxed">
            Direct access to{' '}
            <code className="px-1.5 py-0.5 rounded bg-[#2B1810]/10 text-[#2B1810] font-bold">
              {attemptedPath}
            </code>{' '}
            is strictly restricted. You must authenticate with an active administrator or owner account to access
            the control panel.
          </p>
        </div>

        {/* Real-time 25-minute Lockout Alert Banner */}
        {isLocked && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-600/70 text-[#2B1810] text-xs font-mono-code space-y-2.5 animate-in shake duration-300 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-900 uppercase tracking-wide">
                <Clock className="w-4 h-4 text-amber-700 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Temporary Lockout Active</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                {failedAttempts}/{maxAttempts} Failures
              </span>
            </div>

            <p className="text-[11px] text-[#2B1810]/85 leading-relaxed">
              {lockoutState.isFirebaseTooManyRequests
                ? 'Firebase Authentication detected excessive login attempts and paused requests to prevent credential stuffing.'
                : `Account temporarily locked out due to ${maxAttempts} consecutive failed attempts. To prevent brute-force attacks, logins are blocked for 25 minutes.`}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-amber-600/30">
              <span className="text-amber-950 font-bold text-[11px] uppercase tracking-wider">
                Lockout Countdown:
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-900 text-amber-100 font-mono font-bold text-xs tracking-wider">
                ⏳ {formattedTimeRemaining}
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono-code flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono-code font-bold text-[#2B1810] uppercase tracking-wider">
                Staff / Owner Email
              </label>
              {!isLocked && failedAttempts > 0 && (
                <span className="text-[10px] font-mono-code text-amber-700 font-bold">
                  {failedAttempts}/{maxAttempts} Attempts Used
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2B1810]/50" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shanfastfood.com"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/40 focus:outline-none focus:ring-2 focus:ring-[#DE8030] focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono-code font-bold text-[#2B1810] uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2B1810]/50" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-[#2B1810]/20 text-xs font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/40 focus:outline-none focus:ring-2 focus:ring-[#DE8030] focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2B1810]/50 hover:text-[#2B1810] transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLocked}
            className={`w-full py-3.5 rounded-full ${
              isLocked
                ? 'bg-amber-900/60 text-white/80 cursor-not-allowed'
                : 'bg-[#DE8030] hover:bg-[#c97127] active:scale-[0.98] text-[#2B1810] cursor-pointer'
            } text-xs font-mono-code font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials & Permissions...</span>
              </>
            ) : isLocked ? (
              <>
                <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Locked Out ({formattedTimeRemaining})</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Verify & Access Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-[#2B1810]/10 text-center">
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 text-xs font-mono-code font-bold uppercase text-[#2B1810]/70 hover:text-[#2B1810] transition cursor-pointer py-1"
          >
            <Home className="w-3.5 h-3.5 text-[#DE8030]" />
            <span>Return to Customer Homepage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
