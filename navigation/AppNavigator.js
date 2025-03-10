import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth, db } from '../firebase/config';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { colors } from '../theme/colors';

// Importar pantallas
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/ProductListScreen';
import AddProductScreen from '../screens/AddProductScreen';
import EditProductScreen from '../screens/EditProductScreen';
import ScanProductScreen from '../screens/ScanProductScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import BusinessInfoScreen from '../screens/BusinessInfoScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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

// Navegador de autenticación
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Navegador principal de la aplicación
const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        
        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Products') {
          iconName = focused ? 'list' : 'list-outline';
        } else if (route.name === 'Scan') {
          iconName = focused ? 'scan' : 'scan-outline';
        } else if (route.name === 'Sales') {
          iconName = focused ? 'cart' : 'cart-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }
        
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardStack} options={{ title: 'Panel' }} />
    <Tab.Screen name="Products" component={ProductsStack} options={{ title: 'Productos' }} />
    <Tab.Screen name="Scan" component={ScanStack} options={{ title: 'Nueva Venta' }} />
    <Tab.Screen name="Sales" component={SalesStack} options={{ title: 'Ventas' }} />
    <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Perfil' }} />
  </Tab.Navigator>
);

// Stack para Dashboard
const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="DashboardScreen" 
      component={DashboardScreen} 
      options={{ 
        title: 'Dashboard',
        headerShown: false
      }} 
    />
    <Stack.Screen 
      name="ScanProduct" 
      component={ScanProductScreen} 
      options={{ 
        title: 'Escanear Producto',
        headerShown: false
      }} 
    />
  </Stack.Navigator>
);

// Stack para Productos
const ProductsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ProductList" 
      component={ProductListScreen} 
      options={{ 
        title: 'Lista de Productos',
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
    />
    <Stack.Screen 
      name="AddProduct" 
      component={AddProductScreen} 
      options={{ 
        title: 'Agregar Producto',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
    />
    <Stack.Screen 
      name="EditProduct" 
      component={EditProductScreen} 
      options={{ 
        title: 'Editar Producto',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
    />
  </Stack.Navigator>
);

// Stack para Ventas
const SalesStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="SalesHistory" 
      component={SalesHistoryScreen} 
      options={{ 
        title: 'Historial de Ventas',
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
    />
  </Stack.Navigator>
);

// Stack para Perfil
const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ProfileScreen" 
      component={ProfileScreen} 
      options={{ 
        title: 'Perfil',
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
    />
    <Stack.Screen 
      name="BusinessInfo" 
      component={BusinessInfoScreen} 
      options={{ 
        title: 'Información del Negocio',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
    />
    <Stack.Screen 
      name="Notifications" 
      component={NotificationsScreen} 
      options={{ 
        title: 'Notificaciones',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
    />
    <Stack.Screen 
      name="NotificationSettings" 
      component={NotificationSettingsScreen} 
      options={{ 
        title: 'Configuración de Notificaciones',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
    />
  </Stack.Navigator>
);

// Crear un stack navigator para la pestaña de escaneo
const ScanStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ScanScreen" 
      component={ScanProductScreen} 
      options={{ 
        title: 'Nueva Venta',
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      }} 
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

export default AppNavigator;

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