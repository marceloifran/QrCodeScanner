import React, { useState, useEffect, useRef } from "react";
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
  Keyboard,
  Animated,
  Dimensions,
} from "react-native";
import { Camera } from "expo-camera";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Ionicons } from "@expo/vector-icons";
import CacheService from "../utils/cacheService";

// Si usas tu archivo "colors.js", ajusta la ruta de import
// import { colors } from '../theme/colors';

// Helper para formatear dinero
function formatMoney(value) {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const { width } = Dimensions.get("window");
const scanAreaWidth = width * 0.8;
const scanAreaHeight = scanAreaWidth * 0.7;

// Constantes para tipos de códigos
const BARCODE_TYPES = {
  qr: "qr",
  ean13: "ean13",
  ean8: "ean8",
  code128: "code128",
  code39: "code39",
  code93: "code93",
  codabar: "codabar",
  itf14: "itf14",
  upc_e: "upc-e",
};

export default function ScanProductScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentQuantity, setCurrentQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [alertActive, setAlertActive] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  // Nuevo estado para almacenar todos los productos en caché
  const [cachedProducts, setCachedProducts] = useState(null);

  // Animación para la línea de escaneo
  const scanLineAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    // Precargar los productos en caché
    loadProductsToCache();
  }, []);

  // Calcula el total cada vez que cambia el carrito
  useEffect(() => {
    let sum = 0;
    cart.forEach((item) => {
      sum += item.price * item.quantity;
    });
    setTotal(sum);
  }, [cart]);

  // Si llega un producto desde otra pantalla (por route.params)
  useEffect(() => {
    if (route.params?.selectedProduct) {
      const product = route.params.selectedProduct;
      setSelectedProduct(product);
      setCurrentQuantity("1");
      setModalVisible(true);
    }
  }, [route.params?.selectedProduct]);

  // Función para cargar productos al caché
  const loadProductsToCache = async () => {
    try {
      if (!auth.currentUser) return;

      // Intentar obtener productos del caché primero
      const cachedData = await CacheService.getFromCache(
        "products",
        auth.currentUser.uid
      );

      if (cachedData) {
        console.log("Usando productos en caché");
        setCachedProducts(cachedData);
        return;
      }

      // Si no hay caché, cargar desde Firestore
      console.log("Cargando productos desde Firestore");
      const productsQuery = query(
        collection(db, "products"),
        where("userId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(productsQuery);
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Guardar en caché y en estado
      await CacheService.saveToCache(
        "products",
        productsData,
        auth.currentUser.uid
      );
      setCachedProducts(productsData);
    } catch (error) {
      console.error("Error al cargar productos al caché:", error);
    }
  };

  // Escaneo del código de barras
  const handleBarCodeScanned = ({ type, data }) => {
    console.log("Código de barras escaneado:", type, data);

    // Evitar procesamiento si ya está en curso
    if (loading || alertActive || !scanning) {
      console.log("Ignorando escaneo - Estado actual:", {
        loading,
        alertActive,
        scanning,
      });
      return;
    }

    setScanning(false);
    setLoading(true);
    processBarcode(data);
  };

  const processBarcode = async (barcode) => {
    console.log("Procesando código de barras:", barcode);
    try {
      // Buscar en caché primero si está disponible
      if (cachedProducts) {
        console.log("Buscando producto en caché local");
        const cachedProduct = cachedProducts.find((p) => p.barcode === barcode);

        if (cachedProduct) {
          console.log("Producto encontrado en caché:", cachedProduct.name);

          // Verificar stock
          if (cachedProduct.stock <= 0) {
            Alert.alert(
              "Sin stock",
              "Este producto no tiene unidades disponibles"
            );
            setLoading(false);
            setScanning(true);
            return;
          }

          // Buscar en el carrito
          const existingItemIndex = cart.findIndex(
            (item) => item.id === cachedProduct.id
          );

          if (existingItemIndex !== -1) {
            // Aumentar cantidad si ya está en el carrito
            const updatedCart = [...cart];
            const newQuantity = updatedCart[existingItemIndex].quantity + 1;
            if (newQuantity > cachedProduct.stock) {
              Alert.alert(
                "Stock insuficiente",
                `Solo hay ${cachedProduct.stock} unidades disponibles`
              );
              setLoading(false);
              setScanning(true);
              return;
            }
            updatedCart[existingItemIndex].quantity = newQuantity;
            setCart(updatedCart);
          } else {
            // Agregar nuevo item
            setCart([
              ...cart,
              {
                id: cachedProduct.id,
                barcode: cachedProduct.barcode,
                name: cachedProduct.name,
                price: cachedProduct.price,
                quantity: 1,
                stock: cachedProduct.stock,
              },
            ]);
          }

          setLoading(false);
          setScanning(true);
          return;
        }
      }

      // Si no está en caché o no hay caché, buscar en Firestore
      console.log("Producto no encontrado en caché, buscando en Firestore");
      const productsQuery = query(
        collection(db, "products"),
        where("barcode", "==", barcode),
        where("userId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(productsQuery);

      if (querySnapshot.empty) {
        // Producto no encontrado
        console.log("Producto no encontrado para el código:", barcode);
        setAlertActive(true);
        Alert.alert(
          "Producto no encontrado",
          "No se encontró ningún producto con este código de barras."
        );
        setTimeout(() => {
          setLoading(false);
          setScanning(true);
          setAlertActive(false);
        }, 1000);
      } else {
        // Producto encontrado
        const productData = querySnapshot.docs[0].data();
        const product = {
          id: querySnapshot.docs[0].id,
          ...productData,
        };
        console.log("Producto encontrado:", product.name);

        // Añadir/actualizar en el caché local
        if (cachedProducts) {
          const updatedCache = [...cachedProducts];
          const existingIndex = updatedCache.findIndex(
            (p) => p.id === product.id
          );

          if (existingIndex >= 0) {
            updatedCache[existingIndex] = product;
          } else {
            updatedCache.push(product);
          }

          setCachedProducts(updatedCache);
          // También actualizar caché persistente
          CacheService.saveToCache(
            "products",
            updatedCache,
            auth.currentUser.uid
          );
        }

        // Verificar stock
        if (product.stock <= 0) {
          console.log("Producto sin stock:", product.name);
          Alert.alert(
            "Sin stock",
            `El producto ${product.name} no tiene unidades disponibles.`
          );
          setLoading(false);
          setScanning(true);
          return;
        }

        // Ver si ya está en el carrito
        const existingItemIndex = cart.findIndex(
          (item) => item.id === product.id
        );
        if (existingItemIndex !== -1) {
          // Aumentar cantidad en 1
          const updatedCart = [...cart];
          const newQuantity = updatedCart[existingItemIndex].quantity + 1;
          if (newQuantity > product.stock) {
            Alert.alert(
              "Stock insuficiente",
              `Solo hay ${product.stock} unidades disponibles`
            );
            setLoading(false);
            setScanning(true);
            return;
          }
          updatedCart[existingItemIndex].quantity = newQuantity;
          setCart(updatedCart);
        } else {
          // Agregar nuevo item
          setCart([
            ...cart,
            {
              id: product.id,
              barcode: product.barcode,
              name: product.name,
              price: product.price,
              quantity: 1,
              stock: product.stock,
            },
          ]);
        }
        setLoading(false);
        setScanning(true);
      }
    } catch (error) {
      console.error("Error al buscar producto:", error);
      setAlertActive(true);
      setTimeout(() => {
        setLoading(false);
        setScanning(true);
        setAlertActive(false);
      }, 1000);
    }
  };

  // Agregar producto con cantidad seleccionada (cuando se abre el modal)
  const addToCart = () => {
    const quantity = parseInt(currentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert("Error", "La cantidad debe ser un número positivo");
      return;
    }
    if (quantity > selectedProduct.stock) {
      Alert.alert(
        "Error",
        `Solo hay ${selectedProduct.stock} unidades disponibles`
      );
      return;
    }

    const existingItemIndex = cart.findIndex(
      (item) => item.id === selectedProduct.id
    );
    if (existingItemIndex !== -1) {
      const updatedCart = [...cart];
      const newQuantity = updatedCart[existingItemIndex].quantity + quantity;
      if (newQuantity > selectedProduct.stock) {
        Alert.alert(
          "Error",
          `No hay suficiente stock. Solo quedan ${selectedProduct.stock} unidades`
        );
        return;
      }
      updatedCart[existingItemIndex].quantity = newQuantity;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          id: selectedProduct.id,
          barcode: selectedProduct.barcode,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: quantity,
          stock: selectedProduct.stock,
        },
      ]);
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
      Alert.alert("Carrito vacío", "Agrega productos para continuar");
      return;
    }

    // Mostrar el modal de procesamiento
    setProcessingOrder(true);

    try {
      // Verificar stock antes de procesar
      for (const item of cart) {
        // Obtener el stock actual del producto
        const productRef = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          Alert.alert("Error", `El producto ${item.name} ya no existe.`);
          setProcessingOrder(false);
          return;
        }

        const currentStock = productSnap.data().stock;

        if (currentStock < item.quantity) {
          Alert.alert(
            "Error",
            `Stock insuficiente para ${item.name}. Solo quedan ${currentStock} unidades.`
          );
          setProcessingOrder(false);
          return;
        }
      }

      // Crear la venta con estructura correcta
      const totalValue = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const saleData = {
        userId: auth.currentUser.uid,
        date: serverTimestamp(),
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          category: item.category || "Sin categoría", // Agregar categoría
        })),
        total: parseFloat(totalValue),
      };

      // Guardar la venta
      const saleRef = await addDoc(collection(db, "sales"), saleData);

      // Actualizar el stock de cada producto
      const updatePromises = cart.map(async (item) => {
        const productRef = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock;
          const newStock = Math.max(0, currentStock - item.quantity);

          return updateDoc(productRef, {
            stock: newStock,
            updatedAt: serverTimestamp(),
          });
        }
      });

      await Promise.all(updatePromises);

      // Invalidar caché de productos ya que hemos actualizado el stock
      await CacheService.invalidateCache("products", auth.currentUser.uid);
      // Limpiar el caché local también
      setCachedProducts(null);

      // Guardar nueva venta en caché de ventas (añadiéndola a las existentes)
      const cachedSales =
        (await CacheService.getFromCache("sales", auth.currentUser.uid)) || [];
      const newSale = {
        ...saleData,
        id: saleRef.id,
        date: new Date(), // Convertir timestamp a Date para caché
      };
      await CacheService.saveToCache(
        "sales",
        [...cachedSales, newSale],
        auth.currentUser.uid
      );

      setCart([]);
      Alert.alert(
        "Venta realizada",
        "La venta se ha registrado correctamente.",
        [{ text: "OK", onPress: () => navigation.navigate("Dashboard") }]
      );
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      Alert.alert("Error", "No se pudo completar la venta: " + error.message);
    } finally {
      // Ocultar el modal de procesamiento
      setProcessingOrder(false);
    }
  };

  // Búsqueda por texto (modificada para usar caché)
  const searchProducts = async (searchText) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      let products = [];

      // Usar productos en caché si están disponibles
      if (cachedProducts) {
        console.log("Buscando en productos en caché");
        products = cachedProducts;
      } else {
        // Si no hay caché, cargar desde Firestore
        console.log("Buscando en Firestore");
        const productsQuery = query(
          collection(db, "products"),
          where("userId", "==", auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(productsQuery);
        products = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Guardar en caché para futuros usos
        if (products.length > 0) {
          setCachedProducts(products);
          await CacheService.saveToCache(
            "products",
            products,
            auth.currentUser.uid
          );
        }
      }

      // Normalizar el texto de búsqueda (eliminar acentos)
      const normalizedSearchText = searchText
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      // Filtrar por nombre o código, normalizando el nombre para comparación sin acentos
      const filtered = products.filter((product) => {
        // Normalizar el nombre del producto (eliminar acentos)
        const normalizedName = (product.name || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const normalizedBarcode = (product.barcode || "").toLowerCase();

        return (
          normalizedName.includes(normalizedSearchText) ||
          normalizedBarcode.includes(normalizedSearchText)
        );
      });

      setSearchResults(filtered);

      // Cerrar el teclado automáticamente cuando hay resultados, con un retraso
      if (filtered.length > 0) {
        // Agregar un retraso de 1.5 segundos antes de cerrar el teclado
        setTimeout(() => {
          Keyboard.dismiss();
        }, 1500);
      }
    } catch (error) {
      console.error("Error al buscar productos:", error);
      Alert.alert("Error", "No se pudo buscar productos");
    } finally {
      setSearchLoading(false);
    }
  };

  // Ajustar la cantidad en el modal
  const adjustQuantity = (increment) => {
    const currentQty = parseInt(currentQuantity) || 0;
    const newQty = increment ? currentQty + 1 : Math.max(1, currentQty - 1);
    if (selectedProduct && increment && newQty > selectedProduct.stock) {
      Alert.alert(
        "Error",
        `Solo hay ${selectedProduct.stock} unidades disponibles`
      );
      return;
    }
    setCurrentQuantity(newQty.toString());
  };

  // Si todavía no hay permisos de cámara
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

  // RENDER PRINCIPAL
  return (
    <View style={styles.container}>
      {scanning ? (
        // === VISTA DE ESCANEO ===
        <View style={styles.scanContainer}>
          <View style={styles.camera}>
            <Camera
              style={StyleSheet.absoluteFillObject}
              onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
              barCodeScannerSettings={{
                barCodeTypes: [
                  BARCODE_TYPES.qr,
                  BARCODE_TYPES.ean13,
                  BARCODE_TYPES.ean8,
                  BARCODE_TYPES.code128,
                  BARCODE_TYPES.code39,
                  BARCODE_TYPES.code93,
                  BARCODE_TYPES.codabar,
                  BARCODE_TYPES.itf14,
                  BARCODE_TYPES.upc_e,
                ],
              }}
            />
            <View style={styles.overlay}>
              <Text style={styles.scanText}>Escanea el código de barras</Text>

              <View style={styles.scanArea}>
                {/* Esquinas estilizadas */}
                <View style={[styles.corner, styles.cornerTopLeft]}></View>
                <View style={[styles.corner, styles.cornerTopRight]}></View>
                <View style={[styles.corner, styles.cornerBottomLeft]}></View>
                <View style={[styles.corner, styles.cornerBottomRight]}></View>

                {/* Línea fija en el centro */}
                <View style={styles.fixedScanLine} />
              </View>

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#28a745" />
                  <Text style={styles.loadingText}>Buscando producto...</Text>
                </View>
              )}

              {/* Botón de búsqueda por nombre */}
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => setSearchModalVisible(true)}
              >
                <Ionicons name="search" size={20} color="white" />
                <Text style={styles.searchButtonText}>Buscar por Nombre</Text>
              </TouchableOpacity>

              {/* Mostrar contador de productos en carrito */}
              {cart.length > 0 && (
                <TouchableOpacity
                  style={styles.viewCartButton}
                  onPress={() => setScanning(false)}
                >
                  <Ionicons name="cart" size={20} color="white" />
                  <Text style={styles.viewCartButtonText}>
                    Ver Carrito ({cart.length})
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.footerText}>
                Posiciona el código de barras dentro del cuadro
              </Text>
            </View>
          </View>
        </View>
      ) : (
        // === VISTA DEL CARRITO ===
        <View style={styles.cartScreenContainer}>
          {/* Encabezado con título y botón QR a la derecha */}
          <View style={styles.headerRow}>
            <Text style={styles.cartTitle}>Carrito de Compra</Text>
            <TouchableOpacity
              onPress={() => setScanning(true)}
              style={styles.qrIconButton}
            >
              <Ionicons name="qr-code-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={cart}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.cartItem}>
                {/* Nombre del producto y precio */}
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>
                    $ {formatMoney(item.price * item.quantity)}
                  </Text>
                </View>

                {/* Información de stock y cantidad */}
                <View style={styles.itemInfo}>
                  <View style={styles.stockInfo}>
                    <Ionicons name="cube-outline" size={18} color="#666" />
                    <Text style={styles.stockText}>
                      Stock disponible:{" "}
                      <Text
                        style={[
                          styles.stockValue,
                          item.stock - item.quantity <= 3 &&
                            styles.lowStockValue,
                        ]}
                      >
                        {item.stock - item.quantity}
                      </Text>
                      <Text style={styles.totalStockText}>
                        {" "}
                        (Total: {item.stock})
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.quantityContainer}>
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
                      <Ionicons
                        name="remove-circle"
                        size={26}
                        color="#28a745"
                      />
                    </TouchableOpacity>

                    <View style={styles.quantityWrapper}>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.quantityButton,
                        item.stock - item.quantity <= 0 &&
                          styles.disabledButton,
                      ]}
                      disabled={item.stock - item.quantity <= 0}
                      onPress={() => {
                        // Incrementar cantidad
                        if (item.quantity < item.stock) {
                          const updatedCart = [...cart];
                          updatedCart[index].quantity += 1;
                          setCart(updatedCart);
                        }
                      }}
                    >
                      <Ionicons
                        name="add-circle"
                        size={26}
                        color={
                          item.stock - item.quantity <= 0 ? "#aaa" : "#28a745"
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Línea separadora */}
                <View style={styles.itemDivider} />

                {/* Fila de acciones */}
                <View style={styles.actionsRow}>
                  <Text style={styles.itemSubtotal}>
                    Subtotal:{" "}
                    <Text style={styles.subtotalValue}>
                      $ {formatMoney(item.price * item.quantity)}
                    </Text>
                  </Text>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromCart(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.removeButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={70} color="#ddd" />
                <Text style={styles.emptyCartText}>
                  No hay productos en el carrito
                </Text>
                <TouchableOpacity
                  style={styles.scanMoreButton}
                  onPress={() => setScanning(true)}
                >
                  <Text style={styles.scanMoreButtonText}>
                    Escanear productos
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />

          {cart.length > 0 && (
            <View style={styles.checkoutContainer}>
              {/* Subtotal */}
              <View style={styles.subtotalContainer}>
                <View>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.itemCount}>{cart.length} productos</Text>
                </View>
                <Text style={styles.subtotalValue}>$ {formatMoney(total)}</Text>
              </View>

              {/* Botón para finalizar */}
              <TouchableOpacity
                style={styles.finishButton}
                onPress={handleCheckout}
              >
                <Text style={styles.finishButtonText}>Finalizar Venta</Text>
                <Ionicons name="arrow-forward" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buscar Producto</Text>
              <TouchableOpacity
                onPress={() => setSearchModalVisible(false)}
                style={styles.closeSearchButton}
              >
                <Ionicons name="close" size={16} color="#28a745" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#666"
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Nombre o código de barras"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.length > 1) {
                    searchProducts(text);
                  } else if (text.length === 0) {
                    setSearchResults([]);
                  }
                }}
                autoFocus={true}
              />
              {searchQuery !== "" && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {searchLoading ? (
              <ActivityIndicator
                size="large"
                color="#28a745"
                style={{ marginTop: 20 }}
              />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  // Verificar si el producto ya está en el carrito
                  const existingItemIndex = cart.findIndex(
                    (cartItem) => cartItem.id === item.id
                  );
                  const currentQuantity =
                    existingItemIndex !== -1
                      ? cart[existingItemIndex].quantity
                      : 0;
                  const canAdd = item.stock > currentQuantity;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.searchResultItem,
                        !canAdd && styles.disabledSearchItem,
                      ]}
                      disabled={!canAdd}
                      onPress={() => {
                        // Agregar directamente al carrito sin cerrar el modal
                        if (existingItemIndex !== -1) {
                          const updatedCart = [...cart];
                          updatedCart[existingItemIndex].quantity += 1;
                          setCart(updatedCart);
                        } else {
                          setCart([
                            ...cart,
                            {
                              id: item.id,
                              barcode: item.barcode,
                              name: item.name,
                              price: item.price,
                              quantity: 1,
                              stock: item.stock,
                            },
                          ]);
                        }
                      }}
                    >
                      <View style={styles.searchResultContent}>
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>
                            {item.name}
                          </Text>
                          <Text style={styles.searchResultPrice}>
                            Precio: $ {formatMoney(item.price)}
                          </Text>
                          <Text
                            style={[
                              styles.searchResultStock,
                              item.stock < 5 ? styles.lowStockText : null,
                            ]}
                          >
                            Stock: {item.stock}
                          </Text>
                        </View>

                        {canAdd && (
                          <View style={styles.addButtonContainer}>
                            <Ionicons
                              name="add-circle"
                              size={28}
                              color="#28a745"
                            />
                          </View>
                        )}

                        {!canAdd && (
                          <Text style={styles.outOfStockText}>Sin stock</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  searchQuery.length > 2 ? (
                    <Text style={styles.noResultsText}>
                      No se encontraron productos
                    </Text>
                  ) : searchQuery.length > 0 ? (
                    <Text style={styles.noResultsText}>
                      Escribe al menos 2 caracteres
                    </Text>
                  ) : null
                }
                style={{ maxHeight: 300 }}
              />
            )}

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setSearchModalVisible(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <Text style={styles.closeModalButtonText}>Cerrar</Text>
              </TouchableOpacity>

              {cart.length > 0 && (
                <TouchableOpacity
                  style={styles.viewCartModalButton}
                  onPress={() => {
                    setSearchModalVisible(false);
                    setSearchQuery("");
                    setSearchResults([]);
                    setScanning(false); // Mostrar vista de carrito
                  }}
                >
                  <Text style={styles.viewCartModalButtonText}>
                    Ver Carrito ({cart.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de procesamiento */}
      <Modal visible={processingOrder} transparent={true} animationType="fade">
        <View style={styles.processingModalContainer}>
          <View style={styles.processingModalContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingModalText}>Procesando venta...</Text>
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
    backgroundColor: "#ECF9EC", // Fondo verde claro
  },
  cameraPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  permissionButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  // ====== ESCANEO ======
  scanContainer: {
    flex: 1,
    paddingBottom: 60, // Espacio para la barra de navegación
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingBottom: 100, // Espacio para la barra de navegación
  },
  scanText: {
    color: "white",
    fontSize: 22,
    marginBottom: 25,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
  },
  scanArea: {
    width: scanAreaWidth,
    height: scanAreaHeight,
    borderWidth: 0,
    justifyContent: "center",
    alignSelf: "center",
    position: "relative",
    overflow: "hidden",
    marginTop: -40,
  },
  fixedScanLine: {
    height: 1,
    width: "100%",
    backgroundColor: "#fff", // Línea blanca en lugar de verde
    position: "absolute",
    top: "50%",
    opacity: 0.7,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  loadingText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  searchButton: {
    backgroundColor: "#28a745",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 15,
    width: "80%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignSelf: "center",
  },
  searchButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  viewCartButton: {
    backgroundColor: "#28a745",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignSelf: "center",
  },
  viewCartButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  // ====== CARRITO ======
  cartScreenContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingBottom: 60, // Espacio para la barra de navegación
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    elevation: 2,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  qrIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  cartItem: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#28a745",
  },
  itemInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
  stockValue: {
    fontWeight: "bold",
    color: "#28a745",
  },
  lowStockValue: {
    color: "#ff9800",
  },
  totalStockText: {
    fontSize: 12,
    color: "#888",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  quantityButton: {
    padding: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  quantityWrapper: {
    paddingHorizontal: 12,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemSubtotal: {
    fontSize: 14,
    color: "#666",
  },
  subtotalValue: {
    fontWeight: "bold",
    color: "#28a745",
    fontSize: 18,
  },
  removeButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  removeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 5,
  },
  emptyCart: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  emptyCartText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  scanMoreButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  scanMoreButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  checkoutContainer: {
    backgroundColor: "white",
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    elevation: 5,
  },
  subtotalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  itemCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  finishButton: {
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  finishButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  // ====== MODAL BÚSQUEDA ======
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  searchModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#28a745",
    flex: 1,
    textAlign: "center",
    marginBottom: 0,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height: 50,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 5,
    borderRadius: 5,
    alignItems: "center",
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  disabledSearchItem: {
    opacity: 0.6,
    backgroundColor: "#f5f5f5",
  },
  searchResultContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 14,
    color: "#28a745",
    marginBottom: 2,
  },
  searchResultStock: {
    fontSize: 14,
    color: "#666",
  },
  lowStockText: {
    color: "#ff9800",
  },
  outOfStockText: {
    color: "#dc3545",
    fontWeight: "bold",
  },
  addButtonContainer: {
    padding: 5,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  closeModalButton: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
    marginRight: 5,
    borderWidth: 1,
    borderColor: "#28a745",
  },
  closeModalButtonText: {
    color: "#28a745",
    fontWeight: "bold",
    fontSize: 16,
  },
  viewCartModalButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
    marginLeft: 5,
  },
  viewCartModalButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  processingModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  processingModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 7,
    borderWidth: 1,
    borderColor: "#28a745",
  },
  processingModalText: {
    color: "#28a745",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
  },
  // Styles for corners
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#28a745",
    borderWidth: 3,
    backgroundColor: "transparent",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 15,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 15,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 15,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 15,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    position: "absolute",
    bottom: 80,
    textAlign: "center",
    width: "100%",
  },
  closeSearchButton: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});
