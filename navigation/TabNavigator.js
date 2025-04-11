import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';

// Importar pantallas
import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ScanProductScreen from '../screens/ScanProductScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function TabNavigator() {
  const [notificationCount, setNotificationCount] = useState(0);
  const [businessName, setBusinessName] = useState('Mi Negocio');

  useEffect(() => {
    const loadBusinessName = async () => {
      try {
        if (auth.currentUser) {
          const userDocRef = doc(db, 'businessInfo', auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData && userData.name) {
              setBusinessName(userData.name);
            }
          }
        }
      } catch (error) {
        console.error('Error al cargar el nombre del negocio:', error);
      }
    };
    
    loadBusinessName();
    
    const checkNotifications = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'products'),
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const productsList = querySnapshot.docs.map(doc => doc.data());

        // Contar productos con stock bajo
        const lowStockCount = productsList.filter(product => {
          const threshold = product.lowStockThreshold || 5;
          return product.stock <= threshold;
        }).length;

        setNotificationCount(lowStockCount);
      } catch (error) {
        console.error('Error verificando notificaciones:', error);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // Cada minuto
    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ProductList') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'ScanProduct') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'SalesHistory') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
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
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => {
                  // Navegar a la pantalla de notificaciones (ahora en AppNavigator)
                  navigation.navigate('Notifications');
                }}
              >
                <Ionicons name="notifications-outline" size={24} color="#fff" />
                {notificationCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }
          return null;
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          title: 'Inicio',
          headerTitle: businessName
        }} 
      />
      <Tab.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={{ 
          title: 'Productos',
          headerTitle: 'Mis Productos'
        }} 
      />
      <Tab.Screen 
        name="ScanProduct" 
        component={ScanProductScreen} 
        options={{ 
          title: 'Escanear',
          headerShown: false
        }} 
      />
      <Tab.Screen 
        name="SalesHistory" 
        component={SalesHistoryScreen} 
        options={{ 
          title: 'Ventas',
          headerTitle: 'Historial de Ventas'
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: 'Perfil',
          headerTitle: 'Mi Perfil'
        }} 
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    position: 'relative',
    marginRight: 15,
    padding: 5,
  },
  badge: {
    position: 'absolute',
    right: -5,
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
