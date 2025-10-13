import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, StatusBar } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { colors } from '../theme/colors';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function DashboardScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [productCount, setProductCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        // Obtener nombre del usuario
        setUserName(auth.currentUser.displayName || 'Usuario');
        
        try {
          // Contar productos
          const productsQuery = query(
            collection(db, 'products'),
            where('userId', '==', auth.currentUser.uid)
          );
          const productsSnapshot = await getDocs(productsQuery);
          setProductCount(productsSnapshot.size);
          
          // Contar ventas (simulado)
          setSalesCount(Math.floor(Math.random() * 50));
        } catch (error) {
          console.error('Error al obtener datos:', error);
        }
      }
    };
    
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const menuItems = [
    {
      title: 'Escanear Producto',
      screen: 'ScanProduct',
      icon: '🔍',
      description: 'Escanea códigos QR de productos'
    },
    {
      title: 'Lista de Productos',
      screen: 'ProductList',
      icon: '📋',
      description: 'Gestiona tu inventario'
    },
    {
      title: 'Agregar Producto',
      screen: 'AddProduct',
      icon: '➕',
      description: 'Añade nuevos productos'
    },
    {
      title: 'Historial de Ventas',
      screen: 'SalesHistory',
      icon: '📊',
      description: 'Revisa tus ventas recientes'
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {userName}</Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileButtonText}>Mi Perfil</Text>
        </TouchableOpacity>
      </View>
      
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{productCount}</Text>
          <Text style={styles.statLabel}>Productos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{salesCount}</Text>
          <Text style={styles.statLabel}>Ventas</Text>
        </View>
      </View>
      
      {/* Menu */}
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      <ScrollView style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <View style={styles.menuItemTextContainer}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
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
    backgroundColor: colors.surface,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.onPrimary,
  },
  profileButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  profileButtonText: {
    color: colors.text.onPrimary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 15,
    margin: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  menuItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    padding: 15,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  menuItemDescription: {
    fontSize: 14,
    color: colors.text.light,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: colors.error,
    padding: 15,
    borderRadius: 8,
    margin: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.text.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});