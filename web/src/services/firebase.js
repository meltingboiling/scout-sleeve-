// ============================================================
// src/services/firebase.js
//
// This file reads your Firebase config from the .env file.
// You MUST create a .env file in the project root with your
// Firebase credentials. See .env.example for the template.
// ============================================================

import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Validate that env vars are loaded
const missingVars = Object.entries(firebaseConfig)
  .filter(([, v]) => !v || v.startsWith('your_'))
  .map(([k]) => k)

if (missingVars.length > 0) {
  console.error(
    '⚠️  Missing Firebase config values:',
    missingVars,
    '\nCreate a .env file from .env.example and add your Firebase project credentials.'
  )
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Uncomment the lines below to use the Firestore emulator for local testing:
// if (import.meta.env.VITE_USE_EMULATOR === 'true') {
//   connectFirestoreEmulator(db, 'localhost', 8080)
//   console.log('🔧 Using Firestore emulator')
// }

export default app
