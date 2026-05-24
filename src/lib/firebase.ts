import { initializeApp, getApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Check if configuration is present
export const isFirebaseConfigured = !!(
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.storageBucket
);

let app;
let storage: any = null;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    storage = getStorage(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error("Lỗi khi kết nối Firebase: ", error);
  }
}

export { storage, db, auth };
