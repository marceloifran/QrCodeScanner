import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions
} from 'react-native';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

const SalesHistoryScreen = React.memo(function SalesHistoryScreen({ navigation }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('history');
  const [productStats, setProductStats] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const userId = auth.currentUser.uid;

  // Memoize the current date and time to prevent unnecessary recalculations
  const now = useMemo(() => new Date(), []);

  const getSalesQuery = useCallback(() => {
    let salesQuery;

    if (filter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      salesQuery = query(
            collection(db, 'sales'),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
            orderBy('date', 'desc')
          );
    } else if (filter === 'week') {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      salesQuery = query(
            collection(db, 'sales'),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(oneWeekAgo)),
            orderBy('date', 'desc')
          );
    } else if (filter === 'month') {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      salesQuery = query(
            collection(db, 'sales'),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(oneMonthAgo)),
            orderBy('date', 'desc')
          );
    } else {
      salesQuery = query(
            collection(db, 'sales'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
    }
    return salesQuery;
  }, [filter, userId, now]);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const salesQuery = getSalesQuery();
      const querySnapshot = await getDocs(salesQuery);

      const salesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
        id: doc.id,
          ...data,
          date: data.date ? data.date.toDate() : new Date(),
          items: data.items || []
        };
      });

      setSales(salesData);

      const total = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
      setTotalAmount(total);

      calculateProductStats(salesData);
      calculateCategoryStats(salesData);
      calculateDailySales(salesData);

    } catch (error) {
      console.error('Error al cargar ventas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  }, [getSalesQuery, calculateProductStats, calculateCategoryStats, calculateDailySales]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useFocusEffect(
    React.useCallback(() => {
      loadSales();
    }, [loadSales])
  );

  const calculateProductStats = useCallback((salesData) => {
    const productMap = {};

    salesData.forEach(sale => {
      if (!sale.items || !Array.isArray(sale.items)) {
        console.log('Venta sin items o items no es array:', sale.id);
        return;
      }

      sale.items.forEach(item => {
        if (!item) {
          console.log('Item nulo en venta:', sale.id);
          return;
        }

        const productId = item.id || 'unknown';
        const productName = item.name || 'Producto desconocido';

        if (!productMap[productId]) {
          productMap[productId] = {
            id: productId,
            name: productName,
            quantity: 0,
            revenue: 0
          };
        }

        const quantity = parseInt(item.quantity) || 1;
        const price = parseFloat(item.price) || 0;

        productMap[productId].quantity += quantity;
        productMap[productId].revenue += price * quantity;
      });
    });

    const productsArray = Object.values(productMap);
    productsArray.sort((a, b) => b.quantity - a.quantity);

    setProductStats(productsArray);
  }, []);

  const calculateCategoryStats = useCallback((salesData) => {
    const categoryMap = {};

    salesData.forEach(sale => {
      if (!sale.items) return;

      sale.items.forEach(item => {
        const category = item.category || 'Sin categoría';

        if (!categoryMap[category]) {
          categoryMap[category] = {
            name: category,
            quantity: 0,
            revenue: 0
          };
        }

        const quantity = parseInt(item.quantity) || 1;
        const price = parseFloat(item.price) || 0;

        categoryMap[category].quantity += quantity;
        categoryMap[category].revenue += price * quantity;
      });
    });

    const categoriesArray = Object.values(categoryMap);
    categoriesArray.sort((a, b) => b.revenue - a.revenue);

    setCategoryStats(categoriesArray);
  }, []);

  const calculateDailySales = useCallback((salesData) => {
    const dailyMap = {};

    salesData.forEach(sale => {
      const dateStr = sale.date.toISOString().split('T')[0];

      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = 0;
      }
      dailyMap[dateStr] += sale.total || 0;
    });

    const last7Days = [];
    const now = new Date(); // Use now inside the loop for accurate calculations
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now); // Create a new Date object for each iteration
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('es-AR', { weekday: 'short' });

        last7Days.push({
            date: dateStr,
            day: dayName,
            amount: dailyMap[dateStr] || 0
        });
    }

    setDailySales(last7Days);
  }, []);

  const filteredSales = useMemo(() => {
    return searchQuery
      ? sales.filter(sale =>
        sale.items.some(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
      : sales;
  }, [searchQuery, sales]);


  const renderItem = useCallback(({ item }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleDate}>
          {item.date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        <Text style={styles.saleTotal}>${formatPrice(item.total, 0)}</Text>
      </View>

      <View style={styles.itemsList}>
        {item.items.map((product, index) => (
          <Text key={`${item.id}-${index}`} style={styles.itemText}>
            {product.quantity}x {product.name} - ${formatPrice(product.price, 0)} c/u
          </Text>
        ))}
      </View>
    </View>
  ), []);

  const keyExtractor = useCallback((item) => item.id, []);


  const renderHistoryTab = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      );
    }

    if (filteredSales.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay ventas registradas</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredSales}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadSales}
      />
    );
  }, [filteredSales, loading, loadSales, renderItem, keyExtractor]);

  const renderProductStatItem = useCallback(({ item, index }) => {
    // Calcular el porcentaje del total
    const totalQuantity = productStats.reduce((sum, prod) => sum + prod.quantity, 0);
    const percentage = totalQuantity > 0 ? Math.round((item.quantity / totalQuantity) * 100) : 0;

    return (
      <View style={styles.statCard}>
        <View style={styles.statRank}>
          <Text style={styles.statRankText}>{index + 1}</Text>
        </View>

        <View style={styles.statInfo}>
          <Text style={styles.statName}>{item.name}</Text>

          <View style={styles.statDetails}>
            <View style={styles.statDetail}>
              <Ionicons name="cart-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.statDetailText}>{item.quantity} unidades</Text>
            </View>

            <View style={styles.statDetail}>
              <Ionicons name="cash-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.statDetailText}>${formatPrice(item.revenue, 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statPercentage}>
          <Text style={styles.statPercentageText}>{percentage}%</Text>
        </View>
      </View>
    );
  }, [productStats]);

  const renderCategoryStatItem = useCallback(({ item, index }) => {
    // Calcular el porcentaje del total
    const totalRevenue = categoryStats.reduce((sum, cat) => sum + cat.revenue, 0);
    const percentage = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;

    return (
      <View style={styles.statCard}>
        <View style={styles.statRank}>
          <Text style={styles.statRankText}>{index + 1}</Text>
        </View>

        <View style={styles.statInfo}>
          <Text style={styles.statName}>{item.name}</Text>

          <View style={styles.statDetails}>
            <View style={styles.statDetail}>
              <Ionicons name="cart-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.statDetailText}>{item.quantity} unidades</Text>
            </View>

            <View style={styles.statDetail}>
              <Ionicons name="cash-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.statDetailText}>${formatPrice(item.revenue, 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statPercentage}>
          <Text style={styles.statPercentageText}>{percentage}%</Text>
        </View>
      </View>
    );
  }, [categoryStats]);

  const productKeyExtractor = useCallback((item, index) => `${item.id}-${index}`, []);
  const categoryKeyExtractor = useCallback((item, index) => `${item.name}-${index}`, []);

  const renderProductsTab = useCallback(() => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Top 10 Productos más vendidos</Text>

      {productStats.length > 0 ? (
        <FlatList
          data={productStats.slice(0, 10)}
          keyExtractor={productKeyExtractor}
          renderItem={renderProductStatItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay datos de productos vendidos</Text>
        </View>
      )}
    </View>
  ), [productStats, renderProductStatItem, productKeyExtractor]);

  const renderCategoriesTab = useCallback(() => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Top 5 Categorías más vendidas</Text>

      {categoryStats.length > 0 ? (
        <FlatList
          data={categoryStats.slice(0, 5)}
          keyExtractor={categoryKeyExtractor}
          renderItem={renderCategoryStatItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay datos de categorías</Text>
        </View>
      )}
    </View>
  ), [categoryStats, renderCategoryStatItem, categoryKeyExtractor]);

  const getCategoryColor = useCallback((index) => {
    const colors = [
      '#4CAF50', // Verde
      '#2196F3', // Azul
      '#FFC107', // Amarillo
      '#FF5722', // Naranja
      '#9C27B0', // Púrpura
    ];

    return colors[index % colors.length];
  }, []);

  const renderBarChart = useCallback(() => {
    if (dailySales.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No hay datos disponibles</Text>
        </View>
      );
    }

    const maxAmount = Math.max(...dailySales.map(d => d.amount));

    return (
      <View style={styles.barChartContainer}>
        {dailySales.map((day, index) => {
          const barHeight = maxAmount > 0
            ? Math.max(10, (day.amount / maxAmount) * 150)
            : 10;

          return (
            <View key={`day-${index}`} style={styles.barChartItem}>
              <Text style={styles.barChartValueAbove}>
                ${formatPrice(day.amount, 0)}
              </Text>
              <View style={[styles.barChartBar, { height: barHeight }]} />
              <Text style={styles.barChartLabel}>{day.day}</Text>
            </View>
          );
        })}
      </View>
    );
  }, [dailySales]);


  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'history':
        return renderHistoryTab();
      case 'products':
        return renderProductsTab();
      default:
        return renderHistoryTab();
    }
  }, [activeTab, renderHistoryTab, renderProductsTab]);

  const renderFilterButtons = useCallback(() => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'today' && styles.filterButtonActive]}
        onPress={() => setFilter('today')}
      >
        <Text style={[styles.filterButtonText, filter === 'today' && styles.filterButtonTextActive]}>
          Hoy
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, filter === 'week' && styles.filterButtonActive]}
        onPress={() => setFilter('week')}
      >
        <Text style={[styles.filterButtonText, filter === 'week' && styles.filterButtonTextActive]}>
          Semana
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, filter === 'month' && styles.filterButtonActive]}
        onPress={() => setFilter('month')}
      >
        <Text style={[styles.filterButtonText, filter === 'month' && styles.filterButtonTextActive]}>
          Mes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
          Todas
        </Text>
      </TouchableOpacity>
    </View>
  ), [filter, setFilter]);

  const renderTabs = useCallback(() => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
        onPress={() => setActiveTab('history')}
      >
        <Ionicons name="time-outline" size={20} color={activeTab === 'history' ? colors.primary : colors.text.secondary} />
        <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>
          Historial
        </Text>
      </TouchableOpacity>

    <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'products' && styles.tabButtonActive]}
        onPress={() => setActiveTab('products')}
      >
        <Ionicons name="cube-outline" size={20} color={activeTab === 'products' ? colors.primary : colors.text.secondary} />
        <Text style={[styles.tabButtonText, activeTab === 'products' && styles.tabButtonTextActive]}>
          Productos
      </Text>
    </TouchableOpacity>

   
    </View>
  ), [activeTab, setActiveTab]);

    const summary = useMemo(() => ({
        totalSales: sales.length,
        totalRevenue: totalAmount,
        averageSale: sales.length > 0 ? totalAmount / sales.length : 0
    }), [sales, totalAmount]);

    const renderSummary = useCallback(() => (
        <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Ventas</Text>
                <Text style={styles.summaryValue}>{summary.totalSales}</Text>
            </View>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Ingresos</Text>
                <Text style={styles.summaryValue}>${formatPrice(summary.totalRevenue, 0)}</Text>
            </View>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Promedio</Text>
                <Text style={styles.summaryValue}>${formatPrice(summary.averageSale, 0)}</Text>
            </View>
        </View>
    ), [summary]);



  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ventas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      </View>

      {renderFilterButtons()}

      {renderSummary()}

      {renderTabs()}

      {renderContent()}
    </View>
  );
});

