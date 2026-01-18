/**
 * Firebase Authentication Service
 * 
 * Handles Firebase-based authentication for the platform.
 * Supports Google Sign-In (web and native), Email/Password authentication,
 * with extensibility for phone authentication.
 * 
 * Flow:
 * 1. User signs in with Firebase (Google, Email/Password, phone, etc.)
 * 2. Get Firebase ID token
 * 3. Send token to platform backend POST /api/auth/session
 * 4. Backend verifies token, creates/retrieves user, returns session data
 * 5. Store session data (user info, chat tokens)
 */

import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  // Email/Password imports
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth, googleProvider } from '../../firebase';
import api from './api';

// Check if running on native platform (exported for use by components)
export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Firebase Auth Service
 */
const firebaseAuthService = {
  /**
   * Get the current Firebase user
   */
  getCurrentUser: () => auth.currentUser,

  /**
   * Get Firebase ID token for the current user
   * @param {boolean} forceRefresh - Force refresh the token
   */
  getIdToken: async (forceRefresh = false) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No Firebase user signed in');
    }
    return user.getIdToken(forceRefresh);
  },

  /**
   * Sign in with Google (web popup)
   */
  signInWithGoogle: async () => {
    try {
      // Use popup for web
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      console.log('[FirebaseAuth] Google sign-in successful');
      
      return {
        user: result.user,
        idToken,
        credential: GoogleAuthProvider.credentialFromResult(result)
      };
    } catch (error) {
      console.error('[FirebaseAuth] Google sign-in failed:', error);
      throw error;
    }
  },

  /**
   * Sign in with Google using redirect (alternative for browsers that block popups)
   */
  signInWithGoogleRedirect: async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error('[FirebaseAuth] Google redirect sign-in failed:', error);
      throw error;
    }
  },

  /**
   * Handle redirect result after Google sign-in redirect
   */
  handleRedirectResult: async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        const idToken = await result.user.getIdToken();
        return {
          user: result.user,
          idToken,
          credential: GoogleAuthProvider.credentialFromResult(result)
        };
      }
      return null;
    } catch (error) {
      console.error('[FirebaseAuth] Redirect result handling failed:', error);
      throw error;
    }
  },

  /**
   * Sign in with Google credential (for native apps using @capacitor-firebase/authentication)
   * @param {string} idToken - Google ID token from native plugin
   * @param {string} accessToken - Google access token from native plugin (optional)
   */
  signInWithGoogleCredential: async (idToken, accessToken = null) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const result = await signInWithCredential(auth, credential);
      const firebaseIdToken = await result.user.getIdToken();
      
      console.log('[FirebaseAuth] Native Google sign-in successful');
      
      return {
        user: result.user,
        idToken: firebaseIdToken
      };
    } catch (error) {
      console.error('[FirebaseAuth] Native Google credential sign-in failed:', error);
      throw error;
    }
  },

  // ============================================
  // EMAIL/PASSWORD AUTHENTICATION METHODS
  // ============================================

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{user: Object, idToken: string}>}
   */
  signInWithEmailPassword: async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      
      console.log('[FirebaseAuth] Email/Password sign-in successful');
      
      return {
        user: result.user,
        idToken
      };
    } catch (error) {
      console.error('[FirebaseAuth] Email/Password sign-in failed:', error);
      throw firebaseAuthService._mapFirebaseError(error);
    }
  },

  /**
   * Sign up with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} options - Additional options
   * @param {string} options.displayName - User display name (optional)
   * @param {boolean} options.sendVerification - Send verification email (default: true)
   * @returns {Promise<{user: Object, idToken: string, verificationSent: boolean}>}
   */
  signUpWithEmailPassword: async (email, password, options = {}) => {
    try {
      const { displayName, sendVerification = true } = options;
      
      // Create user
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with displayName if provided
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      // Send verification email if requested
      let verificationSent = false;
      if (sendVerification) {
        try {
          await sendEmailVerification(result.user);
          verificationSent = true;
          console.log('[FirebaseAuth] Verification email sent');
        } catch (verifyError) {
          console.warn('[FirebaseAuth] Failed to send verification email:', verifyError);
        }
      }
      
      const idToken = await result.user.getIdToken();
      
      console.log('[FirebaseAuth] Email/Password sign-up successful');
      
      return {
        user: result.user,
        idToken,
        verificationSent
      };
    } catch (error) {
      console.error('[FirebaseAuth] Email/Password sign-up failed:', error);
      throw firebaseAuthService._mapFirebaseError(error);
    }
  },

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<{success: boolean}>}
   */
  sendPasswordReset: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('[FirebaseAuth] Password reset email sent');
      return { success: true };
    } catch (error) {
      console.error('[FirebaseAuth] Password reset email failed:', error);
      throw firebaseAuthService._mapFirebaseError(error);
    }
  },

  /**
   * Resend email verification to current user
   * @returns {Promise<{success: boolean}>}
   */
  resendEmailVerification: async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user signed in');
      }
      if (user.emailVerified) {
        throw new Error('Email already verified');
      }
      await sendEmailVerification(user);
      console.log('[FirebaseAuth] Verification email resent');
      return { success: true };
    } catch (error) {
      console.error('[FirebaseAuth] Resend verification failed:', error);
      throw firebaseAuthService._mapFirebaseError(error);
    }
  },

  /**
   * Map Firebase error codes to user-friendly messages
   * @private
   */
  _mapFirebaseError: (error) => {
    const errorMap = {
      'auth/email-already-in-use': 'This email is already registered. Please sign in or use a different email.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'Email/Password sign-in is not enabled. Please contact support.',
      'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/user-not-found': 'No account found with this email. Please sign up first.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
    };
    
    const friendlyMessage = errorMap[error.code] || error.message || 'Authentication failed. Please try again.';
    
    const mappedError = new Error(friendlyMessage);
    mappedError.code = error.code;
    mappedError.originalError = error;
    return mappedError;
  },

  // ============================================
  // END EMAIL/PASSWORD METHODS
  // ============================================

  /**
   * Create platform session using Firebase ID token
   * This is the main method to authenticate with the platform backend
   * 
   * @param {string} idToken - Firebase ID token (optional, will get from current user if not provided)
   * @returns {Promise<{user: Object, chat: Object, firebase: Object}>}
   */
  createSession: async (idToken = null) => {
    try {
      // Get ID token if not provided
      const token = idToken || await firebaseAuthService.getIdToken();
      
      const response = await api.post('/auth/session', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Session creation failed');
      }

      console.log('[FirebaseAuth] Platform session created successfully');
      
      return response.data;
    } catch (error) {
      console.error('[FirebaseAuth] Session creation failed:', error);
      throw error;
    }
  },

  /**
   * Get current session from platform
   */
  getSession: async () => {
    try {
      const token = await firebaseAuthService.getIdToken();
      
      const response = await api.get('/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('[FirebaseAuth] Get session failed:', error);
      throw error;
    }
  },

  /**
   * End session (logout from platform and chat)
   */
  endSession: async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        
        await api.delete('/auth/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      console.log('[FirebaseAuth] Platform session ended');
    } catch (error) {
      console.error('[FirebaseAuth] End session failed:', error);
      // Continue with Firebase sign out even if platform logout fails
    }
  },

  /**
   * Sign out from Firebase and platform
   */
  signOut: async () => {
    try {
      // End platform session first
      await firebaseAuthService.endSession();
      
      // Then sign out from Firebase
      await firebaseSignOut(auth);
      
      console.log('[FirebaseAuth] Signed out successfully');
    } catch (error) {
      console.error('[FirebaseAuth] Sign out failed:', error);
      // Still try to sign out from Firebase
      await firebaseSignOut(auth).catch(() => {});
      throw error;
    }
  },

  /**
   * Listen for auth state changes
   * @param {Function} callback - Called with (user) when auth state changes
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Complete sign-in flow: Firebase auth + platform session
   * This is the recommended method for sign-in
   * 
   * @param {string} method - 'google', 'google-redirect', 'google-native', 'email', 'email-signup'
   * @param {Object} options - Additional options (e.g., native tokens, email/password)
   * @returns {Promise<{success: boolean, user: Object, chat: Object, needsEmailVerification?: boolean}>}
   */
  signIn: async (method, options = {}) => {
    try {
      let firebaseResult;
      let isNewUser = false;

      switch (method) {
        case 'google':
          firebaseResult = await firebaseAuthService.signInWithGoogle();
          break;
        
        case 'google-redirect':
          await firebaseAuthService.signInWithGoogleRedirect();
          // Redirect will happen, session creation will be handled on return
          return { success: true, redirect: true };
        
        case 'google-native':
          if (!options.idToken) {
            throw new Error('idToken required for native Google sign-in');
          }
          firebaseResult = await firebaseAuthService.signInWithGoogleCredential(
            options.idToken,
            options.accessToken
          );
          break;
        
        case 'email':
          if (!options.email || !options.password) {
            throw new Error('email and password required for email sign-in');
          }
          firebaseResult = await firebaseAuthService.signInWithEmailPassword(
            options.email,
            options.password
          );
          break;
        
        case 'email-signup':
          if (!options.email || !options.password) {
            throw new Error('email and password required for email sign-up');
          }
          firebaseResult = await firebaseAuthService.signUpWithEmailPassword(
            options.email,
            options.password,
            {
              displayName: options.displayName,
              sendVerification: options.sendVerification !== false
            }
          );
          isNewUser = true;
          break;
        
        default:
          throw new Error(`Unknown sign-in method: ${method}`);
      }

      // Create platform session
      const sessionData = await firebaseAuthService.createSession(firebaseResult.idToken);

      // Check if email verification is needed (for email auth users)
      const needsEmailVerification = 
        firebaseResult.user.email && 
        !firebaseResult.user.emailVerified &&
        (method === 'email' || method === 'email-signup');

      return {
        success: true,
        needsEmailVerification,
        isNewUser,
        verificationSent: firebaseResult.verificationSent || false,
        ...sessionData
      };

    } catch (error) {
      console.error('[FirebaseAuth] Sign-in flow failed:', error);
      
      // If Firebase auth succeeded but session failed, sign out of Firebase
      if (auth.currentUser) {
        await firebaseSignOut(auth).catch(() => {});
      }
      
      throw error;
    }
  },

  /**
   * Check if Firebase user is signed in
   */
  isSignedIn: () => !!auth.currentUser,

  /**
   * Get user info from Firebase
   */
  getFirebaseUserInfo: () => {
    const user = auth.currentUser;
    if (!user) return null;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      providerId: user.providerData[0]?.providerId
    };
  }
};

export default firebaseAuthService;
