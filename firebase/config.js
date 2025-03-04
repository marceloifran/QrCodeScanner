import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCAN3xP7ZY9JT91WifCK-4Q4_8jnqB-ipk",
  authDomain: "kioskos-7e313.firebaseapp.com",
  projectId: "kioskos-7e313",
  storageBucket: "kioskos-7e313.appspot.com",
  messagingSenderId: "908803753819",
  appId: "1:908803753819:web:7e23aab80a5951f2dcbc7e"
};

// Inicializar Firebase
let app;
try {
  // Prevenir múltiples inicializaciones
  if (!global.firebaseApp) {
    global.firebaseApp = initializeApp(firebaseConfig);
  }
  app = global.firebaseApp;
} catch (error) {
  app = initializeApp(firebaseConfig);
  console.error("Error inicializando Firebase:", error);
}

// Inicializar Auth y Firestore
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  console.error("Error inicializando Auth:", error);
}

const db = getFirestore(app);

export { auth, app, db }; 