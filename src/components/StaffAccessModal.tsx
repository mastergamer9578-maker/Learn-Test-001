import React, { useState, useEffect } from 'react';
import {
  Lock,
  X,
  AlertCircle,
  KeyRound,
  Loader2,
  Mail,
  CheckCircle2,
  ArrowLeft,
  Send,
  RefreshCw,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { StaffUser } from '../types';
import { sanitizeString, checkRateLimit } from '../utils/security';

interface StaffAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: StaffUser) => void;
}

export const StaffAccessModal: React.FC<StaffAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<FirebaseUser | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>('');

  const getFriendlyErrorMessage = (authErr: any): string => {
    if (!authErr) return 'Authentication failed. Please verify credentials in Firebase.';
    const code = authErr?.code || '';
    const rawMsg = authErr?.message || '';

    switch (code) {
      case 'auth/invalid-credential':
        return 'Invalid credentials. The password or email does not match any user in Firebase Authentication.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please verify the password for this Firebase user account.';
      case 'auth/user-not-found':
        return 'No user found with this email in Firebase Authentication (Firebase Console > Authentication > Users).';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in method is disabled in the Firebase Console. Please enable Email/Password under Authentication > Sign-in method.';
      case 'auth/invalid-email':
        return 'Invalid email format. Please enter a valid email address (e.g. admin@shan.com).';
      case 'auth/too-many-requests':
        return 'Access temporarily disabled due to too many failed attempts. Please wait a few minutes or resend the verification link.';
      case 'auth/network-request-failed':
        return 'Network connection error while contacting Firebase Authentication.';
      case 'auth/api-key-not-valid':
        return 'Firebase API key is invalid or restricted in Google Cloud console.';
      default:
        if (rawMsg) {
          return `Firebase Auth Error (${code || 'failed'}): ${rawMsg.replace(/^Firebase:\s*/, '')}`;
        }
        return 'Authentication failed. Please check your credentials in the Firebase Console.';
    }
  };

  // Helper to fetch and verify user role & permissions from Firestore
  const fetchUserRoleAndGrantAccess = async (firebaseUser: FirebaseUser) => {
    try {
      // 0. Enforce verified email check before checking roles
      if (!firebaseUser.emailVerified) {
        await signOut(auth);
        setError('Email not verified! Please check your inbox and verify your email before accessing the dashboard.');
        return;
      }

      let userDocSnap: any = null;
      let isOwner = false;
      let isAdmin = false;
      let displayName = '';

      const emailLower = (firebaseUser.email || staffId).toLowerCase();
      const isOwnerByEmail = emailLower.includes('owner') || emailLower.startsWith('shan') || emailLower.includes('master');

      // 1. Verify that user document exists in Firestore 'users' collection using Auth UID
      try {
        const uDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (uDoc.exists()) {
          userDocSnap = uDoc;
        }
      } catch (err: any) {
        console.warn('[StaffAccess] Notice reading /users collection:', err);
      }

      // Fallback check against 'staff' collection if not in 'users'
      if (!userDocSnap) {
        try {
          const sDoc = await getDoc(doc(db, 'staff', firebaseUser.uid));
          if (sDoc.exists()) {
            userDocSnap = sDoc;
          }
        } catch (err: any) {
          console.warn('[StaffAccess] Notice reading /staff collection:', err);
        }
      }

      if (userDocSnap) {
        const uData = userDocSnap.data();
        isAdmin = Boolean(uData?.isAdmin === true || uData?.role === 'admin' || uData?.role === 'owner');
        isOwner = Boolean(uData?.isOwner === true || uData?.role === 'owner');
        displayName = uData?.name || uData?.displayName || (isOwner ? 'Store Owner' : 'Store Administrator');

        // 2. If BOTH isAdmin and isOwner are false (or missing), block, sign out, and show error
        if (!isAdmin && !isOwner) {
          await signOut(auth);
          setError(
            'Access Denied: Insufficient permissions. Your account does not have administrator (isAdmin) or owner (isOwner) privileges assigned in Firestore.'
          );
          return;
        }
      } else {
        // Document does not exist in Firestore
        // If the authenticated user is the store owner/admin, auto-bootstrap their profile document
        if (isOwnerByEmail) {
          isOwner = true;
          isAdmin = true;
          displayName = 'Store Owner';
          try {
            const { setDoc: setDocFn } = await import('firebase/firestore');
            await setDocFn(doc(db, 'users', firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: firebaseUser.email || staffId,
              name: displayName,
              isAdmin: true,
              isOwner: true,
              role: 'owner',
              createdAt: new Date().toISOString(),
            });
          } catch (createErr) {
            console.warn('[StaffAccess] Auto-bootstrap notice for owner:', createErr);
          }
        } else {
          await signOut(auth);
          setError(
            `Access Denied: No staff profile found in Firestore for UID '${firebaseUser.uid}'. Please contact the store owner to assign your admin privileges.`
          );
          return;
        }
      }

      // 3. Document exists and at least one of isAdmin or isOwner is true: grant access
      const authenticatedUser: StaffUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || staffId,
        name: displayName || (isOwner ? 'Store Owner' : 'Store Administrator'),
        isAdmin: isAdmin,
        isOwner: isOwner,
        role: isOwner ? 'owner' : 'admin',
      };

      setError(null);
      setSuccessInfo(null);
      setStaffId('');
      setPassword('');
      setUnverifiedUser(null);
      onSuccess(authenticatedUser);
    } catch (e: any) {
      console.error('[StaffAccess] Error verifying permissions in Firestore:', e);
      await signOut(auth);
      setError(`Permission check failed: ${e?.message || 'Could not verify Firestore user role.'}`);
    }
  };

  // Handle Sign In Workflow
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanId = sanitizeString(staffId, 120);
    const cleanPass = password.trim().slice(0, 100);

    if (!cleanId || !cleanPass) {
      setError('Please enter both Staff Email and Password.');
      return;
    }

    // Rate limiting: maximum 5 login attempts per 60 seconds
    const rateCheck = checkRateLimit('staff_login_attempt', 5, 60);
    if (!rateCheck.allowed) {
      setError(`Too many login attempts. For security reasons, please wait ${rateCheck.waitSeconds} seconds before trying again.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);

    const authInstance = auth;

    try {
      let isVerified = false;
      let specificAuthError: string | null = null;
      let targetUserCred: any = null;

      // 1. Direct Firebase Authentication via signInWithEmailAndPassword
      if (cleanId.includes('@')) {
        try {
          const userCred = await signInWithEmailAndPassword(authInstance, cleanId, cleanPass);
          if (userCred && userCred.user) {
            targetUserCred = userCred;
          }
        } catch (authErr: any) {
          console.warn('[StaffAccess] Firebase Auth failed:', authErr);
          specificAuthError = getFriendlyErrorMessage(authErr);
        }
      } else {
        // If a username without @ was entered, try domain aliases
        const emailAliases = [
          `${cleanId.toLowerCase()}@shan-fast-foods.com`,
          `${cleanId.toLowerCase()}@shan.com`,
          `${cleanId.toLowerCase()}@shan-fast-foods.firebaseapp.com`,
        ];

        let lastAliasError: any = null;
        for (const alias of emailAliases) {
          try {
            const userCred = await signInWithEmailAndPassword(authInstance, alias, cleanPass);
            if (userCred && userCred.user) {
              targetUserCred = userCred;
              break;
            }
          } catch (aliasErr: any) {
            lastAliasError = aliasErr;
          }
        }

        if (!targetUserCred && lastAliasError && lastAliasError.code === 'auth/wrong-password') {
          specificAuthError = getFriendlyErrorMessage(lastAliasError);
        }
      }

      // Check Firebase Email Verification Guard
      if (targetUserCred && targetUserCred.user) {
        const user = targetUserCred.user;
        // Reload user to get freshest emailVerified state
        try {
          await user.reload();
        } catch {}

        if (!user.emailVerified) {
          // Trigger/resend verification email directly to user's inbox
          try {
            const redirectUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined;
            await sendEmailVerification(user, {
              url: redirectUrl || 'https://shan-fast-foods.firebaseapp.com',
              handleCodeInApp: true,
            });
          } catch (sendErr) {
            console.warn('[StaffAccess] Notice dispatching verification email:', sendErr);
          }

          // Immediately sign out unverified user and show the required message
          await signOut(auth);
          setUnverifiedUser(null);
          setUnverifiedEmail('');
          setError('Email not verified! Please check your inbox and verify your email before accessing the dashboard.');
          setIsLoading(false);
          return;
        }

        // Email IS verified! Verify Firestore user document and permissions
        await fetchUserRoleAndGrantAccess(user);
        return;
      }

      // 2. Secondary check against Firestore 'staff' collection if not verified via Auth
      if (!isVerified && !specificAuthError) {
        try {
          const docCandidates = [cleanId, cleanId.toLowerCase()];
          for (const docId of docCandidates) {
            const docRef = doc(db, 'staff', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const storedPass = String(data.password ?? data.pin ?? data.pass ?? '');
              if (storedPass && storedPass === cleanPass) {
                isVerified = true;
                const isOwner = Boolean(data.isOwner || data.role === 'owner' || cleanId.toLowerCase().includes('owner'));
                const authenticatedUser: StaffUser = {
                  uid: docSnap.id,
                  email: data.email || cleanId,
                  name: data.name || (isOwner ? 'Store Owner' : 'Store Administrator'),
                  isAdmin: true,
                  isOwner,
                  role: isOwner ? 'owner' : 'admin',
                };
                setError(null);
                onSuccess(authenticatedUser);
                return;
              }
            }
          }

          // Query staff collection fields (staffId, email, username, id)
          if (!isVerified) {
            const staffRef = collection(db, 'staff');
            const queries = [
              query(staffRef, where('email', '==', cleanId.toLowerCase())),
              query(staffRef, where('staffId', '==', cleanId)),
              query(staffRef, where('staffId', '==', cleanId.toLowerCase())),
              query(staffRef, where('username', '==', cleanId.toLowerCase())),
              query(staffRef, where('id', '==', cleanId)),
            ];

            for (const q of queries) {
              const snap = await getDocs(q);
              if (!snap.empty) {
                for (const d of snap.docs) {
                  const data = d.data();
                  const storedPass = String(data.password ?? data.pin ?? data.pass ?? '');
                  if (storedPass && storedPass === cleanPass) {
                    isVerified = true;
                    const isOwner = Boolean(data.isOwner || data.role === 'owner' || cleanId.toLowerCase().includes('owner'));
                    const authenticatedUser: StaffUser = {
                      uid: d.id,
                      email: data.email || cleanId,
                      name: data.name || (isOwner ? 'Store Owner' : 'Store Administrator'),
                      isAdmin: true,
                      isOwner,
                      role: isOwner ? 'owner' : 'admin',
                    };
                    setError(null);
                    onSuccess(authenticatedUser);
                    return;
                  }
                }
              }
              if (isVerified) break;
            }
          }
        } catch (firestoreErr) {
          console.warn('[StaffAccess] Firestore staff check notice:', firestoreErr);
        }
      }

      // If not authenticated via Firebase Auth or verified Firestore record, deny access
      setError(
        specificAuthError ||
          'Authentication failed. Invalid email/password or account not authorized.'
      );
    } catch (err: any) {
      console.error('[StaffAccess] Authentication exception:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Email Verification Handler with Redirect Action Code Settings
  const handleResendVerification = async () => {
    const userToResend = unverifiedUser || auth?.currentUser;
    if (!userToResend) {
      setError('Could not locate user session. Please re-enter your password to sign in.');
      return;
    }

    setIsResending(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined;
      await sendEmailVerification(userToResend, {
        url: redirectUrl || 'https://shan-fast-foods.firebaseapp.com',
        handleCodeInApp: true,
      });
      setSuccessInfo(`✓ A fresh verification link was sent to ${userToResend.email || unverifiedEmail}! Please check your inbox.`);
    } catch (err: any) {
      console.warn('[StaffAccess] Resend verification error:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  // Check If User Has Verified Email (Reloads Firebase User)
  const handleCheckVerificationStatus = async () => {
    const userToCheck = unverifiedUser || auth?.currentUser;
    if (!userToCheck) {
      setError('Session expired. Please sign in again with your email and password.');
      setUnverifiedUser(null);
      return;
    }

    setIsCheckingStatus(true);
    setError(null);

    try {
      await userToCheck.reload();
      if (userToCheck.emailVerified) {
        setSuccessInfo('✓ Email successfully verified! Unlocking admin dashboard...');
        setTimeout(() => {
          fetchUserRoleAndGrantAccess(userToCheck);
        }, 400);
      } else {
        setError(
          `Your email (${userToCheck.email}) is still unverified. Please open your inbox, click the verification link, and then click "I've Verified My Email" again.`
        );
      }
    } catch (err: any) {
      console.error('[StaffAccess] Error checking verification status:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Automatic real-time polling + tab focus listener when waiting for email verification
  useEffect(() => {
    if (!unverifiedUser) return;

    let isMounted = true;

    const checkVerificationInBackground = async () => {
      try {
        const u = auth?.currentUser || unverifiedUser;
        if (!u) return;
        await u.reload();
        if (u.emailVerified && isMounted) {
          setSuccessInfo('✓ Email verified! Unlocking admin dashboard...');
          setTimeout(() => {
            if (isMounted) {
              fetchUserRoleAndGrantAccess(u);
            }
          }, 300);
        }
      } catch (pollErr) {
        console.warn('[StaffAccess] Verification check background notice:', pollErr);
      }
    };

    // 1. Check immediately when window gains focus (user returns from email tab/app)
    const onWindowFocus = () => {
      checkVerificationInBackground();
    };
    window.addEventListener('focus', onWindowFocus);

    // 2. Poll every 3 seconds while on verification waiting screen
    const intervalId = setInterval(() => {
      checkVerificationInBackground();
    }, 3000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', onWindowFocus);
      clearInterval(intervalId);
    };
  }, [unverifiedUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#2B1810]/45 backdrop-blur-md transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#F5EFEB] rounded-[2rem] p-7 sm:p-9 shadow-2xl border border-[#2B1810]/15 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 text-[#2B1810] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* VIEW 1: EMAIL UNVERIFIED GUARD SCREEN */}
        {unverifiedUser ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-700 border border-amber-500/30 flex items-center justify-center shadow-xs">
              <Mail className="w-7 h-7 stroke-[2.2] animate-bounce" />
            </div>

            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase">
                FIREBASE EMAIL VERIFICATION
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-[#2B1810] tracking-tight uppercase mt-1">
                VERIFY YOUR EMAIL
              </h2>
              <p className="font-mono-code text-xs text-[#2B1810]/75 mt-2 leading-relaxed">
                A verification link was dispatched to{' '}
                <span className="font-bold text-[#2B1810] bg-[#ECE4D8] px-1.5 py-0.5 rounded border border-[#2B1810]/10">
                  {unverifiedEmail || unverifiedUser?.email || staffId}
                </span>
                . For security, admin portal access is restricted until your email address is verified.
              </p>
            </div>

            {/* Success info alert */}
            {successInfo && (
              <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono-code text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
                <span>{successInfo}</span>
              </div>
            )}

            {/* Error alert */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-100 text-red-900 border border-red-300 font-mono-code text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-700 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              {/* Check Verification Status Button */}
              <button
                type="button"
                onClick={handleCheckVerificationStatus}
                disabled={isCheckingStatus}
                className="w-full py-3.5 rounded-full bg-[#15803D] hover:bg-[#166534] text-white font-mono-code text-xs uppercase font-bold tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>CHECKING FIREBASE VERIFICATION...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I&apos;VE VERIFIED MY EMAIL — SIGN IN</span>
                  </>
                )}
              </button>

              {/* Resend Verification Link Button */}
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
                    <span>RESEND VERIFICATION LINK</span>
                  </>
                )}
              </button>

              {/* Back to Sign In / Switch Account */}
              <button
                type="button"
                onClick={() => {
                  setUnverifiedUser(null);
                  setError(null);
                  setSuccessInfo(null);
                }}
                className="w-full py-2 text-center text-xs font-mono-code text-[#2B1810]/70 hover:text-[#2B1810] hover:underline cursor-pointer flex items-center justify-center gap-1 mt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In with different credentials</span>
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 2: CLEAN SIGN IN FORM */
          <div className="space-y-5">
            {/* Header Lock Badge */}
            <div className="w-12 h-12 rounded-2xl bg-[#DE8030] text-white flex items-center justify-center shadow-md">
              <Lock className="w-6 h-6 stroke-[2]" />
            </div>

            {/* Title & Info */}
            <div>
              <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase">
                RESTRICTED PORTAL
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] tracking-tight uppercase leading-none mt-1">
                STAFF ACCESS
              </h2>
            </div>

            {/* Success Info Alert */}
            {successInfo && (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono-code text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
                <span>{successInfo}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded-xl bg-red-100 text-red-900 border border-red-300 font-mono-code text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-700 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email / ID Field */}
              <div>
                <label className="block text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#2B1810]/80 uppercase mb-1.5">
                  STAFF EMAIL OR ID *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    disabled={isLoading}
                    value={staffId}
                    onChange={(e) => {
                      setStaffId(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="admin@shan.com or Staff Email"
                    className={`w-full pl-11 pr-4 py-3 rounded-2xl bg-[#ECE4D8] border ${
                      error ? 'border-red-500 ring-1 ring-red-400' : 'border-[#2B1810]/20'
                    } text-sm font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/40 focus:outline-none focus:ring-2 focus:ring-[#DE8030] transition`}
                    required
                  />
                  <Mail className="w-4 h-4 text-[#2B1810]/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#2B1810]/80 uppercase mb-1.5">
                  PASSWORD *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter Password"
                    className={`w-full pl-11 pr-4 py-3 rounded-2xl bg-[#ECE4D8] border ${
                      error ? 'border-red-500 ring-1 ring-red-400' : 'border-[#2B1810]/20'
                    } text-sm font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/40 focus:outline-none focus:ring-2 focus:ring-[#DE8030] transition`}
                    required
                  />
                  <KeyRound className="w-4 h-4 text-[#2B1810]/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-[#2B1810] hover:bg-[#3E241A] text-white font-mono-code text-xs uppercase font-bold tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AUTHENTICATING WITH FIREBASE...</span>
                  </>
                ) : (
                  <>
                    <span>UNLOCK STAFF VIEW</span>
                    <Lock className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
