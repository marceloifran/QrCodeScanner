import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  ImageBackground
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';
import { getCategoryName, getCategoryIcon } from '../constants/categories';
// import { LinearGradient } from 'expo-linear-gradient';

// Componente para gráfico de barras horizontal (más explicativo)
const BarChart = ({ data, onBarPress }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <View style={styles.barChartContainer}>
      {data.map((item, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.barChartItem}
          onPress={() => onBarPress(item.id)}
        >
          <View style={styles.barLabelContainer}>
            <Ionicons name={item.icon} size={18} color={colors.primary} />
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
          <View style={styles.barContainer}>
            <View 
              style={[
                styles.bar, 
                { width: `${(item.value / maxValue) * 100}%` }
              ]} 
            />
            <Text style={styles.barValue}>{item.value}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    recentSales: [],
    topProducts: [],
    categoryCounts: []
  });
  const [businessInfo, setBusinessInfo] = useState(null);
  
  useEffect(() => {
    loadStats();
    loadBusinessInfo();
  }, []);
  
  const loadBusinessInfo = async () => {
    try {
      const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);
      
      if (businessInfoDoc.exists()) {
        setBusinessInfo(businessInfoDoc.data());
      }
    } catch (error) {
      console.error('Error al cargar información del negocio:', error);
    }
  };
  
  const loadStats = async () => {
    setLoading(true);
    try {
      // Cargar productos
      const productsQuery = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Contar productos por categoría
      const categoryCounts = {};
      products.forEach(product => {
        if (categoryCounts[product.category]) {
          categoryCounts[product.category]++;
        } else {
          categoryCounts[product.category] = 1;
        }
      });
      
      // Convertir a array para gráfico
      const categoryCountsArray = Object.keys(categoryCounts).map(categoryId => ({
        id: categoryId,
        label: getCategoryName(categoryId),
        icon: getCategoryIcon(categoryId),
        value: categoryCounts[categoryId]
      })).sort((a, b) => b.value - a.value);
      
      // Contar productos con stock bajo
      const lowStockProducts = products.filter(product => product.stock <= 5).length;
      
      // Cargar ventas recientes
      const salesQuery = query(
        collection(db, 'sales'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('date', 'desc'),
        limit(5)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const recentSales = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));
      
      // Calcular total de ventas y revenue
      const totalSales = recentSales.length;
      const totalRevenue = recentSales.reduce((sum, sale) => sum + sale.total, 0);
      
      // Actualizar estado
      setStats({
        totalProducts: products.length,
        totalSales,
        totalRevenue,
        lowStockProducts,
        recentSales,
        topProducts: products.sort((a, b) => b.stock - a.stock).slice(0, 5),
        categoryCounts: categoryCountsArray
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCategoryPress = (categoryId) => {
    navigation.navigate('ProductList', { selectedCategory: categoryId });
  };
  
  const handleLowStockPress = () => {
    navigation.navigate('ProductList', { filterLowStock: true });
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.businessName}>{businessInfo?.name || 'Mi Negocio'}</Text>
        <Text style={styles.totalRevenue}>{formatPrice(stats.totalRevenue)}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}
            onPress={() => navigation.navigate('ProductList')}
          >
            <Ionicons name="cube-outline" size={24} color="#2e7d32" />
            <Text style={[styles.statValue, { color: '#2e7d32' }]}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#fff3e0' }]}
            onPress={handleLowStockPress}
          >
            <Ionicons name="alert-circle-outline" size={24} color="#ef6c00" />
            <Text style={[styles.statValue, { color: '#ef6c00' }]}>{stats.lowStockProducts}</Text>
            <Text style={styles.statLabel}>Stock Bajo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}
            onPress={() => navigation.navigate('SalesHistory')}
          >
            <Ionicons name="cart-outline" size={24} color="#1565c0" />
            <Text style={[styles.statValue, { color: '#1565c0' }]}>{stats.totalSales}</Text>
            <Text style={styles.statLabel}>Ventas</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AddProduct')}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="add" size={28} color="white" />
            </View>
            <Text style={styles.quickActionText}>Agregar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('ScanProduct')}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="scan" size={28} color="white" />
            </View>
            <Text style={styles.quickActionText}>Escanear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('ProductList')}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="list" size={28} color="white" />
            </View>
            <Text style={styles.quickActionText}>Productos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('SalesHistory')}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="receipt" size={28} color="white" />
            </View>
            <Text style={styles.quickActionText}>Ventas</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ventas Recientes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SalesHistory')}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          {stats.recentSales.length > 0 ? (
            stats.recentSales.map((sale, index) => (
              <View key={sale.id} style={styles.saleItem}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleDate}>
                    {sale.date.toLocaleDateString()} {sale.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.saleTotal}>{formatPrice(sale.total)}</Text>
                </View>
                <Text style={styles.saleItems}>
                  {sale.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay ventas recientes</Text>
          )}
        </View>
        
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.categoriesGrid}>
            {stats.categoryCounts.slice(0, 6).map((category) => (
              <TouchableOpacity 
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.id)}
              >
                <Ionicons name={category.icon} size={24} color={colors.primary} />
                <Text style={styles.categoryName}>{category.label}</Text>
                <Text style={styles.categoryCount}>{category.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    backgroundColor: '#28a745',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  businessName: {
    fontSize: 18,
    color: 'white',
    marginBottom: 5,
  },
  totalRevenue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  actionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
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
    color: colors.text.primary,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 14,
  },
  saleItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  saleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  saleDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saleItems: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '30%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 12,
    color: colors.text.primary,
    marginTop: 5,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginVertical: 10,
  },
  barChartContainer: {
    marginVertical: 10,
  },
  barChartItem: {
    marginBottom: 15,
  },
  barLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  barLabel: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
  },
  barContainer: {
    height: 25,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  barValue: {
    position: 'absolute',
    right: 10,
    color: '#333',
    fontWeight: 'bold',
    fontSize: 12,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
}); 