// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMr3ticAj6KegmVYWFjl6mJg24aHBDs5M",
  authDomain: "ats-seguridad-laboral.firebaseapp.com",
  projectId: "ats-seguridad-laboral",
  storageBucket: "ats-seguridad-laboral.firebasestorage.app",
  messagingSenderId: "256630315997",
  appId: "1:256630315997:web:b175f94ae634ac772cb434",
  measurementId: "G-7JX5D7Y144"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let analytics = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch {
    // Analytics optional in preview / development environments
  }
}
export { analytics };