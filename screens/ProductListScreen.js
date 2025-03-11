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
  Alert,
  Modal
} from 'react-native';
import { collection, getDocs, query, where, doc, deleteDoc, orderBy } from 'firebase/firestore';
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
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryValues, setCategoryValues] = useState({});
  const [productSalesHistory, setProductSalesHistory] = useState([]);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [selectedProductSales, setSelectedProductSales] = useState(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'categories', 'sales'
  const [refreshing, setRefreshing] = useState(false);
  
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

  useEffect(() => {
    loadProducts();
    loadCategoryValues();
  }, []);

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

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setShowOptionsModal(true);
  };

  const handleEditProduct = () => {
    setShowOptionsModal(false);
    navigation.navigate('EditProduct', { productId: selectedProduct.id });
  };

  const handleDeleteProduct = () => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que deseas eliminar "${selectedProduct.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            setShowOptionsModal(false);
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'products', selectedProduct.id));
              
              // Actualizar la lista de productos
              const updatedProducts = products.filter(p => p.id !== selectedProduct.id);
              setProducts(updatedProducts);
              
              // Actualizar los productos filtrados
              const updatedFiltered = filteredProducts.filter(p => p.id !== selectedProduct.id);
              setFilteredProducts(updatedFiltered);
              
              Alert.alert('Éxito', 'Producto eliminado correctamente');
            } catch (error) {
              console.error('Error al eliminar producto:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Agregar función para calcular días hasta vencimiento
  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Función para obtener color según días para vencimiento
  const getExpiryColor = (days) => {
    if (days === null) return 'transparent';
    if (days <= 0) return '#d32f2f'; // Rojo - Vencido
    if (days <= 5) return '#f57c00'; // Naranja - Próximo a vencer
    if (days <= 15) return '#fbc02d'; // Amarillo - Atención
    return '#4caf50'; // Verde - OK
  };

  const loadCategoryValues = async () => {
    try {
      // Obtener TODAS las ventas sin filtro de fecha
      const salesQuery = query(
        collection(db, 'sales'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('date', 'desc')
      );
      
      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date ? doc.data().date.toDate() : new Date()
      }));
      
      
      // Inicializar mapa de categorías con todas las categorías predefinidas
      const categoryMap = {};
      
      // Inicializar todas las categorías predefinidas
      predefinedCategories.forEach(cat => {
        categoryMap[cat.id] = {
          totalSales: 0,
          totalRevenue: 0
        };
      });
      
      // Agregar categoría "Sin categoría"
      categoryMap['Sin categoría'] = {
        totalSales: 0,
        totalRevenue: 0
      };
      
      // Calcular valor por categoría
      let totalProcessedItems = 0;
      
      salesData.forEach(sale => {
        if (!sale.items || !Array.isArray(sale.items)) {
          console.log('Venta sin items o items no es array:', sale.id);
          return;
        }
        
        sale.items.forEach(item => {
          // Verificar que el item tenga los datos necesarios
          if (!item) {
            console.log('Item nulo en venta:', sale.id);
            return;
          }
          
          // Usar la categoría del producto o 'Sin categoría' si no existe
          const category = item.category || 'Sin categoría';
          
          // Verificar si la categoría existe en el mapa, si no, crearla
          if (!categoryMap[category]) {
            console.log('Creando nueva categoría en el mapa:', category);
            categoryMap[category] = {
              totalSales: 0,
              totalRevenue: 0
            };
          }
          
          // Asegurarse de que quantity y price sean números
          const quantity = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;
          const revenue = price * quantity;
          
          categoryMap[category].totalSales += quantity;
          categoryMap[category].totalRevenue += revenue;
          
          totalProcessedItems++;
          
         
        });
      });
      
      setCategoryValues(categoryMap);
    } catch (error) {
      console.error('Error al cargar valores de categorías:', error);
    }
  };

  // Agregar una función para depurar los datos de categorías
  const debugCategoryData = () => {
  
    // Verificar si hay categorías con ventas pero sin productos
    const categoriesWithSalesNoProducts = Object.keys(categoryValues).filter(catId => 
      categoryValues[catId].totalSales > 0 && (!categoryCounts[catId] || categoryCounts[catId] === 0)
    );
    
    if (categoriesWithSalesNoProducts.length > 0) {
      console.log('Categorías con ventas pero sin productos:', categoriesWithSalesNoProducts);
    }
  };

  // Agregar función para cargar datos de ventas por producto
  const loadSalesData = (salesData) => {
    try {
      // Crear un mapa para contar ventas por producto
      const productSalesMap = {};
      
      salesData.forEach(sale => {
        if (!sale.items) return;
        
        sale.items.forEach(item => {
          if (!item.id) return;
          
          if (!productSalesMap[item.id]) {
            productSalesMap[item.id] = {
              id: item.id,
              name: item.name,
              salesCount: 0,
              totalQuantity: 0,
              totalRevenue: 0,
              sales: []
            };
          }
          
          const quantity = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;
          
          productSalesMap[item.id].salesCount++;
          productSalesMap[item.id].totalQuantity += quantity;
          productSalesMap[item.id].totalRevenue += price * quantity;
          productSalesMap[item.id].sales.push(sale);
        });
      });
      
      // Convertir a array y ordenar por ingresos
      const productSalesArray = Object.values(productSalesMap);
      productSalesArray.sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      console.log(`Procesados datos de ventas para ${productSalesArray.length} productos`);
      
      setProductSalesHistory(productSalesArray);
    } catch (error) {
      console.error('Error al procesar datos de ventas:', error);
    }
  };

  const loadProductSalesHistory = async (productId) => {
    setLoadingSales(true);
    try {
      // Obtener todas las ventas
      const salesQuery = query(
        collection(db, 'sales'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('date', 'desc')
      );
      
      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date ? doc.data().date.toDate() : new Date()
      }));
      
      // Filtrar ventas que contienen el producto
      const productSales = salesData.filter(sale => 
        sale.items && sale.items.some(item => item.id === productId)
      );
      
      setProductSalesHistory(productSales);
      setSelectedProductSales({
        id: productId,
        name: products.find(p => p.id === productId)?.name || 'Producto'
      });
      setShowSalesModal(true);
    } catch (error) {
      console.error('Error al cargar historial de ventas:', error);
      Alert.alert('Error', 'No se pudo cargar el historial de ventas');
    } finally {
      setLoadingSales(false);
    }
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
          
          const categoryValue = categoryValues[cat.id]?.totalRevenue || 0;
          
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
              {categoryValue > 0 && (
                <Text
                  style={[
                    styles.categoryValueText,
                    selectedCategory === cat.id && styles.categoryValueTextSelected
                  ]}
                >
                  ${formatPrice(categoryValue, 0)}
                </Text>
              )}
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

  const renderItem = ({ item }) => {
    const stockColor = getStockColor(item.stock);
    
    // Formatear la fecha de vencimiento si existe
    let formattedExpiryDate = null;
    if (item.expiryDate) {
      try {
        // Convertir a objeto Date (puede ser string, timestamp o Date)
        const expiryDate = typeof item.expiryDate === 'string' 
          ? new Date(item.expiryDate) 
          : item.expiryDate instanceof Date 
            ? item.expiryDate 
            : new Date(item.expiryDate.seconds * 1000);
        
        // Verificar si es una fecha válida
        if (!isNaN(expiryDate.getTime())) {
          formattedExpiryDate = expiryDate.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      } catch (error) {
        console.log('Error al formatear fecha:', error);
      }
    }
    
    return (
    <TouchableOpacity 
      style={styles.productCard}
        onPress={() => handleProductPress(item)}
    >
        <View style={styles.productCardContent}>
          <View style={styles.productMainInfo}>
        <Text style={styles.productName}>{item.name}</Text>
            
            <View style={styles.productMeta}>
              {item.barcode && (
                <View style={styles.metaItem}>
                  <Ionicons name="barcode-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metaText}>{item.barcode}</Text>
                </View>
              )}
              
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                <Text style={[styles.metaText, {color: colors.primary}]}>
                  {item.category || 'Sin categoría'}
        </Text>
              </View>
              
              {formattedExpiryDate && (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metaText}>
                    Venc: {formattedExpiryDate}
        </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.productDetails}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Precio</Text>
              <Text style={styles.priceValue}>${formatPrice(item.price, 0)}</Text>
            </View>
            
            <View style={styles.stockContainer}>
              <Text style={styles.stockLabel}>Stock</Text>
              <View style={styles.stockValueContainer}>
                <Text style={[styles.stockValue, { color: stockColor }]}>
                  {item.stock}
                </Text>
                {item.stock <= 5 && (
                  <View style={styles.lowStockBadge}>
                    <Text style={styles.lowStockText}>Bajo</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {isSelecting && (
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => {
                if (route.params?.onSelectProduct) {
                  route.params.onSelectProduct(item);
                  navigation.goBack();
                }
              }}
            >
              <Ionicons name="add-circle" size={30} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.productActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditProduct', { productId: item.id })}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => loadProductSalesHistory(item.id)}
          >
            <Ionicons name="receipt-outline" size={18} color={colors.success} />
            <Text style={[styles.actionText, {color: colors.success}]}>Ventas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => confirmDeleteProduct(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.actionText, {color: colors.error}]}>Eliminar</Text>
          </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  };

  const renderSalesHistoryModal = () => (
    <Modal
      visible={showSalesModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSalesModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.salesModalContent}>
          <View style={styles.salesModalHeader}>
            <Text style={styles.salesModalTitle}>
              Historial de Ventas - {selectedProductSales?.name}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSalesModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {loadingSales ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando ventas...</Text>
            </View>
          ) : productSalesHistory.length > 0 ? (
            <FlatList
              data={productSalesHistory}
              keyExtractor={(item) => item.id}
              renderItem={({ item: sale }) => {
                // Encontrar el producto específico en esta venta
                const productInSale = sale.items.find(i => i.id === selectedProductSales.id);
                if (!productInSale) return null;
                
                return (
                  <View style={styles.saleCard}>
                    <View style={styles.saleHeader}>
                      <Text style={styles.saleDate}>
                        {sale.date.toLocaleDateString('es-AR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      <View style={styles.saleQuantityContainer}>
                        <Text style={styles.saleQuantity}>
                          {productInSale.quantity}x
                        </Text>
                        <Text style={styles.saleItemPrice}>
                          ${formatPrice(productInSale.price, 0)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.saleTotal}>
                      <Text style={styles.saleTotalLabel}>Subtotal:</Text>
                      <Text style={styles.saleTotalValue}>
                        ${formatPrice(productInSale.price * productInSale.quantity, 0)}
                      </Text>
                    </View>
                    
                    <View style={styles.saleInfo}>
                      <Text style={styles.saleInfoText}>
                        Venta total: ${formatPrice(sale.total, 0)}
                      </Text>
                      <Text style={styles.saleInfoText}>
                        Productos en venta: {sale.items.length}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>No hay ventas para este producto</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'products' && styles.tabButtonActive]}
        onPress={() => setActiveTab('products')}
      >
        <Ionicons 
          name="cube-outline" 
          size={18} 
          color={activeTab === 'products' ? colors.primary : colors.text.secondary} 
        />
        <Text 
          style={[
            styles.tabButtonText, 
            activeTab === 'products' && styles.tabButtonTextActive
          ]}
        >
          Productos
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'categories' && styles.tabButtonActive]}
        onPress={() => setActiveTab('categories')}
      >
        <Ionicons 
          name="pricetag-outline" 
          size={18} 
          color={activeTab === 'categories' ? colors.primary : colors.text.secondary} 
        />
        <Text 
          style={[
            styles.tabButtonText, 
            activeTab === 'categories' && styles.tabButtonTextActive
          ]}
        >
          Categorías
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Agregar función para calcular el valor total del stock por categoría
  const calculateCategoryStockValue = () => {
    const categoryStockMap = {};
    
    // Inicializar todas las categorías predefinidas
    predefinedCategories.forEach(cat => {
      categoryStockMap[cat.id] = {
        stockQuantity: 0,
        stockValue: 0
      };
    });
    
    // Agregar categoría "Sin categoría"
    categoryStockMap['Sin categoría'] = {
      stockQuantity: 0,
      stockValue: 0
    };
    
    // Calcular valores para cada producto
    products.forEach(product => {
      const category = product.category || 'Sin categoría';
      const stock = parseInt(product.stock) || 0;
      const price = parseFloat(product.price) || 0;
      const stockValue = stock * price;
      
      if (!categoryStockMap[category]) {
        categoryStockMap[category] = {
          stockQuantity: 0,
          stockValue: 0
        };
      }
      
      categoryStockMap[category].stockQuantity += stock;
      categoryStockMap[category].stockValue += stockValue;
    });
    
    return categoryStockMap;
  };

  // Modificar la función renderCategoriesTab para mostrar solo stock y valor del stock
  const renderCategoriesTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
      );
    }
    
    // Calcular valor del stock por categoría
    const categoryStockValues = calculateCategoryStockValue();
    
    // Preparar datos de categorías incluyendo TODAS las categorías
    const allCategoriesData = [];
    
    // Primero agregar todas las categorías predefinidas
    predefinedCategories.forEach(cat => {
      const count = categoryCounts[cat.id] || 0;
      const stockQuantity = categoryStockValues[cat.id]?.stockQuantity || 0;
      const stockValue = categoryStockValues[cat.id]?.stockValue || 0;
      
      allCategoriesData.push({
        id: cat.id,
        name: cat.name,
        count,
        stockQuantity,
        stockValue
      });
    });
    
    // Filtrar solo categorías que tienen productos
    const filteredCategoriesData = allCategoriesData.filter(cat => cat.count > 0);
    
    // Agregar "Sin categoría" si hay productos sin categoría
    const uncategorizedCount = categoryCounts['Sin categoría'] || 0;
    if (uncategorizedCount > 0) {
      filteredCategoriesData.push({
        id: 'Sin categoría',
        name: 'Sin categoría',
        count: uncategorizedCount,
        stockQuantity: categoryStockValues['Sin categoría']?.stockQuantity || 0,
        stockValue: categoryStockValues['Sin categoría']?.stockValue || 0
      });
    }
    
    // Ordenar por valor de stock (mayor a menor)
    filteredCategoriesData.sort((a, b) => b.stockValue - a.stockValue);
    
    // Calcular totales
    const totalStock = filteredCategoriesData.reduce((sum, cat) => sum + cat.stockQuantity, 0);
    const totalStockValue = filteredCategoriesData.reduce((sum, cat) => sum + cat.stockValue, 0);
    
    return (
      <>
        {/* Resumen total */}
        <View style={styles.categoryTotalCard}>
          <Text style={styles.categoryTotalTitle}>Resumen de Inventario</Text>
          
          <View style={styles.categoryTotalStats}>
            <View style={styles.categoryTotalStat}>
              <Text style={styles.categoryTotalLabel}>Stock Total</Text>
              <Text style={styles.categoryTotalValue}>{totalStock}</Text>
            </View>
            
            <View style={styles.categoryTotalStat}>
              <Text style={styles.categoryTotalLabel}>Valor Total</Text>
              <Text style={styles.categoryTotalValue}>${formatPrice(totalStockValue, 0)}</Text>
            </View>
          </View>
        </View>
        
        {/* Lista de categorías */}
        <FlatList
          data={filteredCategoriesData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.categoryCard}
              onPress={() => {
                setSelectedCategory(item.id);
                setActiveTab('products');
                navigation.setParams({ selectedCategory: item.id });
              }}
            >
              <View style={styles.categoryCardContent}>
                <View style={styles.categoryIcon}>
                  <Ionicons name="pricetag" size={24} color="white" />
                </View>
                
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  <Text style={styles.categoryCount}>{item.count} productos</Text>
                </View>
                
                <View style={styles.categoryStats}>
                  <View style={styles.categoryStat}>
                    <Text style={styles.categoryStatLabel}>Stock</Text>
                    <Text style={styles.categoryStatValue}>{item.stockQuantity}</Text>
                  </View>
                  
                  <View style={styles.categoryStat}>
                    <Text style={styles.categoryStatLabel}>Valor Stock</Text>
                    <Text style={styles.categoryStatValue}>${formatPrice(item.stockValue, 0)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </>
    );
  };

  const renderSalesTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      );
    }
    
    // Filtrar productos con ventas
    const productsWithSales = productSalesHistory.filter(p => p.salesCount > 0);
    
    if (productsWithSales.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="trending-up-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay datos de ventas para mostrar</Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={productsWithSales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.productSalesCard}
            onPress={() => showProductSalesDetail(item)}
          >
            <View style={styles.productSalesCardContent}>
              <Text style={styles.productSalesName}>{item.name}</Text>
              
              <View style={styles.productSalesStats}>
                <View style={styles.productSalesStat}>
                  <Ionicons name="receipt-outline" size={16} color={colors.text.secondary} />
                  <Text style={styles.productSalesStatText}>
                    {item.salesCount} ventas
                  </Text>
                </View>
                
                <View style={styles.productSalesStat}>
                  <Ionicons name="cube-outline" size={16} color={colors.text.secondary} />
                  <Text style={styles.productSalesStatText}>
                    {item.totalQuantity} unidades
                  </Text>
                </View>
              </View>
              
              <View style={styles.productSalesRevenue}>
                <Text style={styles.productSalesRevenueLabel}>Ingresos</Text>
                <Text style={styles.productSalesRevenueValue}>
                  ${formatPrice(item.totalRevenue, 0)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    );
  };

  const renderOptionsModal = () => (
    <Modal
      visible={showOptionsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Opciones de producto</Text>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={handleEditProduct}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
            <Text style={styles.modalOptionText}>Editar producto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={() => {
              setShowOptionsModal(false);
              loadProductSalesHistory(selectedProduct.id);
            }}
          >
            <Ionicons name="receipt-outline" size={24} color={colors.success} />
            <Text style={styles.modalOptionText}>Ver historial de ventas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={handleDeleteProduct}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
            <Text style={styles.modalOptionText}>Eliminar producto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowOptionsModal(false)}
          >
            <Text style={styles.closeButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    await loadCategoryValues();
    setRefreshing(false);
  };

  // Agregar función para mostrar detalle de ventas de un producto
  const showProductSalesDetail = (product) => {
    setSelectedProductSales({
      id: product.id,
      name: product.name
    });
    
    // Usar las ventas ya cargadas para este producto
    setProductSalesHistory(product.sales || []);
    setShowSalesModal(true);
  };

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
      
      {renderTabs()}
      
      {activeTab === 'products' && (
        <>
      {renderCategoryFilter()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
          ) : filteredProducts.length > 0 ? (
        <FlatList
              data={filteredProducts}
          renderItem={renderItem}
              keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'No se encontraron productos que coincidan con la búsqueda' 
                  : selectedCategory 
                    ? 'No hay productos en esta categoría' 
                    : lowStockFilter 
                      ? 'No hay productos con stock bajo' 
                      : 'No hay productos registrados'}
              </Text>
              <TouchableOpacity 
                style={styles.emptyAddButton}
                onPress={() => navigation.navigate('AddProduct')}
              >
                <Text style={styles.emptyAddButtonText}>Agregar Producto</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      {activeTab === 'categories' && renderCategoriesTab()}
      
      {!isSelecting && activeTab === 'products' && (
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
      )}
      
      {renderOptionsModal()}
      {renderSalesHistoryModal()}
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
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productCardContent: {
    padding: 15,
  },
  productMainInfo: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  stockContainer: {
    alignItems: 'flex-end',
  },
  stockLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  stockValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  lowStockBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  lowStockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  expiryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  expiryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryValueText: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
  },
  categoryValueTextSelected: {
    color: 'white',
  },
  salesModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 0,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  salesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  salesModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: 10,
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    margin: 10,
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
  saleQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: 5,
  },
  saleItemPrice: {
    fontSize: 14,
    color: colors.primary,
  },
  saleTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saleTotalLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  saleTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  saleInfo: {
    marginTop: 10,
  },
  saleInfoText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 3,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 5,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  categoryCardContent: {
    padding: 15,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryInfo: {
    marginBottom: 15,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  categoryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryStat: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  categoryStatLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  categoryStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productSalesCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  productSalesCardContent: {
    padding: 15,
  },
  productSalesName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 10,
  },
  productSalesStats: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  productSalesStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  productSalesStatText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 5,
  },
  productSalesRevenue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  productSalesRevenueLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  productSalesRevenueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  categoryTotalCard: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  categoryTotalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  categoryTotalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryTotalStat: {
    alignItems: 'center',
    width: '48%',
  },
  categoryTotalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  categoryTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
}); 