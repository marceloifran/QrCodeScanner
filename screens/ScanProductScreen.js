import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  TextInput,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ScanProductScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    // Calcular el total cada vez que cambia el carrito
    let sum = 0;
    cart.forEach(item => {
      sum += item.price * item.quantity;
    });
    setTotal(sum);
  }, [cart]);

  const handleBarCodeScanned = async ({ type, data }) => {
    try {
      setLoading(true);
      
      // Buscar el producto en la base de datos
      const q = query(collection(db, 'products'), where('barcode', '==', data));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Alert.alert('Error', 'Producto no encontrado');
        setLoading(false);
        return;
      }
      
      // Obtener los datos del producto
      const productDoc = querySnapshot.docs[0];
      const productData = {
        id: productDoc.id,
        ...productDoc.data()
      };
      
      // Verificar si hay stock disponible
      if (productData.stock <= 0) {
        Alert.alert('Error', 'No hay stock disponible para este producto');
        setLoading(false);
        return;
      }
      
      // Mostrar modal para confirmar cantidad
      setSelectedProduct(productData);
      setCurrentQuantity('1');
      setModalVisible(true);
      
    } catch (error) {
      console.error('Error al escanear producto:', error);
      Alert.alert('Error', 'Hubo un problema al procesar el código');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const addToCart = () => {
    const quantity = parseInt(currentQuantity);
    
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'La cantidad debe ser un número positivo');
      return;
    }
    
    if (quantity > selectedProduct.stock) {
      Alert.alert('Error', `Solo hay ${selectedProduct.stock} unidades disponibles`);
      return;
    }
    
    // Verificar si el producto ya está en el carrito
    const existingItemIndex = cart.findIndex(item => item.id === selectedProduct.id);
    
    if (existingItemIndex !== -1) {
      // Actualizar cantidad si ya existe
      const updatedCart = [...cart];
      const newQuantity = updatedCart[existingItemIndex].quantity + quantity;
      
      if (newQuantity > selectedProduct.stock) {
        Alert.alert('Error', `No hay suficiente stock. Solo quedan ${selectedProduct.stock} unidades`);
        return;
      }
      
      updatedCart[existingItemIndex].quantity = newQuantity;
      setCart(updatedCart);
    } else {
      // Agregar nuevo item al carrito
      setCart([...cart, {
        id: selectedProduct.id,
        barcode: selectedProduct.barcode,
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity: quantity,
        stock: selectedProduct.stock
      }]);
    }
    
    setModalVisible(false);
    setScanning(true);
  };

  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  const updateItemQuantity = (index, newQuantity) => {
    if (isNaN(newQuantity) || newQuantity <= 0) {
      return;
    }
    
    const updatedCart = [...cart];
    const item = updatedCart[index];
    
    if (newQuantity > item.stock) {
      Alert.alert('Error', `Solo hay ${item.stock} unidades disponibles`);
      return;
    }
    
    item.quantity = newQuantity;
    setCart(updatedCart);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'El carrito está vacío');
      return;
    }
    
    setLoading(true);
    try {
      // Crear registro de venta
      const sale = {
        items: cart.map(item => ({
          productId: item.id,
          barcode: item.barcode,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        })),
        total: total,
        date: Timestamp.now()
      };
      
      const saleRef = await addDoc(collection(db, 'sales'), sale);
      
      // Actualizar stock de productos
      for (const item of cart) {
        await updateDoc(doc(db, 'products', item.id), {
          stock: increment(-item.quantity)
        });
      }
      
      Alert.alert(
        'Venta Completada', 
        `Venta registrada con éxito. Total: $${total.toFixed(2)}`,
        [{ text: 'OK', onPress: () => {
          setCart([]);
          setScanning(true);
        }}]
      );
    } catch (error) {
      console.error('Error al procesar venta:', error);
      Alert.alert('Error', 'No se pudo completar la venta');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <Text>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text>No se ha concedido acceso a la cámara</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.permissionButtonText}>Solicitar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {scanning ? (
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={loading ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'ean13', 'ean8', 
                'upc_a', 'upc_e', 
                'code39', 'code128', 
                'code93', 'pdf417'
              ],
            }}
            cameraType="back"
          >
            <View style={styles.overlay}>
              <Text style={styles.scanText}>Escanea el código de barras</Text>
              <View style={styles.scanArea}>
                <View style={styles.scanLine}></View>
              </View>
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
              {cart.length > 0 && (
                <TouchableOpacity 
                  style={styles.viewCartButton}
                  onPress={() => setScanning(false)}
                >
                  <Text style={styles.viewCartButtonText}>
                    Ver Carrito ({cart.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </CameraView>
        </View>
      ) : (
        <View style={styles.cartContainer}>
          <Text style={styles.cartTitle}>Carrito de Compras</Text>
          
          <FlatList
            data={cart}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>
                    ${item.price.toFixed(2)} x 
                    <TextInput
                      style={styles.quantityInput}
                      value={item.quantity.toString()}
                      onChangeText={(text) => updateItemQuantity(index, parseInt(text))}
                      keyboardType="numeric"
                    />
                    = ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromCart(index)}
                >
                  <Text style={styles.removeButtonText}>X</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartText}>El carrito está vacío</Text>
              </View>
            }
          />
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
          </View>
          
          <View style={styles.cartActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.scanMoreButton]}
              onPress={() => setScanning(true)}
            >
              <Text style={styles.actionButtonText}>Escanear Más</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.checkoutButton]}
              onPress={handleCheckout}
              disabled={cart.length === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Finalizar Venta</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Modal para seleccionar cantidad */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedProduct && (
              <>
                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                <Text style={styles.modalPrice}>
                  Precio: ${selectedProduct.price.toFixed(2)}
                </Text>
                <Text style={styles.modalStock}>
                  Stock disponible: {selectedProduct.stock}
                </Text>
                
                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Cantidad:</Text>
                  <TextInput
                    style={styles.modalQuantityInput}
                    value={currentQuantity}
                    onChangeText={setCurrentQuantity}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setModalVisible(false);
                      setScanning(true);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.addButton]}
                    onPress={addToCart}
                  >
                    <Text style={styles.modalButtonText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  scanArea: {
    width: '80%',
    height: 200,
    borderWidth: 2,
    borderColor: 'green',
    justifyContent: 'center',
  },
  scanLine: {
    height: 2,
    backgroundColor: 'red',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  viewCartButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    marginTop: 30,
  },
  viewCartButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cartContainer: {
    flex: 1,
    padding: 15,
  },
  cartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  cartItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 3,
    paddingHorizontal: 5,
    marginHorizontal: 5,
    width: 40,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyCart: {
    padding: 20,
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 16,
    color: '#666',
  },
  totalContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  cartActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanMoreButton: {
    backgroundColor: '#6c757d',
    marginRight: 10,
  },
  checkoutButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalPrice: {
    fontSize: 16,
    marginBottom: 5,
  },
  modalStock: {
    fontSize: 16,
    marginBottom: 15,
    color: '#666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  modalQuantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 60,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#28a745',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
