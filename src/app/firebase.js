import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCvFu7cmst5f9xa6RpoEStRpZpcIbilM4",
  authDomain: "inspire-app-ad1d3.firebaseapp.com",
  projectId: "inspire-app-ad1d3",
  storageBucket: "inspire-app-ad1d3.firebasestorage.app",
  messagingSenderId: "642097061486",
  appId: "1:642097061486:web:34d726431185aa0d22d07f",
  measurementId: "G-W9P1C9B42M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);