import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';
import { useSales } from '../hooks/useSales';

export default function SalesHistoryScreen({ navigation }) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { sales, loading } = useSales(filter);

  // Filtrar ventas por búsqueda
  const filteredSales = useMemo(() => {
    if (!searchQuery) return sales;

    const searchLower = searchQuery.toLowerCase();
    return sales.filter((sale) => {
      // Buscar en items
      const hasProduct = sale.items.some(
        (item) => item.name.toLowerCase().includes(searchLower)
      );
      
      // Buscar en total o fecha
      const matchesTotal = sale.total.toString().includes(searchLower);
      
      // Verificar si date existe y tiene la propiedad seconds
      let matchesDate = false;
      if (sale.date && typeof sale.date === 'object' && 'seconds' in sale.date) {
        const dateStr = new Date(sale.date.seconds * 1000).toLocaleDateString();
        matchesDate = dateStr.includes(searchLower);
      }
        
      return hasProduct || matchesTotal || matchesDate;
    });
  }, [sales, searchQuery]);

  // Renderizar una venta
  const renderSaleItem = useCallback(({ item }) => {
    // Formatear fecha con manejo de errores
    let formattedDate = "Fecha no disponible";
    try {
      if (item.date && typeof item.date === 'object' && 'seconds' in item.date) {
        const saleDate = new Date(item.date.seconds * 1000);
        formattedDate = saleDate.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        }) + ' ' + saleDate.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (item.date instanceof Date) {
        formattedDate = item.date.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      console.error('Error al formatear fecha:', error);
    }
    
    // Obtener el primer producto para mostrar como ejemplo
    const firstProduct = item.items && item.items.length > 0 ? item.items[0] : { name: 'Producto' };
    const additionalItems = item.items && item.items.length > 1 
      ? `y ${item.items.length - 1} producto${item.items.length > 2 ? 's' : ''} más` 
      : '';
    
    return (
      <TouchableOpacity 
        style={styles.saleCard}
        onPress={() => {
          // Mostrar detalles en un Alert en lugar de navegar a una pantalla que no existe
          Alert.alert(
            'Detalles de la venta',
            `Fecha: ${formattedDate}\nTotal: ${formatPrice(item.total)}\n\nProductos:\n${
              item.items.map(product => 
                `- ${product.name} x${product.quantity} (${formatPrice(product.price * product.quantity)})`
              ).join('\n')
            }`,
            [{ text: 'Cerrar' }]
          );
        }}
      >
        <View style={styles.saleHeader}>
          <Text style={styles.saleDate}>{formattedDate}</Text>
          <Text style={styles.saleTotal}>{formatPrice(item.total)}</Text>
        </View>
        
        <View style={styles.saleContent}>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {firstProduct.name} {additionalItems && `(${additionalItems})`}
            </Text>
            <Text style={styles.itemCount}>
              {item.items && item.items.length > 0 
                ? item.items.reduce((sum, product) => sum + (product.quantity || 0), 0) 
                : 0} artículos
            </Text>
          </View>
          
          <View style={styles.saleActions}>
            <Ionicons name="eye-outline" size={20} color="#aaa" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  // Agregar un componente de resumen en la parte superior de la pantalla
  const SalesSummary = ({ sales }) => {
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalSales}</Text>
          <Text style={styles.summaryLabel}>Ventas</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatPrice(totalRevenue)}</Text>
          <Text style={styles.summaryLabel}>Ingresos</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#aaa" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ventas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#aaa" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtros de período */}
      <View style={styles.filterContainer}>
        {['today', 'week', 'month', 'all'].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filterButton, filter === item && styles.filterButtonActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={filter === item ? styles.filterButtonTextActive : styles.filterButtonText}>
              {item === 'today' ? 'Hoy' : 
               item === 'week' ? 'Semana' : 
               item === 'month' ? 'Mes' : 'Todas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resumen de ventas */}
      <SalesSummary sales={filteredSales} />

      {/* Lista de ventas */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          renderItem={renderSaleItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={50} color="#ddd" />
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
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterButtonActive: {
    borderBottomColor: colors.primary,
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 10,
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  saleDate: {
    fontSize: 14,
    color: '#666',
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: '#888',
  },
  saleActions: {
    paddingLeft: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 15,
    marginTop: 5,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
});