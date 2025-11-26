// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDCvFu7cmst5f9xa6RpoEStRpZpcIbilM4",
  authDomain: "inspire-app-ad1d3.firebaseapp.com",
  projectId: "inspire-app-ad1d3",
  storageBucket: "inspire-app-ad1d3.firebasestorage.app",
  messagingSenderId: "642097061486",
  appId: "1:642097061486:web:34d726431185aa0d22d07f",
  measurementId: "G-W9P1C9B42M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);