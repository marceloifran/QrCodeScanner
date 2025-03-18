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
  RefreshControl,
  ScrollView
} from 'react-native';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';
import { getCategoryName, getCategoryIcon, predefinedCategories } from '../constants/categories';
import { useProducts } from '../hooks/useProducts';

export default function ProductListScreen({ navigation, route }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [zeroStockFilter, setZeroStockFilter] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const { products, loading, loadProducts } = useProducts();
  
  const isSelecting = route.params?.isSelecting || false;
  
  useEffect(() => {
    // Verificar si hay parámetros de navegación para filtros
    if (route.params) {
      // Filtro de stock bajo
      if (route.params.filter === 'lowStock') {
        setLowStockFilter(true);
        setSelectedCategory(null);
      }
      //Filtro de stock 0
      if (route.params.filter === 'zeroStock') {
        setZeroStockFilter(true);
        setSelectedCategory(null);
      }
      
      // Filtro por categoría
      if (route.params.filter === 'category' && route.params.category) {
        const categoryParam = route.params.category;
        
        // Verificar si es un ID o un nombre
        const categoryById = predefinedCategories.find(cat => cat.id === categoryParam);
        
        if (categoryById) {
          // Si es un ID, usarlo directamente
          setSelectedCategory(categoryParam);
        } else {
          // Si es un nombre, buscar el ID correspondiente
          const categoryByName = predefinedCategories.find(cat => cat.name === categoryParam);
          if (categoryByName) {
            setSelectedCategory(categoryByName.id);
          } else {
            // Si no se encuentra, podría ser una categoría personalizada
            setSelectedCategory(categoryParam);
          }
        }
        
        setLowStockFilter(false);
      }
    }
    
    loadProducts();
  }, [route.params]);
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProducts);
    return unsubscribe;
  }, [navigation, loadProducts]);
  
  useEffect(() => {
    if (products.length > 0) {
    }
  }, [products]);
  
  useEffect(() => {
    // Verificar qué categorías tienen productos
    if (products.length > 0) {
      // Agrupar productos por categoría
      const productsByCategory = {};
      products.forEach(p => {
        if (p.category) {
          if (!productsByCategory[p.category]) {
            productsByCategory[p.category] = [];
          }
          productsByCategory[p.category].push(p.name);
        }
      });
      
      
      // Verificar si hay categorías en productos que no están en predefinedCategories
      const productCategories = Object.keys(productsByCategory);
      const predefinedCategoryIds = predefinedCategories.map(c => c.id);
      
      const missingCategories = productCategories.filter(cat => !predefinedCategoryIds.includes(cat));
      if (missingCategories.length > 0) {
      }
    }
  }, [products]);
  
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    if (selectedCategory) {
      // Intentar diferentes estrategias de filtrado
      result = result.filter(product => {
        // Coincidencia directa por ID
        if (product.category === selectedCategory) {
          return true;
        }
        
        // Coincidencia por nombre (para casos donde se guarda el nombre en lugar del ID)
        const categoryName = getCategoryName(selectedCategory);
        if (product.category === categoryName) {
          return true;
        }
        
        // Coincidencia parcial (para casos de inconsistencia)
        if (product.category && selectedCategory && 
            (product.category.includes(selectedCategory) || 
             selectedCategory.includes(product.category))) {
          return true;
        }
        
        return false;
      });
    }
    
    if (lowStockFilter) {
      result = result.filter(product => product.stock <= 5);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(query) || 
        (product.barcode && product.barcode.includes(query)) ||
        product.price.toString().includes(query)
      );
    }
    
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'price':
          valueA = a.price || 0;
          valueB = b.price || 0;
          break;
        case 'stock':
          valueA = a.stock || 0;
          valueB = b.stock || 0;
          break;
        default: // name
          valueA = a.name || '';
          valueB = b.name || '';
          break;
      }
      
      if (typeof valueA === 'string') {
        return sortOrder === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      } else {
        return sortOrder === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      }
    });
    
    return result;
  }, [products, selectedCategory, lowStockFilter, searchQuery, sortBy, sortOrder]);
  
  const categoryCounts = useMemo(() => {
    const counts = {};
    
    // Inicializar todas las categorías predefinidas con 0
    predefinedCategories.forEach(cat => {
      counts[cat.id] = 0;
    });
    
    // Contar productos por categoría
    products.forEach(product => {
      if (product.category) {
        // Verificar si la categoría existe en predefinedCategories
        const categoryExists = predefinedCategories.some(cat => cat.id === product.category);
        
        if (categoryExists) {
          // Si existe, incrementar el contador
          counts[product.category] = (counts[product.category] || 0) + 1;
        } else {

        }
      }
    });
    
    return counts;
  }, [products]);
  
  const categoryValues = useMemo(() => {
    const values = {};
    
    // Inicializar todas las categorías predefinidas con 0
    predefinedCategories.forEach(cat => {
      values[cat.id] = 0;
    });
    
    // Calcular valor monetario por categoría
    products.forEach(product => {
      if (product.category) {
        // Verificar si la categoría existe en predefinedCategories
        const categoryExists = predefinedCategories.some(cat => cat.id === product.category);
        
        if (categoryExists) {
          // Sumar el valor del producto (precio * stock)
          const productValue = (product.price || 0) * (product.stock || 0);
          values[product.category] = (values[product.category] || 0) + productValue;
        }
      }
    });
    
    return values;
  }, [products]);
  
  const toggleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);
  
  const clearFilters = useCallback(() => {
    setSelectedCategory(null);
    setLowStockFilter(false);
    setSearchQuery('');
  }, []);
  
  const handleRefresh = () => {
    loadProducts();
  };
  
  const handleProductPress = (product) => {
    if (isSelecting) {
      navigation.navigate('NewCart', { selectedProduct: product });
    } else {
      navigation.navigate('EditProduct', { productId: product.id });
    }
  };
  
  const handleDeleteProduct = useCallback((productId, productName) => {
    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro de que deseas eliminar "${productName}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'products', productId));
              // Recargar productos después de eliminar
              loadProducts();
              Alert.alert('Éxito', 'Producto eliminado correctamente');
            } catch (error) {
              console.error('Error al eliminar producto:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          }
        }
      ]
    );
  }, [loadProducts]);
  
  const renderItem = useCallback(({ item }) => {
    let stockColor = colors.success;
    if (item.stock <= 0) {
      stockColor = colors.error;
    } else if (item.stock <= 5) {
      stockColor = colors.warning;
    }
    
    const categoryIcon = getCategoryIcon(item.category);
    
    return (
      <View style={styles.productCard}>
        <TouchableOpacity 
          style={styles.productContent}
          onPress={() => handleProductPress(item)}
        >
          <View style={styles.productHeader}>
            <View style={[styles.categoryIconContainer, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name={categoryIcon} size={24} color={colors.primary} />
            </View>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          </View>
          
          <View style={styles.productDetails}>
            <View style={styles.priceContainer}>
              <Ionicons name="pricetag-outline" size={18} color="#666" style={{ marginRight: 6 }} />
              <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
            </View>
            
            <View style={styles.stockContainer}>
              <Ionicons name="cube-outline" size={18} color="#666" style={{ marginRight: 6 }} />
              <Text style={[styles.productStock, { color: stockColor }]}>
                {item.stock} unid.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {!isSelecting && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteProduct(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [handleDeleteProduct, handleProductPress, isSelecting]);
  
  const keyExtractor = useCallback((item) => item.id, []);
  
  const renderSortHeader = () => (
    <View style={styles.sortHeader}>
      <TouchableOpacity 
        style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]} 
        onPress={() => toggleSort('name')}
      >
        <Text style={styles.sortButtonText}>Nombre</Text>
        {sortBy === 'name' && (
          <Ionicons 
            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.primary} 
          />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]} 
        onPress={() => toggleSort('price')}
      >
        <Text style={styles.sortButtonText}>Precio</Text>
        {sortBy === 'price' && (
          <Ionicons 
            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.primary} 
          />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.sortButton, sortBy === 'stock' && styles.sortButtonActive]} 
        onPress={() => toggleSort('stock')}
      >
        <Text style={styles.sortButtonText}>Stock</Text>
        {sortBy === 'stock' && (
          <Ionicons 
            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.primary} 
          />
        )}
      </TouchableOpacity>
    </View>
  );
  
  const renderCategoryFilters = () => {
    return (
      <View style={styles.filtersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterChip, 
              !selectedCategory && !lowStockFilter && styles.filterChipSelected
            ]}
            onPress={clearFilters}
          >
            <Ionicons 
              name="apps-outline" 
              size={18} 
              color={!selectedCategory && !lowStockFilter ? 'white' : '#666'} 
              style={styles.filterIcon}
            />
            <View>
              <Text style={!selectedCategory && !lowStockFilter ? styles.filterChipTextSelected : styles.filterChipText}>
                Todos ({products.length})
              </Text>
              <Text style={!selectedCategory && !lowStockFilter ? styles.filterValueTextSelected : styles.filterValueText}>
                {formatPrice(products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0))}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip, 
              lowStockFilter && styles.filterChipSelected
            ]}
            onPress={() => {
              setLowStockFilter(!lowStockFilter);
              setSelectedCategory(null);
            }}
          >
            <Ionicons 
              name="alert-circle-outline" 
              size={18} 
              color={lowStockFilter ? 'white' : '#666'} 
              style={styles.filterIcon}
            />
            <View>
              <Text style={lowStockFilter ? styles.filterChipTextSelected : styles.filterChipText}>
                Stock Bajo ({products.filter(p => p.stock <= 5).length})
              </Text>
              <Text style={lowStockFilter ? styles.filterValueTextSelected : styles.filterValueText}>
                {formatPrice(products.filter(p => p.stock <= 5).reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0))}
              </Text>
            </View>
          </TouchableOpacity>

        



          
          {/* Mostrar todas las categorías predefinidas */}
          {predefinedCategories.map(category => {
            const count = products.filter(p => p.category === category.id).length;
            const value = categoryValues[category.id] || 0;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.filterChip, 
                  selectedCategory === category.id && styles.filterChipSelected
                ]}
                onPress={() => {
                  if (selectedCategory === category.id) {
                    setSelectedCategory(null);
                  } else {
                    setSelectedCategory(category.id);
                    setLowStockFilter(false);
                  }
                }}
              >
                <Ionicons 
                  name={getCategoryIcon(category.id)} 
                  size={18} 
                  color={selectedCategory === category.id ? 'white' : '#666'} 
                  style={styles.filterIcon}
                />
                <View>
                  <Text style={selectedCategory === category.id ? styles.filterChipTextSelected : styles.filterChipText}>
                    {category.name} ({count})
                  </Text>
                  <Text style={selectedCategory === category.id ? styles.filterValueTextSelected : styles.filterValueText}>
                    {formatPrice(value)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#aaa" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={24} color="#aaa" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {renderCategoryFilters()}
      
      {renderSortHeader()}
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.productList}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay productos para mostrar
              </Text>
            </View>
          }
        />
      )}
      
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
    margin: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filtersWrapper: {
    backgroundColor: 'white',
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filtersContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 120,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterIcon: {
    marginRight: 8,
    marginTop: -8,
  },
  filterChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterValueText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  filterValueTextSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sortHeader: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortButtonActive: {
    backgroundColor: '#e8f5e9',
  },
  sortButtonText: {
    fontSize: 15,
    marginRight: 6,
    fontWeight: '500',
    color: '#333',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productList: {
    padding: 10,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
  },
  productContent: {
    flex: 1,
    paddingRight: 10,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  productStock: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 15,
    width: 50,
  },
});
