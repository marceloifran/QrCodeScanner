import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Animated
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Helper para formatear dinero
function formatMoney(value) {
  // Redondear a 2 decimales y luego verificar si tiene decimales
  const roundedValue = Math.round(value * 100) / 100;
  const hasDecimals = roundedValue % 1 !== 0;
  
  return roundedValue.toLocaleString('es-AR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

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
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saleProcessing, setSaleProcessing] = useState(false); // Nuevo estado
  const [cameraReady, setCameraReady] = useState(false);
  
  // Obtener parámetros de la ruta
  const returnTo = route.params?.returnTo;
  
  const cameraRef = useRef(null);
  
  // Animación para la línea de escaneo
  const scanLineAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Iniciar la animación de la línea de escaneo
    startScanLineAnimation();
    
    // Limpiar al desmontar
    return () => {
      // Detener cualquier proceso en curso
      setScanning(false);
      setLoading(false);
      setAlertActive(false);
    };
  }, []);

  // Calcula el total cada vez que cambia el carrito
  useEffect(() => {
    let sum = 0;
    cart.forEach(item => {
      sum += item.price * item.quantity;
    });
    setTotal(sum);
  }, [cart]);

  // Si llega un producto desde otra pantalla (por route.params)
  useEffect(() => {
    if (route.params?.selectedProduct) {
      const product = route.params.selectedProduct;
      setSelectedProduct(product);
      setCurrentQuantity('1');
      setModalVisible(true);
    }
  }, [route.params?.selectedProduct]);

  // Configurar opciones de navegación
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      title: ''
    });
  }, [navigation]);

  // Función para animar la línea de escaneo
  const startScanLineAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Manejar el escaneo de códigos de barras
  const handleBarCodeScanned = ({ type, data }) => {
    if (scanning && !loading && !alertActive && cameraReady) {
      setScanning(false);
      processBarcode(data);
    }
  };

  const processBarcode = async (barcode) => {
    try {
      // Evitar procesamiento si ya hay una alerta activa
      if (alertActive) return;
      
      setLoading(true);
      const productsQuery = query(
        collection(db, 'products'), 
        where('barcode', '==', barcode),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(productsQuery);
      
      if (querySnapshot.empty) {
        // Producto no encontrado
        setAlertActive(true); // Marcar que hay una alerta activa
        Alert.alert(
          "Producto no encontrado",
          "¿Deseas agregar un nuevo producto con este código de barras?",
          [
            {
              text: "No",
              onPress: () => {
                setLoading(false);
                setAlertActive(false);
                setScanning(true);
              },
              style: "cancel"
            },
            {
              text: "Sí",
              onPress: () => {
                setLoading(false);
                setAlertActive(false);
                navigation.navigate('AddProduct', { barcode });
              }
            }
          ]
        );
      } else {
        // Producto encontrado
        const productData = querySnapshot.docs[0].data();
        const product = {
          id: querySnapshot.docs[0].id,
          ...productData
        };
        
        setLoading(false);
        setAlertActive(false);
        
        // Si venimos de AddProduct, volvemos allí con el código de barras
        if (returnTo === 'AddProduct') {
          navigation.navigate('AddProduct', { barcode });
        } else {
          // De lo contrario, vamos al carrito con el producto
          navigation.navigate('Cart', { product });
        }
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      Alert.alert('Error', 'Ocurrió un error al buscar el producto');
      setLoading(false);
      setScanning(true);
      setAlertActive(false);
    }
  };

  // Manejar cuando la cámara está lista
  const handleCameraReady = () => {
    setCameraReady(true);
  };

  // Agregar producto con cantidad seleccionada (cuando se abre el modal)
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
    
    const existingItemIndex = cart.findIndex(item => item.id === selectedProduct.id);
    if (existingItemIndex !== -1) {
      const updatedCart = [...cart];
      const newQuantity = updatedCart[existingItemIndex].quantity + quantity;
      if (newQuantity > selectedProduct.stock) {
        Alert.alert('Error', `No hay suficiente stock. Solo quedan ${selectedProduct.stock} unidades`);
        return;
      }
      updatedCart[existingItemIndex].quantity = newQuantity;
      setCart(updatedCart);
    } else {
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

  // Eliminar un ítem del carrito
  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  // Finalizar venta o pasar a otra pantalla
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos para continuar');
      return;
    }

    setSaleProcessing(true); // Mostrar el modal de "Guardando venta..."
    
    try {
      // Verificar stock antes de procesar
      for (const item of cart) {
        // Obtener el stock actual del producto
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          Alert.alert('Error', `El producto ${item.name} ya no existe.`);
          setSaleProcessing(false);
          return;
        }
        
        const currentStock = productSnap.data().stock;
        
        if (currentStock < item.quantity) {
          Alert.alert('Error', `Stock insuficiente para ${item.name}. Solo quedan ${currentStock} unidades.`);
          setSaleProcessing(false);
          return;
        }
      }
      
      // Crear la venta con estructura correcta
      const totalValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const saleData = {
        userId: auth.currentUser.uid,
        date: serverTimestamp(),
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity)
        })),
        total: parseFloat(totalValue)
      };
      
      
      // Guardar la venta
      const saleRef = await addDoc(collection(db, 'sales'), saleData);
      console.log('Venta guardada ');
      
      // Actualizar el stock de cada producto
      const updatePromises = cart.map(async (item) => {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock;
          const newStock = Math.max(0, currentStock - item.quantity);
          
          return updateDoc(productRef, {
            stock: newStock,
            updatedAt: serverTimestamp()
          });
        }
      });
      
      await Promise.all(updatePromises);
      
      setCart([]);
      setSaleProcessing(false); // Ocultar el modal de "Guardando venta..."
      Alert.alert(
        'Venta realizada',
        'La venta se ha registrado correctamente.',
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
    } catch (error) {
      console.error('Error al procesar la venta:', error);
      setSaleProcessing(false); // Ocultar el modal de "Guardando venta..."
      Alert.alert('Error', 'No se pudo completar la venta: ' + error.message);
    }
  };

  // Búsqueda por texto
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
      
      // Filtrar por nombre o código
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

  // Ajustar la cantidad en el modal
  const adjustQuantity = (increment) => {
    const currentQty = parseInt(currentQuantity) || 0;
    const newQty = increment ? currentQty + 1 : Math.max(1, currentQty - 1);
    if (selectedProduct && increment && newQty > selectedProduct.stock) {
      Alert.alert('Error', `Solo hay ${selectedProduct.stock} unidades disponibles`);
      return;
    }
    setCurrentQuantity(newQty.toString());
  };

  // Volver a la pantalla anterior
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Si todavía no hay permisos de cámara
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No se tiene acceso a la cámara</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleGoBack}
        >
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // RENDER PRINCIPAL
  return (
    <View style={styles.container}>
      {scanning ? (
        // === VISTA DE ESCANEO ===
        <View style={styles.scanContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'code93', 'upc_e'],
              interval: 3000,
            }}
            cameraType="back"
            flashMode="auto"
            onCameraReady={handleCameraReady}
          >
            <View style={styles.overlay}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={handleGoBack}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.scanArea}>
                <Animated.View 
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanLineAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 200]
                          })
                        }
                      ]
                    }
                  ]}
                />
              </View>
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
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
        // === VISTA DEL CARRITO ===
        <View style={styles.cartScreenContainer}>
          
          {/* Encabezado con título y botón QR a la derecha */}
          <View style={styles.headerRow}>
            <Text style={styles.cartTitle}>Carrito</Text>
            <TouchableOpacity onPress={() => setScanning(true)} style={styles.qrIconButton}>
              <Ionicons name="qr-code-outline" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={cart}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.cartItem}>
                {/* Fila superior: nombre + cantidad, precio total */}
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.name} x{item.quantity}
                  </Text>
                  <Text style={styles.itemPrice}>
                    $ {formatMoney(item.price * item.quantity)}
                  </Text>
                </View>
                
                {/* Fila inferior: botones +/-/eliminar */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      // Decrementar cantidad
                      if (item.quantity > 1) {
                        const updatedCart = [...cart];
                        updatedCart[index].quantity -= 1;
                        setCart(updatedCart);
                      }
                    }}
                  >
                    <Ionicons name="remove-circle-outline" size={26} color="#28a745" />
                  </TouchableOpacity>

                  <Text style={styles.quantityText}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      // Incrementar cantidad
                      if (item.quantity < item.stock) {
                        const updatedCart = [...cart];
                        updatedCart[index].quantity += 1;
                        setCart(updatedCart);
                      }
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={26} color="#28a745" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromCart(index)}
                  >
                    <Ionicons name="trash-outline" size={22} color="#fff" />
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

          {/* Subtotal */}
          <View style={styles.subtotalContainer}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>$ {formatMoney(total)}</Text>
          </View>

          {/* Botón para finalizar */}
          <TouchableOpacity 
            style={styles.finishButton}
            onPress={handleCheckout}
          >
            <Text style={styles.finishButtonText}>Finalizar Venta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE BÚSQUEDA POR NOMBRE */}
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
                  if (text.length > 2) {
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
              <ActivityIndicator size="large" color="#28a745" style={{marginTop: 20}} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.searchResultItem}
                    onPress={() => {
                      // Verificar stock
                      if (item.stock <= 0) {
                        return;
                      }
                      // Si existe en el carrito, +1
                      const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
                      if (existingItemIndex !== -1) {
                        const updatedCart = [...cart];
                        const newQuantity = updatedCart[existingItemIndex].quantity + 1;
                        if (newQuantity > item.stock) {
                          return;
                        }
                        updatedCart[existingItemIndex].quantity = newQuantity;
                        setCart(updatedCart);
                      } else {
                        setCart([...cart, {
                          id: item.id,
                          barcode: item.barcode,
                          name: item.name,
                          price: item.price,
                          quantity: 1,
                          stock: item.stock
                        }]);
                      }
                      setSearchModalVisible(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <Text style={styles.searchResultName}>{item.name}</Text>
                    <Text style={styles.searchResultPrice}>Precio: $$ {formatMoney(item.price)}</Text>
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

      {/* MODAL: GUARDANDO VENTA... */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={saleProcessing}
        onRequestClose={() => {}} // Evitar que se cierre al tocar fuera
      >
        <View style={styles.modalContainer}>
          <View style={styles.processingModalContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Guardando venta...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -- ESTILOS -- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF9EC', // Fondo verde claro
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
  // ====== ESCANEO ======
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
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  // ====== CARRITO ======
  cartScreenContainer: {
    flex: 1,
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cartTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  qrIconButton: {
    padding: 5,
    // Algo de margen para separarlo del borde
    marginRight: 5,
  },
  cartItem: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  iconButton: {
    marginHorizontal: 5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 4,
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    // Aquí agregamos un margen adicional para que no esté tan cerca
    marginLeft: 20, 
  },
  emptyCart: {
    padding: 20,
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 16,
    color: '#666',
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  subtotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subtotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  finishButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 20,
  },
  finishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // ====== MODAL BÚSQUEDA ======
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
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
  clearButton: {
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
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
    marginTop: 20,
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
   // Modal de "Guardando venta..."
   processingModalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 22,
    borderRadius: 4,
    alignItems: 'center',
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    zIndex: 10,
  },
});