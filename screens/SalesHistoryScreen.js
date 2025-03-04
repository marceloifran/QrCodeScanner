import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator 
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SalesHistoryScreen() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('day'); // 'day', 'week', 'month', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  const loadSales = async (filter = filterType) => {
    setLoading(true);
    try {
      let startDate = new Date();
      let q;

      switch (filter) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          q = query(
            collection(db, 'sales'),
            where('date', '>=', startDate),
            orderBy('date', 'desc')
          );
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          q = query(
            collection(db, 'sales'),
            where('date', '>=', startDate),
            orderBy('date', 'desc')
          );
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          q = query(
            collection(db, 'sales'),
            where('date', '>=', startDate),
            orderBy('date', 'desc')
          );
          break;
        default:
          q = query(collection(db, 'sales'), orderBy('date', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      }));

      setSales(salesData);
      calculateTotal(salesData);
    } catch (error) {
      console.error('Error loading sales:', error);
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

  useEffect(() => {
    loadSales();
  }, [filterType]);

  const FilterButton = ({ title, type }) => (
    <TouchableOpacity 
      style={[
        styles.filterButton, 
        filterType === type && styles.filterButtonActive
      ]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[
        styles.filterButtonText,
        filterType === type && styles.filterButtonTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Ventas</Text>
        <Text style={styles.totalAmount}>
          Total: ${totalAmount.toFixed(2)}
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
        <FilterButton title="Hoy" type="day" />
        <FilterButton title="Semana" type="week" />
        <FilterButton title="Mes" type="month" />
        <FilterButton title="Todo" type="all" />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={filterSales()}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <Text style={styles.saleDate}>
                  {item.date.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
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
}); 