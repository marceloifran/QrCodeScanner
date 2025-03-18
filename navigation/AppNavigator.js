import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth, db } from '../firebase/config';
import { View, TouchableOpacity, Text, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { colors } from '../theme/colors';

// Pantallas
import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ScanProductScreen from '../screens/ScanProductScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import AddProductScreen from '../screens/AddProductScreen';
import EditProductScreen from '../screens/EditProductScreen';
import BusinessInfoScreen from '../screens/BusinessInfoScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import ScanForStockScreen from '../screens/ScanForStockScreen';
import CartScreen from '../screens/CartScreen';
import NewCartScreen from '../screens/NewCartScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navegador de pestañas principal
const TabNavigator = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  
  useEffect(() => {
    checkNotifications();
  }, []);
  
  const checkNotifications = async () => {
    if (!auth.currentUser) return;
    
    try {
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid),
        where('stock', '<=', 5)
      );
      const querySnapshot = await getDocs(q);
      setNotificationCount(querySnapshot.size);
    } catch (error) {
      console.error('Error verificando notificaciones:', error);
    }
  };
  
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ProductList') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'SalesHistory') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => {
          if (route.name === 'Dashboard') {
            return (
              <View style={styles.notificationContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons 
                    name="notifications-outline" 
                    size={24} 
                    color="#fff" 
                    style={{marginRight: 15}}
                  />
                  {notificationCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{notificationCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          }
          return null;
        }
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          title: 'Inicio',
          headerBackTitle: 'Inicio'
        }} 
      />
      <Tab.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={{ 
          title: 'Productos',
          headerBackTitle: 'Productos'
        }} 
      />
      <Tab.Screen 
        name="SalesHistory" 
        component={SalesHistoryScreen} 
        options={{ 
          title: 'Ventas',
          headerBackTitle: 'Ventas'
        }} 
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ 
          title: 'Notificaciones',
          headerBackTitle: 'Inicio'
        }} 
      />
    </Tab.Navigator>
  );
};

// Navegador de autenticación
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Navegador principal
const MainNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="TabNavigator" 
      component={TabNavigator} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen 
      name="AddProduct" 
      component={AddProductScreen} 
      options={{ 
        title: 'Agregar Producto',
        headerBackTitle: 'Atrás'
      }} 
    />
    <Stack.Screen 
      name="EditProduct" 
      component={EditProductScreen} 
      options={{ 
        title: 'Editar Producto',
        headerBackTitle: 'Atrás'
      }} 
    />
    <Stack.Screen 
      name="BusinessInfo" 
      component={BusinessInfoScreen} 
      options={{ title: 'Información del Negocio' }} 
    />
    <Stack.Screen 
      name="ScanForStock" 
      component={ScanForStockScreen} 
      options={{ 
        headerShown: false
      }} 
    />
    <Stack.Screen 
      name="ScanProductScreen" 
      component={ScanProductScreen} 
      options={{ 
        headerShown: false
      }} 
    />
    <Stack.Screen 
      name="Cart" 
      component={CartScreen} 
      options={{ title: 'Carrito' }} 
    />
    <Stack.Screen 
      name="NewCart" 
      component={NewCartScreen} 
      options={{ title: 'Nueva Venta' }} 
    />
    <Stack.Screen 
      name="NotificationSettings" 
      component={NotificationSettingsScreen} 
      options={{ title: 'Configuración de Notificaciones' }} 
    />
  </Stack.Navigator>
);

// Navegador principal de la aplicación
const AppNavigator = () => {
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'relative',
    marginRight: 10,
  },
  badge: {
    position: 'absolute',
    right: 10,
    top: -5,
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

export default AppNavigator; 