import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
  
  if (Device.isDevice) {
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
  } else {
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