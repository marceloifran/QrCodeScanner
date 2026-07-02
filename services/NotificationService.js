import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

// Configurar comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS !== 'web' && Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('¡Necesitamos permiso para enviar notificaciones!');
      return;
    }
    
    // Obtener token de expo
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'c418f4af-b5b3-476e-97b8-3d17c2637b79', // Tu projectId de EAS
    })).data;
    
    // Guardar token en Firestore
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        expoPushToken: token,
        lastUpdated: new Date()
      }, { merge: true });
    }
  } else if (Platform.OS !== 'web') {
    alert('Las notificaciones push requieren un dispositivo físico');
  }

  // Configuración específica para Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00A651',
    });
  }

  return token;
}

// Función para enviar notificación local
export async function sendLocalNotification(title, body, data = {}) {
  if (Platform.OS === 'web') {
    console.log('Notificación local (Web):', title, body, data);
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      badge: 1,
    },
    trigger: null, // Inmediatamente
  });
}

export async function checkAndNotifyLowStock(product) {
  if (!auth.currentUser) return;
  
  try {
    const threshold = product.lowStockThreshold || 5;
    
    // Solo notificar si el stock está por debajo del umbral
    if (product.stock <= threshold) {
      // Verificar si ya se notificó este producto por stock bajo
      const notificationRef = doc(db, 'notificationHistory', `${auth.currentUser.uid}_${product.id}_low_stock`);
      const notificationDoc = await getDoc(notificationRef);
      
      // Si no hay registro de notificación previa, notificar y registrar
      if (!notificationDoc.exists()) {
        // Enviar notificación
        await sendLocalNotification(
          'Stock Bajo',
          `El producto "${product.name}" tiene un stock de ${product.stock} unidades (umbral: ${threshold}).`,
          { screen: 'EditProduct', productId: product.id }
        );
        
        // Registrar que se envió la notificación
        await setDoc(notificationRef, {
          productId: product.id,
          threshold: threshold,
          notifiedAt: new Date(),
          currentStock: product.stock
        });
      }
    } else {
      // Si el stock vuelve a estar por encima del umbral, eliminar el registro para permitir notificar de nuevo
      const notificationRef = doc(db, 'notificationHistory', `${auth.currentUser.uid}_${product.id}_low_stock`);
      const notificationDoc = await getDoc(notificationRef);
      
      if (notificationDoc.exists()) {
        await deleteDoc(notificationRef);
      }
    }
  } catch (error) {
    console.error('Error al verificar o enviar notificación de stock bajo:', error);
  }
}