import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export default function CartScreen({ navigation, route }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState(null);
  
  useEffect(() => {
    // Cargar información del negocio
    loadBusinessInfo();
    
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
  
  const loadBusinessInfo = async () => {
    try {
      const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);
      
      if (businessInfoDoc.exists()) {
        setBusinessInfo(businessInfoDoc.data());
      }
    } catch (error) {
      console.error('Error al cargar información del negocio:', error);
    }
  };
  
  const addToCart = (product) => {
    // Verificar si el producto ya está en el carrito
    const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
    
    if (existingItemIndex !== -1) {
      // Si ya existe, incrementar la cantidad
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex].quantity += 1;
      setCartItems(updatedItems);
    } else {
      // Si no existe, agregarlo con cantidad 1
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };
  
  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };
  
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      // Si la cantidad es 0 o menos, eliminar el producto
      removeFromCart(productId);
      return;
    }
    
    // Verificar si hay suficiente stock
    const product = cartItems.find(item => item.id === productId);
    if (newQuantity > product.stock) {
      Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles.`);
      return;
    }
    
    // Actualizar la cantidad
    const updatedItems = cartItems.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedItems);
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
      // Crear la venta en Firestore
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
      
      // Actualizar el stock de los productos
      for (const item of cartItems) {
        const productRef = doc(db, 'products', item.id);
        await updateDoc(productRef, {
          stock: item.stock - item.quantity
        });
      }
      
      // Limpiar el carrito y mostrar mensaje de éxito
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
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
        <Text style={styles.itemPrice}>${formatPrice(item.price * item.quantity)}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.circleButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity}</Text>
        
        <TouchableOpacity 
          style={styles.circleButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.trashButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Ionicons name="trash-outline" size={24} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => navigation.navigate('ScanProduct')}
        >
          <Ionicons name="scan-outline" size={24} color="black" />
        </TouchableOpacity>
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
              <Ionicons name="cart-outline" size={80} color="#ddd" />
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
            <View style={styles.footer}>
              <View style={styles.subtotalContainer}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>${formatPrice(getSubtotal())}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.checkoutButton}
                onPress={handleCheckout}
                disabled={loading}
              >
                <Text style={styles.checkoutButtonText}>Finalizar Venta</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scanButton: {
    padding: 5,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartList: {
    padding: 15,
  },
  cartItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  circleButton: {
    backgroundColor: '#28a745',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  trashButton: {
    padding: 5,
    marginLeft: 5,
  },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  subtotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
  },
  checkoutButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
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
    marginTop: 20,
    marginBottom: 30,
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