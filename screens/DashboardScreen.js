import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';
import { getCategoryName, getCategoryIcon } from '../constants/categories';

export default function DashboardScreen({ navigation }) {
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalSales: 0
  });
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Cargar productos
      const productsQuery = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Contar productos totales
      const totalProducts = productsData.length;
      
      // Filtrar productos con stock bajo
      const lowStockData = productsData.filter(product => {
        const threshold = product.lowStockThreshold || 5;
        return product.stock <= threshold;
      });
      
      // Contar productos con stock bajo
      const lowStockCount = lowStockData.length;
      
      // Contar productos por categoría
      const categoryCountsData = {};
      productsData.forEach(product => {
        const category = product.category || 'sin-categoria';
        categoryCountsData[category] = (categoryCountsData[category] || 0) + 1;
      });
      
      setCategoryCounts(categoryCountsData);
      setLowStockProducts(lowStockData.slice(0, 5));
      
      // Cargar TODAS las ventas (sin filtrar por fecha)
      const salesQuery = query(
        collection(db, 'sales'),
        where('userId', '==', auth.currentUser.uid)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const allSalesData = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));
      
      // Ordenar ventas por fecha para mostrar las más recientes
      const sortedSales = [...allSalesData].sort((a, b) => b.date - a.date);
      
      // Contar ventas totales (todas, no solo las recientes)
      const totalSales = allSalesData.length;
      
      setRecentSales(sortedSales.slice(0, 5)); // Solo mostrar las 5 más recientes
      
      // Actualizar estadísticas
      setStats({
        totalProducts,
        lowStockCount,
        totalSales
      });
      
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };
  
  // Funciones de navegación
  const goToProducts = () => navigation.navigate('ProductList');
  const goToLowStock = () => navigation.navigate('ProductList', { filter: 'lowStock' });
  const goToSales = () => navigation.navigate('SalesHistory');
  const goToNewSale = () => navigation.navigate('ScanProductScreen');
  const goToScanStock = () => navigation.navigate('ScanForStock');
  
  // Función corregida para navegar a productos filtrados por categoría
  const goToCategory = (category) => {
    // Usar el parámetro correcto que la pantalla ProductList espera
    navigation.navigate('ProductList', { filter: 'category', category: category });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Tarjetas de estadísticas */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={goToProducts}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="cube-outline" size={24} color="white" />
            </View>
            <Text style={styles.statNumber}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={goToLowStock}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="alert-outline" size={24} color="white" />
            </View>
            <Text style={styles.statNumber}>{stats.lowStockCount}</Text>
            <Text style={styles.statLabel}>Stock Bajo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={goToSales}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="cart-outline" size={24} color="white" />
            </View>
            <Text style={styles.statNumber}>{stats.totalSales}</Text>
            <Text style={styles.statLabel}>Ventas</Text>
          </TouchableOpacity>
        </View>
        
        {/* Categorías */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <TouchableOpacity onPress={goToProducts}>
              <Text style={styles.viewAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {Object.keys(categoryCounts).map(category => (
              <TouchableOpacity 
                key={category}
                style={styles.categoryCard}
                onPress={() => goToCategory(category)}
              >
                <Text style={styles.categoryCount}>{categoryCounts[category]}</Text>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {getCategoryName(category)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Ventas recientes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ventas Recientes</Text>
            <TouchableOpacity onPress={goToSales}>
              <Text style={styles.viewAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          {recentSales.length > 0 ? (
            recentSales.map(sale => (
              <View key={sale.id} style={styles.saleItem}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleDate}>
                    {sale.date.toLocaleDateString()} {sale.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                  <Text style={styles.saleItems}>
                    {sale.items?.length || 0} productos
                  </Text>
                </View>
                <Text style={styles.saleTotal}>
                  {formatPrice(sale.total || 0)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay ventas recientes</Text>
          )}
        </View>
      </ScrollView>
      
      {/* Botones flotantes */}
      <TouchableOpacity 
        style={[styles.floatingButton, styles.newSaleButton]}
        onPress={goToNewSale}
      >
        <Ionicons name="cart-outline" size={24} color="white" />
        <Text style={styles.floatingButtonText}>Venta</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.floatingButton, styles.scanStockButton]}
        onPress={goToScanStock}
      >
        <Ionicons name="barcode-outline" size={24} color="white" />
        <Text style={styles.floatingButtonText}>Stock</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Espacio para los botones flotantes
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  viewAllText: {
    color: colors.primary,
    fontWeight: '500',
  },
  categoriesScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  saleInfo: {
    flex: 1,
  },
  saleDate: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  saleItems: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.tertiary,
    padding: 10,
  },
  floatingButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  newSaleButton: {
    bottom: 80,
    right: 20,
    backgroundColor: colors.primary,
  },
  scanStockButton: {
    bottom: 20,
    right: 20,
    backgroundColor: colors.accent,
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 