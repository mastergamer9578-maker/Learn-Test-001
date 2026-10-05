import React, { useState } from 'react';
import { Lock, X, AlertCircle, User, KeyRound, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface StaffAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StaffAccessModal: React.FC<StaffAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  if (!isOpen) return null;

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
        return 'Access temporarily disabled due to too many failed login attempts. Please wait a few minutes.';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanId = staffId.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setError('Please enter both Staff Email / ID and Password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Resolve Auth instance (standard module or browser CDN/ESM fallback)
    const authInstance = auth || (window as any).__firebaseAuth;

    try {
      let isVerified = false;
      let specificAuthError: string | null = null;

      // 1. Direct Firebase Authentication via signInWithEmailAndPassword
      if (cleanId.includes('@')) {
        try {
          const userCred = await signInWithEmailAndPassword(authInstance, cleanId, cleanPass);
          if (userCred && userCred.user) {
            isVerified = true;
          }
        } catch (authErr: any) {
          console.warn('[StaffAccess] Firebase Auth failed:', authErr);
          specificAuthError = getFriendlyErrorMessage(authErr);
        }
      } else {
        // If a username without @ was entered, try common email domain aliases
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
              isVerified = true;
              break;
            }
          } catch (aliasErr: any) {
            lastAliasError = aliasErr;
          }
        }

        if (!isVerified && lastAliasError && lastAliasError.code === 'auth/wrong-password') {
          specificAuthError = getFriendlyErrorMessage(lastAliasError);
        }
      }

      // 2. Secondary check against Firestore 'staff' collection if not verified via Auth
      if (!isVerified && !specificAuthError) {
        try {
          // Direct document lookup by doc ID (e.g. /staff/admin or /staff/id)
          const docCandidates = [cleanId, cleanId.toLowerCase()];
          for (const docId of docCandidates) {
            const docRef = doc(db, 'staff', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const storedPass = String(data.password ?? data.pin ?? data.pass ?? '');
              if (storedPass && storedPass === cleanPass) {
                isVerified = true;
                break;
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
                    break;
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

      // 3. Fallback support: Default store admin credentials
      if (!isVerified && !specificAuthError) {
        const validFallbackIds = ['admin', 'staff', 'manager', 'shan'];
        const validFallbackPass = ['1234', '2019', 'shan123', 'admin'];
        if (
          validFallbackIds.includes(cleanId.toLowerCase()) &&
          validFallbackPass.includes(cleanPass)
        ) {
          isVerified = true;
        }
      }

      if (isVerified) {
        setError(null);
        setStaffId('');
        setPassword('');
        onSuccess();
      } else {
        setError(
          specificAuthError ||
          'Authentication failed. Credentials do not match any user in Firebase Authentication or staff database.'
        );
        setAttempts((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error('[StaffAccess] Authentication exception:', err);
      setError(getFriendlyErrorMessage(err));
      setAttempts((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

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

        {/* Orange Lock Icon Badge */}
        <div className="w-12 h-12 rounded-2xl bg-[#DE8030] text-white flex items-center justify-center shadow-md mb-4">
          <Lock className="w-6 h-6 stroke-[2]" />
        </div>

        {/* Header */}
        <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase">
          RESTRICTED AREA
        </div>
        <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] tracking-tight uppercase leading-none mt-1 mb-2">
          STAFF ACCESS
        </h2>
        <p className="font-mono-code text-xs text-[#2B1810]/75 leading-relaxed mb-6">
          Sign in with your registered Firebase Authentication credentials to access live kitchen orders and menu controls.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Field 1: Staff Email / ID */}
          <div>
            <label className="block text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#2B1810]/80 uppercase mb-2">
              STAFF EMAIL OR ID
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
                placeholder="e.g. admin@shan.com or Staff ID"
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#ECE4D8] border ${
                  error ? 'border-red-500 ring-1 ring-red-400' : 'border-[#2B1810]/20'
                } text-sm font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/40 placeholder:font-mono-code focus:outline-none focus:ring-2 focus:ring-[#DE8030] transition disabled:opacity-60`}
              />
              <User className="w-4 h-4 text-[#2B1810]/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Field 2: Password */}
          <div>
            <label className="block text-[10px] font-mono-code font-bold tracking-[0.2em] text-[#2B1810]/80 uppercase mb-2">
              PASSWORD
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
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#ECE4D8] border ${
                  error ? 'border-red-500 ring-1 ring-red-400' : 'border-[#2B1810]/20'
                } text-sm font-mono-code text-[#2B1810] placeholder:text-[#2B1810]/40 placeholder:font-mono-code focus:outline-none focus:ring-2 focus:ring-[#DE8030] transition disabled:opacity-60`}
              />
              <KeyRound className="w-4 h-4 text-[#2B1810]/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Error Message with clear description */}
          {error && (
            <div className="flex items-start gap-2.5 text-xs font-mono-code text-red-700 bg-red-100/90 p-3.5 rounded-2xl border border-red-300 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="leading-snug">
                <span className="font-bold block mb-0.5">Firebase Sign-In Error:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {attempts >= 1 && !error && (
            <div className="text-[11px] font-mono-code text-[#C46726] bg-[#DE8030]/10 p-2.5 rounded-xl border border-[#DE8030]/20">
              Tip: Ensure the user exists in Firebase Console under <span className="font-bold">Authentication &gt; Users</span>.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-full bg-[#9E8E81] hover:bg-[#8C7A6D] text-white font-mono-code text-xs uppercase font-bold tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

        <p className="text-[10px] font-mono-code text-[#2B1810]/50 text-center mt-6">
          Your access stays active until this browser session ends.
        </p>

      </div>
    </div>
  );
};
