import React, { useState, useEffect } from 'react';
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

const screenWidth = Dimensions.get('window').width;

export default function SalesHistoryScreen({ navigation }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'today', 'week', 'month', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('history'); // 'history', 'analytics', 'products', 'categories'
  const [productStats, setProductStats] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [dailySales, setDailySales] = useState([]);

  useEffect(() => {
    loadSales();
  }, [filter]);

  const loadSales = async () => {
    setLoading(true);
    try {
      let salesQuery;
      const now = new Date();
      
      if (filter === 'today') {
        // Ventas de hoy
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        salesQuery = query(
          collection(db, 'sales'),
          where('userId', '==', auth.currentUser.uid),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          orderBy('date', 'desc')
        );
      } else if (filter === 'week') {
        // Ventas de la última semana
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        salesQuery = query(
          collection(db, 'sales'),
          where('userId', '==', auth.currentUser.uid),
          where('date', '>=', Timestamp.fromDate(oneWeekAgo)),
          orderBy('date', 'desc')
        );
      } else if (filter === 'month') {
        // Ventas del último mes
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        salesQuery = query(
          collection(db, 'sales'),
          where('userId', '==', auth.currentUser.uid),
          where('date', '>=', Timestamp.fromDate(oneMonthAgo)),
          orderBy('date', 'desc')
        );
      } else {
        // Todas las ventas
        salesQuery = query(
          collection(db, 'sales'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('date', 'desc')
        );
      }
      
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
      
      // Calcular total
      const total = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
      setTotalAmount(total);
      
      // Calcular estadísticas de productos
      calculateProductStats(salesData);
      
      // Calcular estadísticas de categorías
      calculateCategoryStats(salesData);
      
      // Calcular ventas diarias para el gráfico
      calculateDailySales(salesData);
      
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  const calculateProductStats = (salesData) => {
    // Crear un mapa para contar ventas por producto
    const productMap = {};
    
    salesData.forEach(sale => {
      if (!sale.items) return;
      
      sale.items.forEach(item => {
        if (!productMap[item.id]) {
          productMap[item.id] = {
            id: item.id,
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        productMap[item.id].quantity += item.quantity || 1;
        productMap[item.id].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    
    // Convertir a array y ordenar por cantidad
    const productsArray = Object.values(productMap);
    productsArray.sort((a, b) => b.quantity - a.quantity);
    
    setProductStats(productsArray);
  };

  const calculateCategoryStats = (salesData) => {
    // Crear un mapa para contar ventas por categoría
    const categoryMap = {};
    
    // Asegurarse de que todas las ventas tengan categoría
    salesData.forEach(sale => {
      if (!sale.items) return;
      
      sale.items.forEach(item => {
        // Usar 'Sin categoría' si no hay categoría
        const category = item.category || 'Sin categoría';
        
        if (!categoryMap[category]) {
          categoryMap[category] = {
            name: category,
            quantity: 0,
            revenue: 0
          };
        }
        
        // Asegurarse de que quantity y price sean números
        const quantity = parseInt(item.quantity) || 1;
        const price = parseFloat(item.price) || 0;
        
        categoryMap[category].quantity += quantity;
        categoryMap[category].revenue += price * quantity;
      });
    });
    
    // Convertir a array y ordenar por ingresos
    const categoriesArray = Object.values(categoryMap);
    categoriesArray.sort((a, b) => b.revenue - a.revenue);
    
    // Imprimir para depuración
    console.log('Categorías encontradas:', categoriesArray.length);
    console.log('Categorías:', categoriesArray.map(c => c.name));
    
    setCategoryStats(categoriesArray);
  };

  const calculateDailySales = (salesData) => {
    // Agrupar ventas por día
    const dailyMap = {};
    
    salesData.forEach(sale => {
      const dateStr = sale.date.toISOString().split('T')[0];
      
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = 0;
      }
      dailyMap[dateStr] += sale.total || 0;
    });
    
    // Obtener los últimos 7 días
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
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
  };

  const renderFilterButtons = () => (
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
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
        onPress={() => setActiveTab('history')}
      >
        <Ionicons name="receipt-outline" size={18} color={activeTab === 'history' ? colors.primary : colors.text.secondary} />
        <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>
          Historial
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'analytics' && styles.tabButtonActive]}
        onPress={() => setActiveTab('analytics')}
      >
        <Ionicons name="bar-chart" size={18} color={activeTab === 'analytics' ? colors.primary : colors.text.secondary} />
        <Text style={[styles.tabButtonText, activeTab === 'analytics' && styles.tabButtonTextActive]}>
          Análisis
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Total Ventas</Text>
        <Text style={styles.summaryValue}>${formatPrice(totalAmount, 0)}</Text>
      </View>
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Cantidad</Text>
        <Text style={styles.summaryValue}>{sales.length}</Text>
      </View>
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Promedio</Text>
        <Text style={styles.summaryValue}>
          ${formatPrice(sales.length > 0 ? totalAmount / sales.length : 0, 0)}
        </Text>
      </View>
    </View>
  );

  const renderBarChart = () => {
    if (dailySales.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No hay datos disponibles</Text>
        </View>
      );
    }

    // Encontrar el valor máximo para escalar las barras
    const maxAmount = Math.max(...dailySales.map(d => d.amount));
    
    return (
      <View style={styles.barChartContainer}>
        {dailySales.map((day, index) => {
          // Calcular la altura de la barra (mínimo 10px, máximo 150px)
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
  };

  const renderHistoryTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      );
    }
    
    if (sales.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay ventas registradas</Text>
        </View>
      );
    }
    
    // Filtrar ventas por búsqueda
    const filteredSales = searchQuery
      ? sales.filter(sale => 
          sale.items.some(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
      : sales;
    
    return (
      <FlatList
        data={filteredSales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
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
        )}
        refreshing={loading}
        onRefresh={loadSales}
      />
    );
  };

  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Productos más vendidos</Text>
      
      {productStats.length > 0 ? (
        <FlatList
          data={productStats.slice(0, 10)} // Top 10
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
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
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay datos de productos</Text>
        </View>
      )}
    </View>
  );

  const renderCategoriesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Categorías más vendidas</Text>
      
      {categoryStats.length > 0 ? (
        <FlatList
          data={categoryStats}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={({ item, index }) => {
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
          }}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay datos de categorías</Text>
        </View>
      )}
    </View>
  );

  const renderAnalyticsTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      );
    }

    // Calcular el total de ventas para porcentajes
    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    
    // Obtener top 5 productos
    const top5Products = productStats.slice(0, 5);
    
    // Obtener top 5 categorías
    const top5Categories = categoryStats.slice(0, 5);
    
    return (
      <ScrollView style={styles.tabContent}>
        {/* Resumen de ventas */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Ventas</Text>
            <Text style={styles.summaryValue}>${formatPrice(totalAmount, 0)}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cantidad</Text>
            <Text style={styles.summaryValue}>{sales.length}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Promedio</Text>
            <Text style={styles.summaryValue}>
              ${formatPrice(sales.length > 0 ? totalAmount / sales.length : 0, 0)}
            </Text>
          </View>
        </View>
        
        {/* Gráfico de barras simple para ventas diarias */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Ventas de los últimos 7 días</Text>
          {renderBarChart()}
        </View>
        
        {/* Top 5 Productos Más Vendidos */}
        <Text style={styles.sectionTitle}>Top 5 Productos Más Vendidos</Text>
        
        {top5Products.length > 0 ? (
          top5Products.map((product, index) => {
            // Calcular el porcentaje del total
            const percentage = totalSalesAmount > 0 
              ? ((product.revenue / totalSalesAmount) * 100).toFixed(1) 
              : 0;
            
            return (
              <View key={`product-${index}`} style={styles.statCard}>
                <View style={styles.statRank}>
                  <Text style={styles.statRankText}>{index + 1}</Text>
                </View>
                
                <View style={styles.statInfo}>
                  <Text style={styles.statName}>{product.name}</Text>
                  
                  <View style={styles.statDetails}>
                    <View style={styles.statDetail}>
                      <Ionicons name="cube-outline" size={14} color={colors.text.secondary} />
                      <Text style={styles.statDetailText}>
                        {product.quantity} unidades
                      </Text>
                    </View>
                    
                    <View style={styles.statDetail}>
                      <Ionicons name="cash-outline" size={14} color={colors.primary} />
                      <Text style={[styles.statDetailText, {color: colors.primary}]}>
                        ${formatPrice(product.revenue, 0)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.statPercentage}>
                  <Text style={styles.statPercentageText}>{percentage}%</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay datos de productos</Text>
          </View>
        )}
        
        {/* Top 5 Categorías Más Vendidas */}
        <Text style={styles.sectionTitle}>Top 5 Categorías Más Vendidas</Text>
        
        {categoryStats.length > 0 ? (
          categoryStats.slice(0, 5).map((category, index) => {
            // Calcular el porcentaje del total
            const percentage = totalSalesAmount > 0 
              ? ((category.revenue / totalSalesAmount) * 100).toFixed(1) 
              : 0;
            
            return (
              <View key={`category-${index}`} style={styles.statCard}>
                <View style={[styles.statRank, {backgroundColor: getCategoryColor(index)}]}>
                  <Text style={styles.statRankText}>{index + 1}</Text>
                </View>
                
                <View style={styles.statInfo}>
                  <Text style={styles.statName}>{category.name}</Text>
                  
                  <View style={styles.statDetails}>
                    <View style={styles.statDetail}>
                      <Ionicons name="pricetag-outline" size={14} color={colors.text.secondary} />
                      <Text style={styles.statDetailText}>
                        {category.quantity} unidades
                      </Text>
                    </View>
                    
                    <View style={styles.statDetail}>
                      <Ionicons name="cash-outline" size={14} color={colors.primary} />
                      <Text style={[styles.statDetailText, {color: colors.primary}]}>
                        ${formatPrice(category.revenue, 0)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.statPercentage}>
                  <Text style={styles.statPercentageText}>{percentage}%</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay datos de categorías</Text>
          </View>
        )}
        
        {categoryStats.length === 1 && (
          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>
              Consejo: Asigna categorías a tus productos para ver estadísticas más detalladas.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // Función para obtener colores para las categorías
  const getCategoryColor = (index) => {
    const colors = [
      '#4CAF50', // Verde
      '#2196F3', // Azul
      '#FFC107', // Amarillo
      '#FF5722', // Naranja
      '#9C27B0', // Púrpura
    ];
    
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando ventas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtros de tiempo */}
      {renderFilterButtons()}
      
      {/* Pestañas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons 
            name="list" 
            size={18} 
            color={activeTab === 'history' ? colors.primary : colors.text.secondary} 
          />
          <Text 
            style={[
              styles.tabButtonText, 
              activeTab === 'history' && styles.tabButtonTextActive
            ]}
          >
            Historial
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'analytics' && styles.tabButtonActive]}
          onPress={() => setActiveTab('analytics')}
        >
          <Ionicons 
            name="bar-chart" 
            size={18} 
            color={activeTab === 'analytics' ? colors.primary : colors.text.secondary} 
          />
          <Text 
            style={[
              styles.tabButtonText, 
              activeTab === 'analytics' && styles.tabButtonTextActive
            ]}
          >
            Análisis
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Contenido de la pestaña activa */}
      {activeTab === 'history' ? renderHistoryTab() : renderAnalyticsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    shadowOffset: { width: 0, height: 1 },
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
    shadowOffset: { width: 0, height: 1 },
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
    shadowOffset: { width: 0, height: 1 },
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
    shadowOffset: { width: 0, height: 1 },
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