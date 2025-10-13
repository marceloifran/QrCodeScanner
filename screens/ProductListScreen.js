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
  StatusBar,
  Image
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';
import { categories } from '../constants/categories';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProducts();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsQuery = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(productsQuery);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calcular estadísticas
      let totalValue = 0;
      let lowStockCount = 0;
      
      productsList.forEach(product => {
        totalValue += product.price * product.stock;
        if (product.stock < 10) {
          lowStockCount++;
        }
      });
      
      setStats({
        totalProducts: productsList.length,
        totalValue: totalValue,
        lowStock: lowStockCount
      });
      
      setProducts(productsList);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    return products.filter(product => {
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery);
      
      const matchesCategory = !selectedCategory || 
        product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  };

  const CategoryButton = ({ category }) => (
    <TouchableOpacity 
      style={[
        styles.categoryButton,
        selectedCategory === category.id && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(
        selectedCategory === category.id ? null : category.id
      )}
    >
      <Ionicons 
        name={category.icon} 
        size={16}
        color={selectedCategory === category.id ? colors.text.onPrimary : colors.text.secondary}
      />
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === category.id && styles.categoryButtonTextActive
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const StatCard = ({ icon, title, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );

  const filteredProducts = filterProducts();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventario</Text>
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
      </View>

      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <StatCard 
          icon="cube-outline" 
          title="Total Productos" 
          value={stats.totalProducts} 
          color={colors.primary} 
        />
        <StatCard 
          icon="cash-outline" 
          title="Valor Inventario" 
          value={`$${stats.totalValue.toFixed(2)}`} 
          color={colors.secondary} 
        />
        <StatCard 
          icon="alert-circle-outline" 
          title="Stock Bajo" 
          value={stats.lowStock} 
          color={colors.warning} 
        />
      </ScrollView>

      {/* Categories */}
      <View style={styles.categoriesWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(category => (
            <CategoryButton key={category.id} category={category} />
          ))}
        </ScrollView>
      </View>

      {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant" size={60} color={colors.text.light} />
              <Text style={styles.emptyText}>No se encontraron productos</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddProduct')}
              >
                <Text style={styles.emptyButtonText}>Agregar Producto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productCard}
                  onPress={() => navigation.navigate('EditProduct', { product: item })}
                >
                  <View style={styles.productIconContainer}>
                    <MaterialCommunityIcons 
                      name={item.stock < 10 ? "package-variant-closed-alert" : "package-variant-closed"} 
                      size={30} 
                      color={item.stock < 10 ? colors.warning : colors.primary} 
                    />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <View style={styles.productDetails}>
                      <View style={styles.productDetail}>
                        <Ionicons name="barcode-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.productDetailText}>{item.barcode}</Text>
                      </View>
                      <View style={styles.productDetail}>
                        <Ionicons name="pricetag-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.productDetailText}>
                          {categories.find(cat => cat.id === item.category)?.name || 'Sin categoría'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.productMetrics}>
                    <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                    <View style={[
                      styles.stockBadge,
                      item.stock < 10 ? styles.lowStockBadge : styles.goodStockBadge
                    ]}>
                      <Text style={styles.stockText}>{item.stock}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Ionicons name="add" size={30} color={colors.text.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 15,
    paddingTop: 40,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.onPrimary,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text.primary,
  },
  statsContainer: {
    maxHeight: 100,
    marginTop: 15,
  },
  statsContent: {
    paddingHorizontal: 15,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    width: 180,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoriesWrapper: {
    marginTop: 15,
    marginBottom: 5,
  },
  categoriesContainer: {
    maxHeight: 44,
  },
  categoriesContent: {
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    marginLeft: 4,
    color: colors.text.secondary,
    fontSize: 13,
  },
  categoryButtonTextActive: {
    color: colors.text.onPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 10,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: colors.text.onPrimary,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  productIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 5,
  },
  productDetails: {
    flexDirection: 'column',
  },
  productDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  productDetailText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 5,
  },
  productMetrics: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 30,
    alignItems: 'center',
  },
  goodStockBadge: {
    backgroundColor: colors.success + '30',
  },
  lowStockBadge: {
    backgroundColor: colors.warning + '30',
  },
  stockText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});