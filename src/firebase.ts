// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyD82AJb7TAFVIv86B7UjmZUcrvFa9OXPek",
  authDomain: "shan-fast-foods.firebaseapp.com",
  projectId: "shan-fast-foods",
  storageBucket: "shan-fast-foods.firebasestorage.app",
  messagingSenderId: "561409574915",
  appId: "1:561409574915:web:cdd4123fd2c628b3e2e63"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
