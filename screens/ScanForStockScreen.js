import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const scanAreaWidth = width * 0.7;
const scanAreaHeight = scanAreaWidth * 0.7;

export default function ScanForStockScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  
  // Animación para la línea de escaneo
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  
  const cameraRef = useRef(null);

  // Configurar opciones de navegación para ocultar el título
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      title: '' // Esto elimina el texto "ScanForStock"
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Iniciar la animación de la línea de escaneo
    startScanLineAnimation();

    // Reiniciar el estado de escaneo cuando la pantalla obtiene el foco
    const unsubscribe = navigation.addListener('focus', () => {
      setScanning(true);
      setLoading(false);
      setAlertActive(false);
    });

    return unsubscribe;
  }, [navigation]);
  
  // Función para animar la línea de escaneo
  const startScanLineAnimation = () => {
    scanLineAnimation.setValue(0);
    Animated.loop(
      Animated.timing(scanLineAnimation, {
        toValue: scanAreaHeight,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanning && !loading && !alertActive) {
      setScanning(false);
      processBarcode(data);
    }
  };

  const processBarcode = async (barcode) => {
    try {
      setLoading(true);
      
      // Verificar si debemos volver a AddProduct
      if (route.params?.returnTo === 'AddProduct') {
        setLoading(false);
        navigation.navigate('AddProduct', { barcode });
        return;
      }
      
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
                setScanning(true);
                setAlertActive(false);
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
        // Producto encontrado, navegar a la pantalla de edición
        const productData = querySnapshot.docs[0].data();
        const product = {
          id: querySnapshot.docs[0].id,
          ...productData
        };
        
        setLoading(false);
        setAlertActive(false);
        navigation.navigate('EditProduct', { productId: product.id });
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      Alert.alert('Error', 'Ocurrió un error al buscar el producto');
      setLoading(false);
      setScanning(true);
      setAlertActive(false);
    }
  };

  const handleClose = () => {
    // Usar goBack() en lugar de navigate para asegurar que vuelva a la pantalla anterior
    navigation.goBack();
  };

  if (hasPermission === null) {
    return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Se requiere acceso a la cámara</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={handleClose}
        >
          <Text style={styles.permissionButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "code93", "codabar", "itf14", "upc_e"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Escanear para actualizar stock</Text>
          </View>
          
          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              {/* Línea de escaneo animada */}
              <Animated.View 
                style={[
                  styles.scanLine, 
                  { 
                    transform: [{ translateY: scanLineAnimation }] 
                  }
                ]} 
              />
              
              {/* Esquinas del recuadro */}
              <View style={[styles.cornerTL, styles.corner]} />
              <View style={[styles.cornerTR, styles.corner]} />
              <View style={[styles.cornerBL, styles.corner]} />
              <View style={[styles.cornerBR, styles.corner]} />
            </View>
            
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Buscando producto...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Escanea el código de barras de un producto para actualizar su stock
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  scanAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: scanAreaWidth,
    height: scanAreaHeight,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: 'red',
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors.primary,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  loadingContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 5,
    margin: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 