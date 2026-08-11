// Firebase SDK via CDN is loaded in index.html as global objects
// Use firebase.initializeApp(), firebase.auth(), firebase.firestore()

let db = null;
let auth = null;
let currentUser = null;
let onAuthChangeCallbacks = [];

// Default Firebase config (hardcoded for convenience - Firebase API keys are safe to expose publicly)
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyD6y7Dkn5Bm2Yr382MQDkRduYaCCSbXt-Y",
  authDomain: "thoughtbox-7ed1b.firebaseapp.com",
  projectId: "thoughtbox-7ed1b",
  storageBucket: "thoughtbox-7ed1b.firebasestorage.app",
  messagingSenderId: "362702634506",
  appId: "1:362702634506:web:000be93c233775b204a9f3"
};

// Initialize Firebase with config from localStorage settings
export function initFirebase() {
  let config = null;
  
  // Try saved config first, then fall back to default
  const configStr = localStorage.getItem('thoughtbox_firebase_config');
  if (configStr) {
    try { config = JSON.parse(configStr); } catch {}
  }
  if (!config || !config.apiKey) config = DEFAULT_CONFIG;
  if (!config.apiKey || !config.projectId) return false;
    
    // Only init once
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      currentUser = user;
      onAuthChangeCallbacks.forEach(cb => cb(user));
    });
    
    return true;
  } catch (e) {
    console.error('Firebase init failed:', e);
    return false;
  }
}

// Save Firebase config to localStorage
export function saveFirebaseConfig(config) {
  localStorage.setItem('thoughtbox_firebase_config', JSON.stringify(config));
}

// Get saved Firebase config
export function getFirebaseConfig() {
  try {
    const str = localStorage.getItem('thoughtbox_firebase_config');
    return str ? JSON.parse(str) : null;
  } catch { return null; }
}

// Google Sign-In
export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase not initialized');
  const provider = new firebase.auth.GoogleAuthProvider();
  return await auth.signInWithPopup(provider);
}

// Sign Out
export async function signOut() {
  if (!auth) return;
  await auth.signOut();
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}

// Register auth state change callback
export function onAuthChange(callback) {
  onAuthChangeCallbacks.push(callback);
  // Call immediately with current state
  if (auth) callback(currentUser);
}

// Check if Firebase is configured
export function isConfigured() {
  return db !== null && auth !== null;
}

// Get Firestore DB reference
export function getDb() {
  return db;
}
