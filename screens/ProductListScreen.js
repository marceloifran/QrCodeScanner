import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Alert
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { colors } from '../theme/colors';
import { predefinedCategories } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../utils/formatters';

export default function ProductListScreen({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState({});
  
  // Verificar si estamos en modo selección (para ventas)
  const isSelecting = route.params?.isSelecting || false;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProducts();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Si se recibió un parámetro para filtrar por stock bajo, aplicarlo
    if (route.params?.filterLowStock) {
      setLowStockFilter(true);
    } else {
      setLowStockFilter(false);
    }
    
    // Si se recibió una categoría seleccionada, aplicarla
    if (route.params?.selectedCategory) {
      setSelectedCategory(route.params.selectedCategory);
    }
  }, [route.params]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory, lowStockFilter]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProducts(productsList);
      
      // Contar productos por categoría
      const counts = {};
      productsList.forEach(product => {
        if (counts[product.category]) {
          counts[product.category]++;
        } else {
          counts[product.category] = 1;
        }
      });
      
      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];
    
    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filtrar por stock bajo
    if (lowStockFilter) {
      filtered = filtered.filter(product => product.stock <= 5);
    }
    
    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.price.toString().includes(query)
      );
    }
    
    setFilteredProducts(filtered);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setLowStockFilter(false);
    setSearchQuery('');
    navigation.setParams({ filterLowStock: false, selectedCategory: null });
  };

  const getStockColor = (stock) => {
    if (stock <= 0) return colors.error; // Rojo para sin stock
    if (stock <= 5) return '#FFA500'; // Naranja para stock bajo
    return colors.success; // Verde para stock normal
  };

  const renderCategoryFilter = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === null && !lowStockFilter && styles.categoryChipSelected
          ]}
          onPress={() => {
            setSelectedCategory(null);
            setLowStockFilter(false);
            navigation.setParams({ filterLowStock: false, selectedCategory: null });
          }}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === null && !lowStockFilter && styles.categoryChipTextSelected
            ]}
          >
            Todos ({products.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.categoryChip,
            lowStockFilter && styles.categoryChipSelected,
            { backgroundColor: lowStockFilter ? '#FFA500' : colors.surface }
          ]}
          onPress={() => {
            setLowStockFilter(!lowStockFilter);
            navigation.setParams({ filterLowStock: !lowStockFilter });
          }}
        >
          <Text
            style={[
              styles.categoryChipText,
              lowStockFilter && styles.categoryChipTextSelected
            ]}
          >
            Stock Bajo ({products.filter(p => p.stock <= 5).length})
          </Text>
        </TouchableOpacity>
        
        {predefinedCategories.map(cat => {
          const count = categoryCounts[cat.id] || 0;
          if (count === 0) return null; // No mostrar categorías sin productos
          
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipSelected
              ]}
              onPress={() => {
                setSelectedCategory(cat.id);
                setLowStockFilter(false);
                navigation.setParams({ filterLowStock: false, selectedCategory: cat.id });
              }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextSelected
                ]}
              >
                {cat.name} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {(selectedCategory || lowStockFilter || searchQuery) && (
        <TouchableOpacity
          style={styles.clearFiltersButton}
          onPress={clearFilters}
        >
          <Ionicons name="close-circle" size={16} color="white" />
          <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => {
        // Cerrar el teclado y navegar en una sola acción
        Keyboard.dismiss();
        
        if (isSelecting) {
          // Si estamos seleccionando para una venta
          navigation.navigate('Cart', { selectedProduct: item });
        } else {
          // Si estamos en modo normal (edición)
          navigation.navigate('EditProduct', { productId: item.id });
        }
      }}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        {item.barcode && (
          <Text style={styles.productBarcode}>{item.barcode}</Text>
        )}
        <Text style={styles.productCategory}>
          {predefinedCategories.find(cat => cat.id === item.category)?.name || 'Sin categoría'}
        </Text>
        <Text style={styles.productPrice}>${formatPrice(item.price)}</Text>
        <Text style={[styles.productStock, { color: getStockColor(item.stock) }]}>
          Stock: {item.stock} {item.stock <= 5 ? '(Bajo)' : ''}
        </Text>
      </View>
      
      {isSelecting && (
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={() => {
            navigation.navigate('Cart', { selectedProduct: item });
          }}
        >
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {renderCategoryFilter()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {filteredProducts.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          
          <FlatList
            data={filteredProducts}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="basket" size={50} color={colors.text.secondary} />
                <Text style={styles.emptyText}>
                  {selectedCategory 
                    ? `No hay productos en la categoría ${predefinedCategories.find(c => c.id === selectedCategory)?.name || ''}`
                    : lowStockFilter
                      ? "No hay productos con stock bajo"
                      : searchQuery 
                        ? `No se encontraron productos para "${searchQuery}"`
                        : "No hay productos registrados"}
                </Text>
                <TouchableOpacity 
                  style={styles.emptyAddButton}
                  onPress={() => navigation.navigate('AddProduct')}
                >
                  <Text style={styles.emptyAddButtonText}>Agregar Producto</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </>
      )}
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    margin: 10,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text.primary,
  },
  filtersContainer: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 25,
    marginRight: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
  clearFiltersText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  resultsCount: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  listContainer: {
    padding: 10,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 5,
  },
  productBarcode: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  productCategory: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  productStock: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addToCartButton: {
    padding: 10,
  },
}); 