import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "aihw-492912",
  appId: "1:605835119009:web:2e7559a89e3d4c6ae123e0",
  storageBucket: "aihw-492912.firebasestorage.app",
  apiKey: "AIzaSyAK7yuGLoYJWVP3OgoT8jJF24FlkEtcIOg",
  authDomain: "aihw-492912.firebaseapp.com",
  messagingSenderId: "605835119009",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
