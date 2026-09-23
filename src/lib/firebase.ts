/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  initializeFirestore,
  doc, 
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';

// Configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDGm7GQfXHWi3keZcqAqqVe4Y7GaAEcoiY",
  authDomain: "freshstamp-app.firebaseapp.com",
  projectId: "freshstamp-app",
  storageBucket: "freshstamp-app.firebasestorage.app",
  messagingSenderId: "1046466329129",
  appId: "1:1046466329129:web:8c09f744a58dcd516a7a38",
  measurementId: "G-T67V6XV22J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Require email and profile scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Initialize default firestore database with undefined properties safety
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});

export { onSnapshot };
export type { Unsubscribe };

// Connection test helper as mandated by firebase-integration skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test: Success");
    return true;
  } catch (error: any) {
    console.warn("Firestore connection test warning/error:", error.message);
    if (error?.message && error.message.includes('offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
    // Often permission-denied is also a sign of successful communication with the database
    return error?.code !== 'unavailable';
  }
}

// Trigger connection test on load
testFirestoreConnection();
