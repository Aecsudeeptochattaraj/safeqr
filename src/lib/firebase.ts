import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, logEvent as firebaseLogEvent, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics lazily as it might not be supported in all environments (e.g. some SSR or private windows)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export const logEvent = async (eventName: string, eventParams?: { [key: string]: any }) => {
  if (analytics && await isSupported()) {
    firebaseLogEvent(analytics, eventName, eventParams);
  }
};
