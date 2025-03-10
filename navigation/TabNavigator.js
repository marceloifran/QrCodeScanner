import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';

import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ScanProductScreen from '../screens/ScanProductScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const [notificationCount, setNotificationCount] = useState(0);
  
  useEffect(() => {
    checkNotifications();
  }, []);
  
  const checkNotifications = async () => {
    if (!auth.currentUser) return;
    
    try {
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      let count = 0;
      
      productsList.forEach(product => {
        if (product.stock <= 5) {
          count++;
        }
      });
      
      setNotificationCount(count);
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
              <View style={styles.notificationContainer}>
                <Ionicons 
                  name="notifications-outline" 
                  size={24} 
                  color="#fff" 
                  style={{marginRight: 15}}
                  onPress={() => navigation.navigate('Notifications')}
                />
                {notificationCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{notificationCount}</Text>
                  </View>
                )}
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
          title: 'Panel',
          headerTitle: 'Panel de Control'
        }} 
      />
      <Tab.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={{ 
          title: 'Productos',
          headerTitle: 'Lista de Productos'
        }} 
      />
      <Tab.Screen 
        name="ScanProduct" 
        component={ScanProductScreen} 
        options={{ 
          title: 'Nueva Venta',
          headerTitle: 'Nueva Venta'
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