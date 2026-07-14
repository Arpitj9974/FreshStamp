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
  query,
  where,
  orderBy
} from 'firebase/firestore';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDQdcrUKOiz_jkQQBJ3SjMlm2JWpp8haNk",
  authDomain: "climbing-volt-5jcsn.firebaseapp.com",
  projectId: "climbing-volt-5jcsn",
  storageBucket: "climbing-volt-5jcsn.firebasestorage.app",
  messagingSenderId: "1022300779007",
  appId: "1:1022300779007:web:ab1d1ae5b269b43f4337ca"
};

const databaseId = "ai-studio-freshstamp-e0b01f86-5c5c-480d-86de-1fd6772137c4";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Require email and profile scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Initialize firestore with the custom databaseId
export const db = initializeFirestore(app, {}, databaseId);

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
