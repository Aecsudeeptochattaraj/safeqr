import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { AppUser } from '../types';

import { EmailService, EmailEventType } from '../services/emailService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email);
      const isNewlyLoggedIn = !user && firebaseUser;
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial fetch to speed up first paint and handle new user registration
        const docSnap = await getDoc(userRef);
        
        let fetchedProfile: AppUser | null = null;
        if (!docSnap.exists()) {
          console.log('Creating new user profile...');
          const isSuperAdmin = firebaseUser.email === 'aecsudeepto80@gmail.com';
          const newProfile: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: isSuperAdmin ? 'admin' : 'user',
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          fetchedProfile = newProfile;
          setProfile(newProfile);
        } else {
          const data = docSnap.data() as AppUser;
          // Auto-upgrade developer email to admin if not already
          if (firebaseUser.email === 'aecsudeepto80@gmail.com' && data.role !== 'admin') {
             await setDoc(userRef, { role: 'admin' }, { merge: true });
             data.role = 'admin';
          }
          fetchedProfile = data;
          setProfile(data);
        }

        // Send login email only once when the user first logs in during this session
        if (isNewlyLoggedIn && fetchedProfile) {
          EmailService.send(EmailEventType.LOGIN_SUCCESS, {
            UserName: fetchedProfile.displayName || 'User',
            Email: fetchedProfile.email,
            Time: new Date().toLocaleString(),
            Device: navigator.userAgent,
            Location: 'Detected via Web Browser'
          });
        }

        // Now setup real-time listener for updates (e.g. role changes, profile edits)
        unsubscribeProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as AppUser);
          }
        }, (err) => {
          console.error('Profile snapshot error:', err);
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching/creating profile:', err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return { user, profile, loading };
}
