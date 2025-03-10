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
  Share,
  Platform
} from 'react-native';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../utils/formatters';
import { doc, getDoc } from 'firebase/firestore';

export default function SalesHistoryScreen({ navigation }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'today', 'week', 'month', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

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
      const salesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));
      
      setSales(salesData);
      calculateTotal(salesData);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (salesData) => {
    const total = salesData.reduce((sum, sale) => sum + sale.total, 0);
    setTotalAmount(total);
  };

  const filterSales = () => {
    if (!searchQuery) return sales;
    
    return sales.filter(sale => {
      const searchLower = searchQuery.toLowerCase();
      // Buscar en productos vendidos
      const hasProduct = sale.items.some(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.quantity.toString().includes(searchLower) ||
        item.price.toString().includes(searchLower)
      );
      // Buscar en total
      const matchesTotal = sale.total.toString().includes(searchLower);
      // Buscar en fecha
      const matchesDate = sale.date.toLocaleDateString().includes(searchQuery);
      
      return hasProduct || matchesTotal || matchesDate;
    });
  };

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

  useEffect(() => {
    loadSales();
    loadBusinessInfo();
  }, [filter]);

  const getTotalRevenue = () => {
    return sales.reduce((sum, sale) => sum + sale.total, 0);
  };

  const getFilterTitle = () => {
    switch (filter) {
      case 'today': return 'Hoy';
      case 'week': return 'Última Semana';
      case 'month': return 'Último Mes';
      default: return 'Todas las Ventas';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.totalAmount}>
          Ventas: {sales.length} | Total: ${getTotalRevenue().toFixed(2)}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ventas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'today' && styles.filterButtonActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.filterButtonText, filter === 'today' && styles.filterButtonTextActive]}>Hoy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'week' && styles.filterButtonActive]}
          onPress={() => setFilter('week')}
        >
          <Text style={[styles.filterButtonText, filter === 'week' && styles.filterButtonTextActive]}>Semana</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'month' && styles.filterButtonActive]}
          onPress={() => setFilter('month')}
        >
          <Text style={[styles.filterButtonText, filter === 'month' && styles.filterButtonTextActive]}>Mes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>Todas</Text>
        </TouchableOpacity>
      </View>

    

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filterSales()}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <Text style={styles.saleDate}>
                  {formatDate(item.date)}
                </Text>
                <Text style={styles.saleTotal}>
                  ${item.total.toFixed(2)}
                </Text>
              </View>
              <View style={styles.itemsList}>
                {item.items.map((product, index) => (
                  <Text key={index} style={styles.itemText}>
                    {product.quantity}x {product.name} - ${product.price.toFixed(2)}
                  </Text>
                ))}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>No hay ventas para mostrar</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalAmount: {
    fontSize: 18,
    color: colors.primary,
    marginTop: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    margin: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-between',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: colors.background,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loader: {
    marginTop: 50,
  },
  listContainer: {
    padding: 10,
  },
  saleCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderTopColor: colors.border,
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
  backButton: {
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 10,
  },
}); 