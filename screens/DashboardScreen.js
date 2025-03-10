import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    inventoryValue: 0,
    categoryCounts: {},
    recentSales: [],
    userName: '',
    userEmail: '',
    businessName: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;
      
      // Cargar datos del usuario
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data() || {};
      
      // Cargar productos
      const productsQuery = query(
        collection(db, 'products'),
        where('userId', '==', userId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calcular estadísticas de productos
      const totalProducts = products.length;
      const lowStockProducts = products.filter(p => p.stock <= 5).length;
      const inventoryValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
      
      // Contar productos por categoría
      const categoryCounts = {};
      products.forEach(product => {
        const category = product.category || 'Sin categoría';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // Cargar ventas
      const salesQuery = query(
        collection(db, 'sales'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      const salesSnapshot = await getDocs(salesQuery);
      const sales = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));
      
      // Calcular estadísticas de ventas
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      
      // Obtener ventas recientes
      const recentSales = sales.slice(0, 5);
      
      setStats({
        totalProducts,
        totalSales,
        totalRevenue,
        lowStockProducts,
        inventoryValue,
        categoryCounts,
        recentSales,
        userName: userData.name || 'Usuario',
        userEmail: auth.currentUser.email,
        businessName: userData.businessName || 'Mi Negocio',
      });
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bienvenido,</Text>
          <Text style={styles.userName}>{stats.userName}</Text>
          <Text style={styles.businessName}>{stats.businessName}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
          <Ionicons name="person-circle" size={40} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Resumen principal */}
        <View style={styles.summaryContainer}>
          <TouchableOpacity 
            style={[styles.summaryCard, styles.revenueCard]}
            onPress={() => navigation.navigate('Sales', { screen: 'SalesHistory' })}
          >
            <Text style={styles.summaryValue}>{formatPrice(stats.totalRevenue)}</Text>
            <Text style={styles.summaryLabel}>Ingresos Totales</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.summaryCard, styles.inventoryCard]}
            onPress={() => navigation.navigate('Products', { screen: 'ProductList' })}
          >
            <Text style={styles.summaryValue}>{formatPrice(stats.inventoryValue)}</Text>
            <Text style={styles.summaryLabel}>Valor del Inventario</Text>
          </TouchableOpacity>
        </View>

        {/* Estadísticas rápidas */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Products', { screen: 'ProductList' })}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="cube-outline" size={24} color="white" />
            </View>
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Products', { screen: 'ProductList', params: { filter: 'lowStock' } })}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="white" />
            </View>
            <Text style={styles.statValue}>{stats.lowStockProducts}</Text>
            <Text style={styles.statLabel}>Stock Bajo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Sales', { screen: 'SalesHistory' })}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="cart-outline" size={24} color="white" />
            </View>
            <Text style={styles.statValue}>{stats.totalSales}</Text>
            <Text style={styles.statLabel}>Ventas</Text>
          </TouchableOpacity>
        </View>

        {/* Categorías */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Products', { screen: 'ProductList' })}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {Object.entries(stats.categoryCounts).map(([category, count], index) => (
              <TouchableOpacity 
                key={index}
                style={styles.categoryCard}
                onPress={() => navigation.navigate('Products', { screen: 'ProductList', params: { filter: 'category', category } })}
              >
                <Text style={styles.categoryCount}>{count}</Text>
                <Text style={styles.categoryName}>{category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Ventas recientes */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ventas Recientes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Sales', { screen: 'SalesHistory' })}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          {stats.recentSales.length > 0 ? (
            stats.recentSales.map((sale, index) => (
              <View key={index} style={styles.saleCard}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleDate}>
                    {sale.date.toLocaleDateString('es-AR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <Text style={styles.saleItems}>
                    {sale.items?.length || 0} productos
                  </Text>
                </View>
                <Text style={styles.saleTotal}>{formatPrice(sale.total)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay ventas recientes</Text>
          )}
        </View>

        {/* Acciones rápidas */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="scan-outline" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Nueva Venta</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Products', { screen: 'AddProduct' })}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="add-outline" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Agregar Producto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Products', { screen: 'ProductList', params: { filter: 'lowStock' } })}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Stock Bajo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.primary,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  businessName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  profileButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  revenueCard: {
    backgroundColor: colors.primary,
  },
  inventoryCard: {
    backgroundColor: '#2196F3',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryCard: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  categoryName: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  saleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saleInfo: {
    flex: 1,
  },
  saleDate: {
    fontSize: 14,
    color: '#333',
  },
  saleItems: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 15,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
}); 