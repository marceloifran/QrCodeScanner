import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation }) {
  const [notificationCount, setNotificationCount] = useState(0);
  
  useEffect(() => {
    checkNotifications();
  }, []);
  
  const checkNotifications = async () => {
    try {
      // Obtener productos del usuario
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const today = new Date();
      let count = 0;
      
      // Contar notificaciones
      productsList.forEach(product => {
        if (product.stock <= 5) {
          count++;
        }
        
        if (product.expiryDate) {
          const expiryDate = new Date(product.expiryDate.seconds * 1000);
          const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry <= 30) {
            count++;
          }
        }
      });
      
      setNotificationCount(count);
    } catch (error) {
      console.error('Error al verificar notificaciones:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel de Control</Text>
      
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={[styles.menuItem, {backgroundColor: '#28a745'}]}
          onPress={() => navigation.navigate('ScanProduct')}
        >
          <View style={styles.menuItemInner}>
            <Ionicons name="cart" size={24} color="white" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Nueva Venta</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, {backgroundColor: '#007bff'}]}
          onPress={() => navigation.navigate('ProductList')}
        >
          <View style={styles.menuItemInner}>
            <Ionicons name="list" size={24} color="white" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Lista de Productos</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, {backgroundColor: '#17a2b8'}]}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <View style={styles.menuItemInner}>
            <Ionicons name="add-circle" size={24} color="white" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Agregar Producto</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, {backgroundColor: '#6610f2'}]}
          onPress={() => navigation.navigate('SalesHistory')}
        >
          <View style={styles.menuItemInner}>
            <Ionicons name="time" size={24} color="white" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Historial de Ventas</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, {backgroundColor: '#fd7e14'}]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <View style={styles.menuItemInner}>
            <Ionicons name="notifications" size={24} color="white" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Notificaciones</Text>
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out" size={20} color="white" style={{marginRight: 8}} />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  menuContainer: {
    flex: 1,
  },
  menuItem: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  menuItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    marginRight: 10,
  },
  menuItemText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badge: {
    backgroundColor: 'red',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 