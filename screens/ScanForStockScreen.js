import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { Camera } from "expo-camera";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

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

export default function ScanForStockScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [alertActive, setAlertActive] = useState(false);

  const cameraRef = useRef(null);

  // Configurar opciones de navegación para ocultar el título
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      title: "", // Esto elimina el texto "ScanForStock"
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    // Reiniciar el estado de escaneo cuando la pantalla obtiene el foco
    const unsubscribe = navigation.addListener("focus", () => {
      setScanning(true);
      setLoading(false);
      setAlertActive(false);
    });

    return unsubscribe;
  }, [navigation]);

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
      if (route.params?.returnTo === "AddProduct") {
        setLoading(false);
        navigation.navigate("AddProduct", { barcode });
        return;
      }

      const productsQuery = query(
        collection(db, "products"),
        where("barcode", "==", barcode),
        where("userId", "==", auth.currentUser.uid)
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
              style: "cancel",
            },
            {
              text: "Sí",
              onPress: () => {
                setLoading(false);
                setAlertActive(false);
                navigation.navigate("AddProduct", { barcode });
              },
            },
          ]
        );
      } else {
        // Producto encontrado, navegar a la pantalla de edición
        const productData = querySnapshot.docs[0].data();
        const product = {
          id: querySnapshot.docs[0].id,
          ...productData,
        };

        setLoading(false);
        setAlertActive(false);
        navigation.navigate("EditProduct", { productId: product.id });
      }
    } catch (error) {
      console.error("Error al buscar producto:", error);
      Alert.alert("Error", "Ocurrió un error al buscar el producto");
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
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.cameraPermissionContainer}>
        <Text style={styles.permissionText}>
          Se requiere acceso a la cámara
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={handleClose}>
          <Text style={styles.permissionButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.camera}>
        <Camera
          ref={cameraRef}
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
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Escanear para actualizar stock
            </Text>
          </View>

          <View style={styles.scanAreaContainer}>
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
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Buscando producto...</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Escanea el código de barras de un producto para actualizar su
              stock
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ECF9EC",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
    paddingBottom: 60, // Espacio para la barra de navegación
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
  },
  closeButton: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 15,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scanAreaContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -60,
  },
  scanArea: {
    width: scanAreaWidth,
    height: scanAreaHeight,
    backgroundColor: "transparent",
    overflow: "hidden",
    position: "relative",
  },
  fixedScanLine: {
    height: 1,
    width: "100%",
    backgroundColor: "#fff",
    position: "absolute",
    top: "50%",
    opacity: 0.7,
  },
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
  loadingContainer: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    color: "#28a745",
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  cameraPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  permissionText: {
    color: "#333",
    fontSize: 18,
    textAlign: "center",
    margin: 20,
  },
  permissionButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 12,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
