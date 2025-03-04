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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { colors } from '../theme/colors';
import { categories } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';

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
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
        color={selectedCategory === category.id ? colors.background : colors.text.secondary}
      />
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === category.id && styles.categoryButtonTextActive
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

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

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={filterProducts()}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => navigation.navigate('EditProduct', { product: item })}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productBarcode}>
                  Código: {item.barcode}
                </Text>
                <Text style={styles.productCategory}>
                  {categories.find(cat => cat.id === item.category)?.name || 'Sin categoría'}
                </Text>
                <Text style={styles.productPrice}>
                  ${item.price.toFixed(2)}
                </Text>
                <Text style={[
                  styles.productStock,
                  item.stock < 10 && styles.lowStock
                ]}>
                  Stock: {item.stock} unidades
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
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
  header: {
    padding: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text.primary,
  },
  categoriesWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoriesContainer: {
    maxHeight: 44,
  },
  categoriesContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    height: 32,
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
    color: colors.background,
  },
  listContainer: {
    padding: 10,
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
}); 