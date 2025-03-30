import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';
import { getCategoriesForIndustry } from '../utils/categoryUtils';

export default function DashboardScreen({ navigation }) {
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalSales: 0,
    totalIncome: 0,
    inventoryValue: 0
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    loadDashboardData();
    checkNotifications();
    loadCategories();
  }, []);
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('DashboardScreen recibió el foco - recargando datos');
      loadDashboardData();
      checkNotifications();
      loadCategories();
    });
    
    return unsubscribe;
  }, [navigation]);
  
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
      
      // Calcular valor total del inventario
      const inventoryValue = productsData.reduce((total, product) => {
        return total + (product.price * product.stock);
      }, 0);
      
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
      
      // Cargar ventas
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
      
      // Calcular ingresos totales
      const totalIncome = allSalesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
      
      setRecentSales(sortedSales.slice(0, 5)); // Solo mostrar las 5 más recientes
      
      // Actualizar estadísticas
      setStats({
        totalProducts,
        lowStockCount,
        totalSales,
        totalIncome,
        inventoryValue
      });
      
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const checkNotifications = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Obtener productos con stock bajo usando umbral personalizado
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      // Filtrar usando el umbral personalizado de cada producto
      const lowStockProducts = querySnapshot.docs.filter(doc => {
        const product = doc.data();
        const threshold = product.lowStockThreshold || 5;
        return product.stock <= threshold;
      });
      
      setNotificationCount(lowStockProducts.length);
    } catch (error) {
      console.error('Error verificando notificaciones:', error);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    checkNotifications();
  };
  
  const goToNewSale = () => {
    navigation.navigate('Scan', {
      screen: 'ScanScreen'
    });
  };
  
  const goToScanStock = () => {
    navigation.navigate('Products', {
      screen: 'ScanForStock'
    });
  };
  
  const navigateToCategory = (categoryId) => {
    navigation.navigate('Products', {
      screen: 'ProductList',
      params: { filter: 'category', category: categoryId }
    });
  };
  
  const viewAllSales = () => {
    navigation.navigate('Sales', {
      screen: 'SalesHistory'
    });
  };
  
  const viewLowStockProducts = () => {
    navigation.navigate('Products', {
      screen: 'ProductList',
      params: { filter: 'lowStock' }
    });
  };
  
  const viewInventoryValue = () => {
    navigation.navigate('Products', {
      screen: 'ProductList',
      params: { filter: 'inventoryValue' }
    });
  };
  
  const renderNotificationBell = () => {
    return (
      <TouchableOpacity 
        style={styles.notificationBell}
        onPress={() => navigation.navigate('Notifications')}
      >
        <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        {notificationCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{notificationCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  const loadCategories = async () => {
    try {
      // Cargar la industria del usuario
      const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);
      
      let userIndustry = 'general';
      if (businessInfoDoc.exists()) {
        userIndustry = businessInfoDoc.data().industry || 'general';
      }
      
      // Obtener categorías directamente de categoryUtils
      const industryCategories = getCategoriesForIndustry(userIndustry);
      console.log('DashboardScreen - Cargando categorías para industria:', userIndustry);
      setCategories(industryCategories);
      
    } catch (error) {
      console.error('Error al cargar la industria:', error);
      // En caso de error, usar categorías generales
      const defaultCategories = getCategoriesForIndustry('general');
      setCategories(defaultCategories);
    }
  };
  
  const getCategoryIcon = (categoryId) => {
    // Iconos por defecto según el tipo de categoría
    const defaultIcons = {
      'general': 'cube-outline',
      'offers': 'pricetag-outline',
      'new': 'star-outline',
      'popular': 'flame-outline',
      'shirts': 'shirt-outline',
      'pants': 'cut-outline',
      'shoes': 'footsteps-outline',
      'accessories': 'watch-outline',
      'medications': 'medical-outline',
      'vitamins': 'fitness-outline',
      'dairy': 'nutrition-outline',
      'meat': 'restaurant-outline',
      'fruits': 'leaf-outline',
      'beverages': 'wine-outline',
      'smartphones': 'phone-portrait-outline',
      'computers': 'laptop-outline',
      'starters': 'restaurant-outline',
      'desserts': 'ice-cream-outline',
      'bread': 'fast-food-outline',
      'tools': 'construct-outline',
      'skincare': 'water-outline',
      'makeup': 'color-palette-outline',
      'fiction': 'book-outline',
      'nonfiction': 'document-text-outline',
      // Añadir más iconos según sea necesario
    };
    
    return defaultIcons[categoryId] || 'cube-outline'; // Icono por defecto
  };
  
  const getCategoryName = (categoryId, categoriesList) => {
    const category = categoriesList.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sin categoría';
  };
  
  const renderCategoryItem = ({ item }) => {
    const count = categoryCounts[item.id] || 0;
    
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => navigateToCategory(item.id)}
      >
        <View style={[styles.categoryIconContainer, { backgroundColor: getCategoryColor(item.id) }]}>
          <Ionicons name={getCategoryIcon(item.id)} size={24} color="white" />
        </View>
        <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.categoryCount}>{count} productos</Text>
      </TouchableOpacity>
    );
  };
  
  const getCategoryColor = (categoryId) => {
    // Colores para diferentes categorías
    const colors = {
      'general': '#4CAF50',
      'offers': '#FF9800',
      'new': '#2196F3',
      'popular': '#F44336',
      'shirts': '#9C27B0',
      'pants': '#3F51B5',
      'shoes': '#795548',
      'accessories': '#607D8B',
      'medications': '#00BCD4',
      'vitamins': '#8BC34A',
      'dairy': '#CDDC39',
      'meat': '#FF5722',
      'fruits': '#4CAF50',
      'beverages': '#03A9F4',
      'smartphones': '#E91E63',
      'computers': '#9E9E9E',
      'starters': '#FFC107',
      'desserts': '#E91E63',
      'bread': '#FF9800',
      'tools': '#607D8B',
      'skincare': '#00BCD4',
      'makeup': '#9C27B0',
      'fiction': '#3F51B5',
      'nonfiction': '#795548',
    };
    
    return colors[categoryId] || '#4CAF50'; // Color por defecto
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        {renderNotificationBell()}
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Tarjetas de estadísticas */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={viewInventoryValue}>
            <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="cube-outline" size={24} color="#28a745" />
            </View>
            <Text style={styles.statNumber}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statCard} onPress={viewLowStockProducts}>
            <View style={[styles.iconCircle, { backgroundColor: '#fff3e0' }]}>
              <Ionicons name="alert-outline" size={24} color="#ff9800" />
            </View>
            <Text style={styles.statNumber}>{stats.lowStockCount}</Text>
            <Text style={styles.statLabel}>Stock Bajo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statCard} onPress={viewAllSales}>
            <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}>
              <Ionicons name="cart-outline" size={24} color="#2196f3" />
            </View>
            <Text style={styles.statNumber}>{stats.totalSales}</Text>
            <Text style={styles.statLabel}>Ventas</Text>
          </TouchableOpacity>
        </View>
        
        {/* Tarjetas de valor de inventario e ingresos totales */}
        <View style={styles.valueContainer}>
          <TouchableOpacity style={styles.valueCard} onPress={viewInventoryValue}>
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueLabel}>Valor de Inventario</Text>
              <Text style={styles.valueNumber}>{formatPrice(stats.inventoryValue)}</Text>
            </View>
            <View style={[styles.valueIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="cash-outline" size={24} color="#28a745" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.valueCard} onPress={viewAllSales}>
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueLabel}>Ingresos Totales</Text>
              <Text style={styles.valueNumber}>{formatPrice(stats.totalIncome)}</Text>
            </View>
            <View style={[styles.valueIconContainer, { backgroundColor: '#e3f2fd' }]}>
              <Ionicons name="trending-up-outline" size={24} color="#2196f3" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Sección de categorías */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {categories.slice(0, 6).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => navigateToCategory(category.id)}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons 
                    name={getCategoryIcon(category.id)} 
                    size={24} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={styles.categoryName}>{getCategoryName(category.id, categories)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Sección de ventas recientes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ventas Recientes</Text>
            <TouchableOpacity onPress={viewAllSales}>
              <Text style={styles.viewAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          {recentSales.length > 0 ? (
            recentSales.map(sale => (
              <View key={sale.id} style={styles.saleItem}>
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
                <Text style={styles.saleTotal}>{formatPrice(sale.total || 0)}</Text>
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
        <Text style={styles.floatingButtonText}>Nueva Venta</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.floatingButton, styles.scanStockButton]}
        onPress={goToScanStock}
      >
        <Ionicons name="barcode-outline" size={24} color="white" />
        <Text style={styles.floatingButtonText}>Escanear Stock</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100, // Espacio para los botones flotantes
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  valueContainer: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  valueCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueTextContainer: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  valueNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  valueIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
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
  categoriesSection: {
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
  seeAllText: {
    color: colors.primary,
    fontWeight: '500',
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 5,
  },
  categoryCount: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary
  },
  notificationBell: {
    padding: 8,
    position: 'relative'
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  }
});