import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AppNavigator from './navigation/AppNavigator';
import { app } from './firebase/config'; // Importa para asegurar la inicialización
import { registerForPushNotificationsAsync } from './services/NotificationService';

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

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#007bff" />
      <AppNavigator />
    </>
  );
}