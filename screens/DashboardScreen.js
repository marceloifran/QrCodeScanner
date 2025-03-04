import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

export default function DashboardScreen({ navigation }) {
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
          style={styles.menuItem}
          onPress={() => navigation.navigate('ScanProduct')}
        >
          <Text style={styles.menuItemText}>Escanear Producto</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('ProductList')}
        >
          <Text style={styles.menuItemText}>Lista de Productos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Text style={styles.menuItemText}>Agregar Producto</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('SalesHistory')}
        >
          <Text style={styles.menuItemText}>Historial de Ventas</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
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
    backgroundColor: '#007bff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  menuItemText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 