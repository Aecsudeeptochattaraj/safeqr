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

// Initialize Analytics safely
export let analytics: any = null;

const initAnalytics = async () => {
  if (typeof window !== 'undefined') {
    try {
      const supported = await isSupported();
      if (supported) {
        analytics = getAnalytics(app);
      }
    } catch (err) {
      console.warn('Firebase Analytics could not be initialized (likely blocked by browser or environment):', err);
    }
  }
};

initAnalytics();

export const logEvent = async (eventName: string, eventParams?: { [key: string]: any }) => {
  try {
    if (analytics) {
      firebaseLogEvent(analytics, eventName, eventParams);
    }
  } catch (err) {
    // Silently fail logging if analytics is not available
  }
};
