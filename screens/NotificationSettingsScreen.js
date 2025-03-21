import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Switch, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  StatusBar
} from 'react-native';
import { collection, query, getDocs, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationSettingsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar productos
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar alfabéticamente
      productsList.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(productsList);
      
      // Cargar configuraciones
      const settingsDoc = await getDoc(doc(db, 'notificationSettings', auth.currentUser.uid));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data().productSettings || {});
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar las configuraciones');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleNotification = async (productId, type = 'stock') => {
    try {
      // Si no existe configuración para este producto, inicializarla
      if (!settings[productId]) {
        settings[productId] = { stock: true, expiry: true };
      }
      
      // Crear una copia de la configuración actual
      const productSettings = {...settings[productId]};
      
      // Cambiar el valor del tipo específico (stock o expiry)
      productSettings[type] = !productSettings[type];
      
      // Actualizar el estado
      const newSettings = {
        ...settings,
        [productId]: productSettings
      };
      
      setSettings(newSettings);
      
      // Guardar en Firestore
      await setDoc(doc(db, 'notificationSettings', auth.currentUser.uid), {
        productSettings: newSettings
      }, { merge: true });
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };
  
  const filteredProducts = () => {
    let result = [...products];
    
    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(query)
      );
    }
    
    return result;
  };
  
  const renderItem = ({ item }) => {
    // Obtener configuración del producto o usar valores predeterminados
    const productConfig = settings[item.id] || { stock: true, expiry: true };
    const isLowStock = item.stock <= 5;
    
    return (
      <View style={styles.productItem}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.productDetails}>
            <View style={styles.stockContainer}>
              <Ionicons 
                name="cube-outline" 
                size={16} 
                color={isLowStock ? colors.error : colors.text.secondary} 
                style={styles.detailIcon}
              />
              <Text style={[
                styles.stockText,
                isLowStock && styles.lowStockText
              ]}>
                Stock: {item.stock}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Ionicons 
                name="pricetag-outline" 
                size={16} 
                color={colors.text.secondary} 
                style={styles.detailIcon}
              />
              <Text style={styles.priceText}>
                Precio: ${parseFloat(item.price).toFixed(2)}
              </Text>
            </View>
          </View>
          {item.category && (
            <View style={styles.categoryTag}>
              <Ionicons 
                name={getCategoryIcon(item.category)} 
                size={12} 
                color={colors.primary} 
              />
              <Text style={styles.categoryText}>
                {getCategoryName(item.category)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.switchesContainer}>
          <View style={styles.switchItem}>
            <Text style={styles.switchLabel}>Stock</Text>
            <Switch
              value={productConfig.stock}
              onValueChange={() => toggleNotification(item.id, 'stock')}
              trackColor={{ false: '#d3d3d3', true: colors.primary }}
            />
          </View>
          <View style={styles.switchItem}>
            <Text style={styles.switchLabel}>Venc.</Text>
            <Switch
              value={productConfig.expiry}
              onValueChange={() => toggleNotification(item.id, 'expiry')}
              trackColor={{ false: '#d3d3d3', true: colors.primary }}
            />
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Configurar Notificaciones</Text>
        <Text style={styles.subtitle}>Activa o desactiva notificaciones por producto</Text>
      </View>
      
      <ScrollView>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={filteredProducts()}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="information-circle" size={50} color={colors.text.secondary} />
                <Text style={styles.emptyText}>
                  {searchQuery 
                    ? 'No se encontraron productos que coincidan con la búsqueda' 
                    : 'No hay productos registrados'}
                </Text>
              </View>
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 15,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text.primary,
  },
  loader: {
    marginTop: 30,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 40,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 5,
  },
  productDetails: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 5,
  },
  stockText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  lowStockText: {
    color: colors.error,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  switchesContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  switchLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: 8,
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
  },
}); 