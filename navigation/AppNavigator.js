import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth, db } from '../firebase/config';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import TabNavigator from './TabNavigator';
import { colors } from '../theme/colors';

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
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import CartScreen from '../screens/CartScreen';
import NewCartScreen from '../screens/NewCartScreen';

const Stack = createStackNavigator();

// Componente para el botón de notificaciones
const NotificationBell = ({ navigation }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  
  useEffect(() => {
    checkNotifications();
  }, []);
  
  const checkNotifications = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Primero obtenemos todos los productos del usuario
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      // Luego filtramos localmente por stock bajo
      const lowStockProducts = querySnapshot.docs.filter(doc => {
        const product = doc.data();
        return product.stock <= 5;
      });
      
      setNotificationCount(lowStockProducts.length);
    } catch (error) {
      console.error('Error verificando notificaciones:', error);
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.notificationButton}
      onPress={() => navigation.navigate('Notifications')}
    >
      <Ionicons name="notifications-outline" size={24} color="white" />
      {notificationCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{notificationCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    
    return unsubscribe;
  }, []);
  
  if (initializing) {
    return null;
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation, route }) => ({
          headerStyle: {
            backgroundColor: colors.primary, // Verde del logo
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerBackTitle: ' ', // Esto elimina el texto "HomeTab" pero mantiene el icono
          headerRight: () => {
            // No mostrar la campanita en la pantalla de escaneo
            if (route.name === 'ScanProduct') {
              return null;
            }
            
            return user ? (
              <NotificationBell navigation={navigation} />
            ) : null;
          },
        })}
      >
        {!user ? (
          // Rutas para usuarios no autenticados
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen} 
              options={{ title: 'Registrarse' }}
            />
          </>
        ) : (
          // Rutas para usuarios autenticados
          <>
            <Stack.Screen 
              name="HomeTab" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ title: 'Panel de Control' }}
            />
            <Stack.Screen 
              name="ProductList" 
              component={ProductListScreen} 
              options={{ title: 'Productos' }}
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
              options={{ title: 'Escanear Producto' }}
            />
            <Stack.Screen 
              name="SalesHistory" 
              component={SalesHistoryScreen} 
              options={{ title: 'Historial de Ventas' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen} 
              options={{ title: 'Perfil' }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen} 
              options={{ 
                title: 'Notificaciones',
                headerRight: () => null
              }}
            />
            <Stack.Screen 
              name="NotificationSettings" 
              component={NotificationSettingsScreen} 
              options={{ title: 'Configurar Notificaciones' }}
            />
            <Stack.Screen 
              name="Cart" 
              component={NewCartScreen} 
              options={{ 
                headerShown: false 
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    marginRight: 15,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 