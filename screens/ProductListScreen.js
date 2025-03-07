import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { colors } from '../theme/colors';
import { categories } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../utils/formatters';

export default function ProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProducts();
    });
    return unsubscribe;
  }, [navigation]);

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
      
      // Ordenar productos alfabéticamente por nombre
      productsList.sort((a, b) => a.name.localeCompare(b.name));
      
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
      
      const matchesCategory = selectedCategory === null || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  };

  const renderCategoryFilter = () => {
    return (
      <View style={styles.categoryFilterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          <TouchableOpacity 
            style={[
              styles.categoryChip,
              selectedCategory === null && styles.categoryChipSelected
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons 
              name="apps" 
              size={16} 
              color={selectedCategory === null ? colors.background : colors.primary} 
            />
            <Text style={[
              styles.categoryChipText,
              selectedCategory === null && styles.categoryChipTextSelected
            ]}>Todos</Text>
          </TouchableOpacity>
          
          {categories.map(category => (
            <TouchableOpacity 
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipSelected
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons 
                name={category.icon} 
                size={16} 
                color={selectedCategory === category.id ? colors.background : colors.primary} 
                style={{marginRight: 5}}
              />
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextSelected
              ]}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const categoryObj = categories.find(cat => cat.id === item.category);
    const isLowStock = item.stock <= 5;
    
    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => navigation.navigate('EditProduct', { product: item })}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productBarcode}>{item.barcode}</Text>
          <Text style={styles.productCategory}>
            {categoryObj ? categoryObj.name : 'Sin categoría'}
          </Text>
          <Text style={styles.productPrice}>
            ${parseFloat(item.price).toFixed(2)}
          </Text>
          <Text style={[
            styles.productStock,
            isLowStock && styles.lowStock
          ]}>
            Stock: {item.stock} {isLowStock && '(Bajo)'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o código"
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
          <FlatList
            data={filterProducts()}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="basket" size={50} color={colors.text.secondary} />
                <Text style={styles.emptyText}>
                  {selectedCategory 
                    ? `No hay productos en la categoría ${categories.find(c => c.id === selectedCategory)?.name || ''}`
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
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProduct')}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </>
      )}
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
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text.primary,
  },
  categoryFilterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoriesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text.primary,
    fontSize: 14,
    marginLeft: 5,
  },
  categoryChipTextSelected: {
    color: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 5,
  },
  productBarcode: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 5,
  },
  productCategory: {
    color: colors.primary,
    fontSize: 14,
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 5,
  },
  productStock: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  lowStock: {
    color: colors.error,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyAddButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 