import React, { useState } from 'react';
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

interface ProtectedAuthGuardProps {
  attemptedPath: string;
  isAuthChecking: boolean;
  onSuccess: (user: StaffUser) => void;
  onGoHome: () => void;
}

export const ProtectedAuthGuard: React.FC<ProtectedAuthGuardProps> = ({
  attemptedPath,
  isAuthChecking,
  onSuccess,
  onGoHome,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<FirebaseUser | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>('');

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

  const getFriendlyErrorMessage = (authErr: any): string => {
    if (!authErr) return 'Authentication failed. Please verify credentials.';
    const code = authErr?.code || '';
    const rawMsg = authErr?.message || '';

    switch (code) {
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please verify your credentials.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please verify the password for this account.';
      case 'auth/user-not-found':
        return 'No user found with this email in Firebase Authentication.';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in method is disabled in the Firebase Console.';
      case 'auth/invalid-email':
        return 'Invalid email format. Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Access temporarily blocked due to too many failed attempts. Please wait a few minutes.';
      case 'auth/network-request-failed':
        return 'Network connection error while contacting Firebase Authentication.';
      default:
        if (rawMsg) {
          return `Authentication notice: ${rawMsg.replace(/^Firebase:\s*/, '')}`;
        }
        return 'Authentication failed. Please check your credentials.';
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = sanitizeString(email, 120);
    const cleanPassword = password.trim().slice(0, 100);

    if (!cleanEmail || !cleanPassword) {
      setError('Please provide both email and password.');
      return;
    }

    // Rate limiting: 5 attempts per 60 seconds
    const rateCheck = checkRateLimit('protected_guard_login', 5, 60);
    if (!rateCheck.allowed) {
      setError(
        `Too many login attempts. For security reasons, please wait ${rateCheck.waitSeconds} seconds before trying again.`
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;

      // 1. Email Verification Security Requirement
      if (!user.emailVerified) {
        setUnverifiedUser(user);
        setUnverifiedEmail(cleanEmail);
        setIsLoading(false);
        setError(
          'Email not verified! Security policy requires verifying your email before dashboard access is unlocked.'
        );
        return;
      }

      // 2. Role Verification in Firestore
      let userDocSnap: any = null;
      let isOwner = false;
      let isAdmin = false;
      let displayName = '';

      const emailLower = (user.email || cleanEmail).toLowerCase();
      const isOwnerByEmail =
        emailLower.includes('owner') || emailLower.startsWith('shan') || emailLower.includes('master');

      try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) {
          userDocSnap = uDoc;
        }
      } catch (err) {
        console.warn('[ProtectedGuard] Read /users notice:', err);
      }

      if (!userDocSnap) {
        try {
          const sDoc = await getDoc(doc(db, 'staff', user.uid));
          if (sDoc.exists()) {
            userDocSnap = sDoc;
          }
        } catch (err) {
          console.warn('[ProtectedGuard] Read /staff notice:', err);
        }
      }

      if (userDocSnap) {
        const uData = userDocSnap.data();
        isAdmin = Boolean(uData?.isAdmin === true || uData?.role === 'admin' || uData?.role === 'owner');
        isOwner = Boolean(uData?.isOwner === true || uData?.role === 'owner');
        displayName = uData?.name || uData?.displayName || (isOwner ? 'Store Owner' : 'Store Administrator');

        if (!isAdmin && !isOwner) {
          await signOut(auth);
          setError(
            'Access Denied: Your account does not have staff or administrator privileges assigned.'
          );
          setIsLoading(false);
          return;
        }
      } else {
        if (isOwnerByEmail) {
          isOwner = true;
          isAdmin = true;
          displayName = 'Store Owner';
          try {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: user.email || cleanEmail,
              name: displayName,
              isAdmin: true,
              isOwner: true,
              role: 'owner',
              createdAt: new Date().toISOString(),
            });
          } catch (createErr) {
            console.warn('[ProtectedGuard] Bootstrap notice for owner:', createErr);
          }
        } else {
          await signOut(auth);
          setError(
            `Access Denied: No staff profile found in Firestore for UID '${user.uid}'. Please contact the store owner.`
          );
          setIsLoading(false);
          return;
        }
      }

      const authenticatedUser: StaffUser = {
        uid: user.uid,
        email: user.email || cleanEmail,
        name: displayName || (isOwner ? 'Store Owner' : 'Store Administrator'),
        isAdmin,
        isOwner,
        role: isOwner ? 'owner' : 'admin',
      };

      onSuccess(authenticatedUser);
    } catch (err: any) {
      console.error('[ProtectedGuard] Auth error:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser && auth.currentUser) {
      setUnverifiedUser(auth.currentUser);
    }
    const targetUser = unverifiedUser || auth.currentUser;
    if (!targetUser) {
      setError('Cannot resend verification: No active user session.');
      return;
    }

    setIsResending(true);
    setError(null);
    try {
      await sendEmailVerification(targetUser);
      setSuccessInfo(
        `Verification email sent to ${targetUser.email || unverifiedEmail}. Please check your inbox and spam folder.`
      );
    } catch (resendErr: any) {
      console.error('[ProtectedGuard] Resend error:', resendErr);
      setError(`Failed to resend verification link: ${resendErr?.message || 'Please try again later.'}`);
    } finally {
      setIsResending(false);
    }
  };

  // 1. Initial Firebase Auth Verification Screen
  if (isAuthChecking) {
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
              Evaluating Firebase Auth session state for protected route{' '}
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

  // 2. Strict Authentication Guard Screen (Blocks access and prompts for credentials)
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="max-w-lg w-full bg-[#ECE4D8] border-2 border-[#DE8030]/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Header with Security Badge */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#2B1810] text-[#DE8030] flex items-center justify-center mx-auto shadow-md border border-[#DE8030]/30">
            <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9C4A2F]/10 border border-[#9C4A2F]/30 text-[#9C4A2F] text-[11px] font-mono-code font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            <span>PROTECTED ROUTE · AUTH REQUIRED</span>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] uppercase tracking-tight">
            Dashboard Access Blocked
          </h1>

          <p className="font-mono-code text-xs text-[#2B1810]/75 leading-relaxed">
            The destination URL{' '}
            <code className="px-1.5 py-0.5 rounded bg-[#2B1810]/10 text-[#2B1810] font-bold">
              {attemptedPath}
            </code>{' '}
            is strictly restricted. Please authenticate with your staff or administrator account to continue.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono-code flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p>{error}</p>
              {unverifiedUser && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition cursor-pointer text-[11px]"
                >
                  {isResending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Resend Verification Email</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success notification */}
        {successInfo && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono-code flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="flex-1">{successInfo}</p>
          </div>
        )}

        {/* In-Place Login Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono-code font-bold text-[#2B1810] uppercase tracking-wider">
              Staff / Owner Email
            </label>
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
            disabled={isLoading}
            className="w-full py-3.5 rounded-full bg-[#DE8030] hover:bg-[#c97127] active:scale-[0.98] text-[#2B1810] text-xs font-mono-code font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Firebase Auth...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Verify & Access Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Safe Escape to Homepage */}
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
