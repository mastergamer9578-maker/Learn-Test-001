// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, setLogLevel } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration (loaded safely via environment variables with fallbacks)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD82AJb7TAFVIv86B7UjmZUcrvFa9OXPek",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shan-fast-foods.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shan-fast-foods",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "shan-fast-foods.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "561409574915",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:561409574915:web:cdd4123fd2c628b3e2e63"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Suppress non-fatal network reconnect/offline warning spam in preview environments
try {
  setLogLevel('silent');
} catch {}

// In browser preview environments, suppress transient offline/reconnection attempt warnings
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const rawMsg = args
      .map((a) => {
        if (typeof a === 'string') return a;
        if (a && typeof a === 'object') return a.message || a.stack || JSON.stringify(a);
        return String(a || '');
      })
      .join(' ');

    if (
      rawMsg.includes('Could not reach Cloud Firestore backend') ||
      rawMsg.includes('operate in offline mode until it is able to successfully connect') ||
      (rawMsg.includes('@firebase/firestore') && rawMsg.includes('code=unavailable'))
    ) {
      // Suppress transient initial offline connection log from flagging as application error
      return;
    }
    originalError.apply(console, args);
  };

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const rawMsg = args
      .map((a) => (typeof a === 'string' ? a : a?.message || String(a || '')))
      .join(' ');
    if (
      rawMsg.includes('Could not reach Cloud Firestore backend') ||
      rawMsg.includes('operate in offline mode until it is able to successfully connect')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Initialize Firestore with forced long polling for robust iframe connectivity
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
