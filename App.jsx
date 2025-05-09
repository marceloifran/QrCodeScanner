import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AppNavigator from './navigation/AppNavigator';
import { app, auth } from './firebase/config'; // Importa para asegurar la inicialización
import { registerForPushNotificationsAsync } from './services/NotificationService';
import { validateUserSubscription } from './utils/subscriptionUtils';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Registrar para notificaciones push
    registerForPushNotificationsAsync();

    // Escuchar notificaciones recibidas
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Escuchar respuestas a notificaciones
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data.screen;
      // Aquí podrías navegar a la pantalla correspondiente
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Verificar estado de suscripción al iniciar la app
  useEffect(() => {
    const checkSubscriptionOnStartup = async (user) => {
      try {
        if (!user) {
          console.log('No hay usuario autenticado para verificar suscripción');
          return;
        }

        console.log('Verificando suscripción al iniciar la app...');
        const result = await validateUserSubscription(user.uid);
        
        if (result.isValid) {
          console.log(`Suscripción válida: ${result.planId}. Expira: ${result.expirationDate}`);
        } else {
          console.log(`Suscripción no válida: ${result.message || 'Plan básico activo'}`);
        }
      } catch (error) {
        console.error('Error al verificar suscripción en inicio:', error);
      }
    };

    // Usar onAuthStateChanged para manejar los cambios de autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkSubscriptionOnStartup(user);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#007bff" />
      <AppNavigator />
    </>
  );
}