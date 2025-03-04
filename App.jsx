import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { app } from './firebase/config'; // Importa para asegurar la inicialización

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#007bff" />
      <AppNavigator />
    </>
  );
}