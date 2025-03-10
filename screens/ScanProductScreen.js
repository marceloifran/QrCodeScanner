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
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function ScanProductScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [alertActive, setAlertActive] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [lastScannedTime, setLastScannedTime] = useState(0);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

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

  useEffect(() => {
    if (route.params?.selectedProduct) {
      const product = route.params.selectedProduct;
      setSelectedProduct(product);
      setCurrentQuantity('1');
      setModalVisible(true);
    }
  }, [route.params?.selectedProduct]);

  const handleBarCodeScanned = ({ type, data }) => {
    // Desactivar inmediatamente el escáner para evitar múltiples llamadas
    setScanning(false);
    setLoading(true);
    
    // Registrar el código escaneado
    console.log(`Código escaneado único: ${data} (Tipo: ${type})`);
    
    // Procesar el código de barras
    processBarcode(data);
  };

  const processBarcode = async (barcode) => {
    try {
      // Buscar el producto en la base de datos
      const productsQuery = query(
        collection(db, 'products'), 
        where('barcode', '==', barcode),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(productsQuery);
      
      if (querySnapshot.empty) {
        // Marcar que hay una alerta activa
        setAlertActive(true);
        
        // Reactivar el escáner después de 1 segundo
        setTimeout(() => {
          setLoading(false);
          setScanning(true);
          setAlertActive(false);
        }, 1000);
      } else {
        // Producto encontrado, añadir directamente al carrito con cantidad 1
        const productData = querySnapshot.docs[0].data();
        const product = {
          id: querySnapshot.docs[0].id,
          ...productData
        };
        
        // Verificar si hay suficiente stock
        if (product.stock <= 0) {
          setLoading(false);
          setScanning(true);
          return;
        }
        
        // Verificar si el producto ya está en el carrito
        const existingItemIndex = cart.findIndex(item => item.id === product.id);
        
        if (existingItemIndex !== -1) {
          // Actualizar cantidad si ya existe
          const updatedCart = [...cart];
          const newQuantity = updatedCart[existingItemIndex].quantity + 1;
          
          if (newQuantity > product.stock) {
            setLoading(false);
            setScanning(true);
            return;
          }
          
          updatedCart[existingItemIndex].quantity = newQuantity;
          setCart(updatedCart);
        } else {
          // Agregar nuevo item al carrito
          setCart([...cart, {
            id: product.id,
            barcode: product.barcode,
            name: product.name,
            price: product.price,
            quantity: 1,
            stock: product.stock
          }]);
        }
        
        // Reactivar el escáner sin mostrar confirmación y sin cambiar a vista de carrito
        setLoading(false);
        setScanning(true);
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      
      // Marcar que hay una alerta activa
      setAlertActive(true);
      
      // Reactivar el escáner después de mostrar el error
      setTimeout(() => {
        setLoading(false);
        setScanning(true);
        setAlertActive(false);
      }, 1000);
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
    
    // Cerrar el modal y reactivar el escáner inmediatamente
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

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos para continuar');
      return;
    }
    
    // Navegar a la pantalla de carrito con los productos
    navigation.navigate('NewCart', { cartItems: cart });
  };

  const searchProducts = async (searchText) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const productsQuery = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(productsQuery);
      const products = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar por nombre o código de barras
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchText.toLowerCase()) ||
        product.barcode.includes(searchText)
      );
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error al buscar productos:', error);
      Alert.alert('Error', 'No se pudo buscar productos');
    } finally {
      setSearchLoading(false);
    }
  };

  const adjustQuantity = (increment) => {
    const currentQty = parseInt(currentQuantity) || 0;
    const newQty = increment ? currentQty + 1 : Math.max(1, currentQty - 1);
    
    // Validar que no exceda el stock disponible
    if (increment && newQty > selectedProduct.stock) {
      Alert.alert('Error', `Solo hay ${selectedProduct.stock} unidades disponibles`);
      return;
    }
    
    setCurrentQuantity(newQty.toString());
  };

  if (hasPermission === null) {
    return (
      <View style={styles.cameraPermissionContainer}>
        <Text>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.cameraPermissionContainer}>
        <Text>No hay acceso a la cámara</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permissionButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasPermission === null ? (
        <View style={styles.cameraPermissionContainer}>
          <Text>Solicitando permiso de cámara...</Text>
        </View>
      ) : hasPermission === false ? (
        <View style={styles.cameraPermissionContainer}>
          <Text>No hay acceso a la cámara</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.permissionButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {scanning ? (
            <View style={styles.scanContainer}>
              <CameraView
                style={styles.camera}
                onBarcodeScanned={scanning && !loading && !alertActive ? handleBarCodeScanned : undefined}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                  interval: 3000, // Aumentar el intervalo para reducir la frecuencia de escaneo
                }}
                cameraType="back"
                flashMode="auto"
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
                  
                  {/* Botón de búsqueda por nombre */}
                  <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={() => setSearchModalVisible(true)}
                  >
                    <Text style={styles.searchButtonText}>
                      Buscar por Nombre
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Mostrar contador de productos en carrito */}
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
                      <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                    
                    <View style={styles.cartItemActions}>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => {
                          // Decrementar cantidad
                          if (item.quantity > 1) {
                            const updatedCart = [...cart];
                            updatedCart[index].quantity -= 1;
                            setCart(updatedCart);
                          }
                        }}
                      >
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      
                      <TextInput
                        style={styles.quantityInput}
                        value={item.quantity.toString()}
                        onChangeText={(text) => {
                          const newQuantity = parseInt(text) || 0;
                          if (newQuantity > 0 && newQuantity <= item.stock) {
                            const updatedCart = [...cart];
                            updatedCart[index].quantity = newQuantity;
                            setCart(updatedCart);
                          }
                        }}
                        keyboardType="numeric"
                      />
                      
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => {
                          // Incrementar cantidad
                          if (item.quantity < item.stock) {
                            const updatedCart = [...cart];
                            updatedCart[index].quantity += 1;
                            setCart(updatedCart);
                          }
                        }}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => {
                          const updatedCart = cart.filter((_, i) => i !== index);
                          setCart(updatedCart);
                        }}
                      >
                        <Text style={styles.removeButtonText}>X</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyCart}>
                    <Text style={styles.emptyCartText}>No hay productos en el carrito</Text>
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
                >
                  <Text style={styles.actionButtonText}>Finalizar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Modal de búsqueda */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={searchModalVisible}
            onRequestClose={() => setSearchModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.searchModalContent}>
                <Text style={styles.modalTitle}>Buscar Producto</Text>
                
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Nombre o código de barras"
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      // Buscar automáticamente mientras se escribe
                      if (text.length > 2) { // Buscar después de 2 caracteres
                        searchProducts(text);
                      } else if (text.length === 0) {
                        setSearchResults([]);
                      }
                    }}
                    autoFocus={true}
                    returnKeyType="search"
                    onSubmitEditing={() => searchProducts(searchQuery)}
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity 
                      style={styles.clearButton}
                      onPress={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {searchLoading ? (
                  <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 20}} />
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.searchResultItem}
                        onPress={() => {
                          // Verificar si hay suficiente stock
                          if (item.stock <= 0) {
                            return; // No mostrar alerta, simplemente no hacer nada
                          }
                          
                          // Verificar si el producto ya está en el carrito
                          const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
                          
                          if (existingItemIndex !== -1) {
                            // Actualizar cantidad si ya existe
                            const updatedCart = [...cart];
                            const newQuantity = updatedCart[existingItemIndex].quantity + 1;
                            
                            if (newQuantity > item.stock) {
                              return; // No mostrar alerta, simplemente no hacer nada
                            }
                            
                            updatedCart[existingItemIndex].quantity = newQuantity;
                            setCart(updatedCart);
                          } else {
                            // Agregar nuevo item al carrito
                            setCart([...cart, {
                              id: item.id,
                              barcode: item.barcode,
                              name: item.name,
                              price: item.price,
                              quantity: 1,
                              stock: item.stock
                            }]);
                          }
                          
                          // Cerrar el modal de búsqueda inmediatamente sin mostrar confirmación
                          setSearchModalVisible(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                      >
                        <Text style={styles.searchResultName}>{item.name}</Text>
                        <Text style={styles.searchResultPrice}>Precio: ${item.price.toFixed(2)}</Text>
                        <Text style={styles.searchResultStock}>Stock: {item.stock}</Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      searchQuery.length > 2 ? (
                        <Text style={styles.noResultsText}>No se encontraron productos</Text>
                      ) : searchQuery.length > 0 ? (
                        <Text style={styles.noResultsText}>Escribe al menos 3 caracteres</Text>
                      ) : null
                    }
                    style={{maxHeight: 300}}
                  />
                )}
                
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setSearchModalVisible(false)}
                >
                  <Text style={styles.closeModalButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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
  cameraPermissionContainer: {
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
  scanContainer: {
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
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cartItemInfo: {
    flex: 1,
    marginBottom: 10,
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
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quantityButton: {
    backgroundColor: '#6c757d',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 3,
    paddingHorizontal: 5,
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
    marginLeft: 10,
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
  searchModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  searchResultPrice: {
    fontSize: 14,
    color: '#666',
  },
  searchResultStock: {
    fontSize: 14,
    color: '#666',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  closeModalButton: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  quantityButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  clearButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 10,
    width: '80%',
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
