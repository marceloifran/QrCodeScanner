import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCAN3xP7ZY9JT91WifCK-4Q4_8jnqB-ipk",
  authDomain: "kioskos-7e313.firebaseapp.com",
  projectId: "kioskos-7e313",
  storageBucket: "kioskos-7e313.appspot.com",
  messagingSenderId: "908803753819",
  appId: "1:908803753819:web:7e23aab80a5951f2dcbc7e",
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

// Inicializar Auth con getAuth en lugar de initializeAuth
let auth;
try {
  auth = getAuth(app);
} catch (error) {
  console.error("Error inicializando Auth:", error);
}

// Configuración optimizada de Firestore
const db = getFirestore(app);

// Habilitar persistencia offline y configurar caché para mejorar rendimiento
// y reducir errores de conexión
try {
  enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }).catch((err) => {
    if (err.code === "failed-precondition") {
      // Múltiples pestañas abiertas, la persistencia solo puede habilitarse en una
      console.warn(
        "La persistencia de Firestore no pudo habilitarse: múltiples pestañas abiertas"
      );
    } else if (err.code === "unimplemented") {
      // El navegador actual no soporta las características requeridas
      console.warn(
        "La persistencia de Firestore no está disponible en este entorno"
      );
    }
  });
} catch (error) {
  console.error("Error al configurar persistencia de Firestore:", error);
}

// Función para obtener el usuario actual
export const getCurrentUser = () => {
  return auth?.currentUser;
};

export const storage = getStorage(app);

export { auth, app, db };
