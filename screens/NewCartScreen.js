import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export default function NewCartScreen({ navigation, route }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Recibir productos del escáner
    if (route.params?.cartItems) {
      setCartItems(route.params.cartItems);
      navigation.setParams({ cartItems: null });
    }
    
    // Si hay un producto seleccionado, agregarlo
    if (route.params?.selectedProduct) {
      addToCart(route.params.selectedProduct);
      navigation.setParams({ selectedProduct: null });
    }
  }, [route.params?.selectedProduct, route.params?.cartItems]);
  
  const addToCart = (product) => {
    const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
    
    if (existingItemIndex !== -1) {
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex].quantity += 1;
      setCartItems(updatedItems);
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };
  
  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };
  
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const product = cartItems.find(item => item.id === productId);
    if (newQuantity > product.stock) {
      Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles.`);
      return;
    }
    
    const updatedItems = cartItems.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedItems);
  };
  
  const handleQuantityChange = (productId, text) => {
    const newQuantity = parseInt(text);
    if (!isNaN(newQuantity)) {
      updateQuantity(productId, newQuantity);
    }
  };
  
  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };
  
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos para realizar una venta.');
      return;
    }
    
    setLoading(true);
    try {
      const saleData = {
        userId: auth.currentUser.uid,
        date: serverTimestamp(),
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: getSubtotal()
      };
      
      await addDoc(collection(db, 'sales'), saleData);
      
      for (const item of cartItems) {
        const productRef = doc(db, 'products', item.id);
        await updateDoc(productRef, {
          stock: item.stock - item.quantity
        });
      }
      
      setCartItems([]);
      Alert.alert(
        'Venta realizada',
        'La venta se ha registrado correctamente.',
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
    } catch (error) {
      console.error('Error al procesar la venta:', error);
      Alert.alert('Error', 'No se pudo completar la venta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${formatPrice(item.price)} x {item.quantity} = ${formatPrice(item.price * item.quantity)}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.minusButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.quantityInput}
          value={item.quantity.toString()}
          onChangeText={(text) => handleQuantityChange(item.id, text)}
          keyboardType="numeric"
        />
        
        <TouchableOpacity 
          style={styles.plusButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Text style={styles.deleteButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nueva Venta</Text>
      </View>
      
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderTitle}>Carrito de Compras</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#28a745" style={styles.loader} />
      ) : (
        <>
          {cartItems.length > 0 ? (
            <FlatList
              data={cartItems}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.cartList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay productos en la venta</Text>
              <TouchableOpacity 
                style={styles.addProductsButton}
                onPress={() => navigation.navigate('ProductList', { isSelecting: true })}
              >
                <Text style={styles.addProductsButtonText}>Agregar Productos</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {cartItems.length > 0 && (
            <>
              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>Total: ${formatPrice(getSubtotal())}</Text>
              </View>
              
              <View style={styles.buttonsContainer}>
                <TouchableOpacity 
                  style={styles.scanMoreButton}
                  onPress={() => navigation.navigate('ScanProduct')}
                >
                  <Text style={styles.scanMoreButtonText}>Escanear Más</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.checkoutButton}
                  onPress={handleCheckout}
                  disabled={loading}
                >
                  <Text style={styles.checkoutButtonText}>Finalizar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#28a745',
    paddingTop: 40,
    paddingBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subHeader: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  subHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartList: {
    padding: 10,
  },
  cartItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  itemContent: {
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 16,
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  minusButton: {
    backgroundColor: '#6c757d',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButton: {
    backgroundColor: '#28a745',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityInput: {
    width: 50,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 18,
    marginHorizontal: 10,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalContainer: {
    backgroundColor: 'white',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    alignItems: 'flex-end',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  scanMoreButton: {
    backgroundColor: '#6c757d',
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
  },
  scanMoreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: '#28a745',
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
  },
  addProductsButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addProductsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});