export default SalesHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
      backgroundColor: '#f5f5f5',
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    color: colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
      flex: 1,
  },
  searchInput: {
    flex: 1,
      padding: 10,
  },
  filterContainer: {
    flexDirection: 'row',
      justifyContent: 'space-around',
    padding: 10,
      backgroundColor: 'white',
  },
  filterButton: {
    paddingVertical: 8,
      paddingHorizontal: 12,
    borderRadius: 20,
      backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
      fontSize: 14,
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
      color: 'white',
      fontWeight: '600',
  },
  tabContainer: {
      flexDirection: 'row',
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
  },
  tabButtonActive: {
      borderBottomColor: colors.primary,
  },
  tabButtonText: {
      fontSize: 12,
      color: colors.text.secondary,
      marginLeft: 4,
  },
  tabButtonTextActive: {
      color: colors.primary,
      fontWeight: '600',
  },
  tabContent: {
      flex: 1,
  },
  summaryCard: {
      flexDirection: 'row',
      backgroundColor: 'white',
      padding: 15,
      margin: 10,
      borderRadius: 10,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
          width: 0,
          height: 1
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
  },
  summaryItem: {
      flex: 1,
      alignItems: 'center',
  },
  summaryLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 5,
  },
  summaryValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
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
  listContainer: {
    padding: 10,
  },
  saleCard: {
      backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
          width: 0,
          height: 1
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  saleDate: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  saleTotal: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  itemsList: {
    borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  itemText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 5,
  },
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 50,
  },
  emptyText: {
      marginTop: 10,
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
  },
  chartContainer: {
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 15,
      margin: 10,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
          width: 0,
          height: 1
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      alignItems: 'center',
  },
  chartTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 10,
  },
  barChartContainer: {
      flexDirection: 'row',
      height: 200,
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingTop: 20,
  },
  barChartItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
  },
  barChartBar: {
      width: 20,
      backgroundColor: colors.primary,
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
  },
  barChartValueAbove: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 5,
  },
  barChartLabel: {
      marginTop: 5,
      fontSize: 12,
      color: colors.text.secondary,
  },
  noDataContainer: {
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
  },
  noDataText: {
      color: colors.text.secondary,
      fontSize: 16,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text.primary,
      margin: 15,
  },
  statCard: {
      flexDirection: 'row',
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 15,
      marginHorizontal: 10,
      marginBottom: 10,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
          width: 0,
          height: 1
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      alignItems: 'center',
  },
  statRank: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
  },
  statRankText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
  },
  statInfo: {
      flex: 1,
  },
  statName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 5,
  },
  statDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
  },
  statDetail: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 15,
  },
  statDetailText: {
      fontSize: 13,
      color: colors.text.secondary,
      marginLeft: 4,
  },
  statPercentage: {
      backgroundColor: '#f0f0f0',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
  },
  statPercentageText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.text.primary,
  },
  tabsContainer: {
      flexDirection: 'row',
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  tipContainer: {
      backgroundColor: '#e8f5e9',
      borderRadius: 10,
      padding: 15,
      marginHorizontal: 10,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
  },
  tipText: {
      color: '#2e7d32',
      fontSize: 14,
  },
}); 