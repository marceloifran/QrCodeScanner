import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth } from '../firebase/config';

// Importar pantallas
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/ProductListScreen';
import AddProductScreen from '../screens/AddProductScreen';
import EditProductScreen from '../screens/EditProductScreen';
import ScanProductScreen from '../screens/ScanProductScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen} 
              options={{ 
                headerShown: true,
                title: 'Crear Cuenta'
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ title: 'Panel de Control' }}
            />
            <Stack.Screen 
              name="ProductList" 
              component={ProductListScreen} 
              options={{ title: 'Lista de Productos' }}
            />
            <Stack.Screen 
              name="AddProduct" 
              component={AddProductScreen} 
              options={{ title: 'Agregar Producto' }}
            />
            <Stack.Screen 
              name="EditProduct" 
              component={EditProductScreen} 
              options={{ title: 'Editar Producto' }}
            />
            <Stack.Screen 
              name="ScanProduct" 
              component={ScanProductScreen} 
              options={{ title: 'Escanear y Vender' }}
            />
            <Stack.Screen 
              name="SalesHistory" 
              component={SalesHistoryScreen} 
              options={{ title: 'Historial de Ventas' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'Mi Perfil' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 