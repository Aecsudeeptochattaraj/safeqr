import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { AppUser } from '../types';

import { EmailService, EmailEventType } from '../services/emailService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const prevProfileRef = useRef<AppUser | null>(null);

  const logout = async () => {
    if (user && profile) {
      const email = profile.email;
      const name = profile.displayName;
      await signOut(auth);
      EmailService.send(EmailEventType.LOGOUT_ALERT, {
        UserName: name || 'User',
        Email: email,
        Time: new Date().toLocaleString()
      }).catch(err => console.error("Logout email failed:", err));
    } else {
      await signOut(auth);
    }
  };

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
        prevProfileRef.current = null;
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        const docSnap = await getDoc(userRef);
        
        let fetchedProfile: AppUser | null = null;
        if (!docSnap.exists()) {
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
          prevProfileRef.current = newProfile;
        } else {
          const data = docSnap.data() as AppUser;
          if (firebaseUser.email === 'aecsudeepto80@gmail.com' && data.role !== 'admin') {
             await setDoc(userRef, { role: 'admin' }, { merge: true });
             data.role = 'admin';
          }
          fetchedProfile = data;
          setProfile(data);
          prevProfileRef.current = data;
        }

        const sessionKey = `login_mail_sent_${firebaseUser.uid}`;
        if (isNewlyLoggedIn && fetchedProfile && !sessionStorage.getItem(sessionKey)) {
          EmailService.send(EmailEventType.LOGIN_SUCCESS, {
            UserName: fetchedProfile.displayName || 'User',
            Email: fetchedProfile.email,
            Time: new Date().toLocaleString(),
            Device: navigator.userAgent,
            Location: 'Detected via Web Browser'
          }).then(() => {
            sessionStorage.setItem(sessionKey, 'true');
          }).catch(err => console.error("Login email failed:", err));
        }

        unsubscribeProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const currentData = snap.data() as AppUser;
            const previousData = prevProfileRef.current;

            // Detect meaningful changes to trigger Profile Update email
            if (previousData && 
                (currentData.displayName !== previousData.displayName || 
                 currentData.role !== previousData.role)) {
              
              EmailService.send(EmailEventType.PROFILE_UPDATE, {
                UserName: currentData.displayName || 'User',
                Email: currentData.email,
                Time: new Date().toLocaleString()
              }).catch(err => console.error("Profile update email failed:", err));
            }

            setProfile(currentData);
            prevProfileRef.current = currentData;
          }
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

  return { user, profile, loading, logout };
}
