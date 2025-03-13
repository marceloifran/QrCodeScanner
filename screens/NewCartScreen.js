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
  
  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedItems = [...cartItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].subtotal = updatedItems[index].price * newQuantity;
    setCartItems(updatedItems);
  };
  
  const removeItem = (index) => {
    const updatedItems = [...cartItems];
    updatedItems.splice(index, 1);
    setCartItems(updatedItems);
  };
  
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos para realizar una venta.');
      return;
    }
    
    setLoading(true);
    try {
      // Verificar stock antes de procesar
      for (const item of cartItems) {
        // Obtener el stock actual del producto
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          Alert.alert('Error', `El producto ${item.name} ya no existe.`);
          setLoading(false);
          return;
        }
        
        const currentStock = productSnap.data().stock;
        
        if (currentStock < item.quantity) {
          Alert.alert('Error', `Stock insuficiente para ${item.name}. Solo quedan ${currentStock} unidades.`);
          setLoading(false);
          return;
        }
      }
      
      // Crear la venta con estructura correcta
      const total = calculateTotal();
      const saleData = {
        userId: auth.currentUser.uid,
        date: serverTimestamp(),
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity)
        })),
        total: parseFloat(total)
      };
      
      console.log('Datos de venta a guardar:', saleData);
      
      // Guardar la venta
      const saleRef = await addDoc(collection(db, 'sales'), saleData);
      console.log('Venta guardada con ID:', saleRef.id);
      
      // Actualizar el stock de cada producto
      const updatePromises = cartItems.map(async (item) => {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock;
          const newStock = Math.max(0, currentStock - item.quantity);
          
          console.log(`Actualizando stock de ${item.name}: ${currentStock} -> ${newStock}`);
          
          return updateDoc(productRef, {
            stock: newStock,
            updatedAt: serverTimestamp()
          });
        }
      });
      
      await Promise.all(updatePromises);
      
      setCartItems([]);
      Alert.alert(
        'Venta realizada',
        'La venta se ha registrado correctamente.',
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
    } catch (error) {
      console.error('Error al procesar la venta:', error);
      Alert.alert('Error', 'No se pudo completar la venta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };
  
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header con botón de retroceso y título */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      {/* Lista de productos */}
      <FlatList
        data={cartItems}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
              <Text style={styles.itemPrice}>$$ {formatPrice(item.price * item.quantity)}</Text>
            </View>
            
            <View style={styles.itemActions}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => updateQuantity(index, item.quantity - 1)}
              >
                <Ionicons name="remove" size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{item.quantity}</Text>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => updateQuantity(index, item.quantity + 1)}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => removeItem(index)}
              >
                <Ionicons name="trash-outline" size={24} color="#777" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>El carrito está vacío</Text>
            <TouchableOpacity 
              style={styles.addProductsButton}
              onPress={() => navigation.navigate('ProductList', { isSelecting: true })}
            >
              <Text style={styles.addProductsButtonText}>Agregar Productos</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      {/* Footer con subtotal y botón de finalizar */}
      {cartItems.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.subtotalContainer}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>$$ {formatPrice(calculateTotal())}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.checkoutButton}
            onPress={handleCheckout}
          >
            <Text style={styles.checkoutButtonText}>Finalizar </Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
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
  refreshButton: {
    padding: 5,
  },
  cartItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemDetails: {
    marginBottom: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 5,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
  },
  deleteButton: {
    marginLeft: 15,
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    marginBottom: 20,
  },
  addProductsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  addProductsButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  subtotalLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  subtotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});