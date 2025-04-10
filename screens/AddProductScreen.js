import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Camera, CameraView } from "expo-camera";
import { colors } from "../theme/colors";
import { categories } from "../constants/categories";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getCategoriesForIndustry,
  getCustomFieldsForIndustry,
} from "../utils/categoryUtils";
import { verifyProductLimit } from "../utils/subscriptionUtils";

export default function AddProductScreen({ navigation }) {
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState(""); // Precio mostrado (posible modificado con ganancia)
  const [basePrice, setBasePrice] = useState(""); // Precio original ingresado
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const [stock, setStock] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifyExpiry, setNotifyExpiry] = useState(false);
  const [industryConfig, setIndustryConfig] = useState(null);
  const [industryType, setIndustryType] = useState("general");
  const [customFields, setCustomFields] = useState({});
  const [categories, setCategories] = useState([]);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [currentSelectField, setCurrentSelectField] = useState(null);
  const [currentDateField, setCurrentDateField] = useState(null);
  const [productLimit, setProductLimit] = useState(null);

  const commonPercentages = ["10", "15", "20", "25", "30", "35", "40", "50"];

  // Solicitar permisos al montar el componente
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Añadir esta función en useEffect para cargar la configuración
  useEffect(() => {
    const loadIndustryConfig = async () => {
      try {
        // Primero cargar la industria del usuario
        const businessInfoRef = doc(db, "businessInfo", auth.currentUser.uid);
        const businessInfoDoc = await getDoc(businessInfoRef);

        let userIndustry = "general";
        if (businessInfoDoc.exists()) {
          const data = businessInfoDoc.data();
          userIndustry = data.industry || "general";
        }

        // Obtener la configuración de campos personalizados para la industria
        const customFields = getCustomFieldsForIndustry(userIndustry);

        // Crear o actualizar la configuración en Firestore
        const industryConfigRef = doc(
          db,
          "industryConfig",
          auth.currentUser.uid
        );
        const configDoc = await getDoc(industryConfigRef);

        if (!configDoc.exists() || configDoc.data().industry !== userIndustry) {
          const newConfig = {
            industry: userIndustry,
            customFields: customFields,
            updatedAt: new Date(),
          };

          await setDoc(industryConfigRef, newConfig);
          setIndustryConfig(newConfig);

          // Inicializar campos personalizados
          const initialFields = {};
          Object.keys(customFields).forEach((field) => {
            initialFields[field] = "";
          });
          setCustomFields(initialFields);
        } else {
          setIndustryConfig(configDoc.data());

          // Inicializar campos personalizados
          const initialFields = {};
          Object.keys(configDoc.data().customFields).forEach((field) => {
            initialFields[field] = "";
          });
          setCustomFields(initialFields);
        }
      } catch (error) {
        console.error("Error al cargar configuración de industria:", error);
      }
    };

    loadIndustryConfig();
  }, []);

  // Dentro del componente AddProductScreen, añadir un useEffect para cargar las categorías
  useEffect(() => {
    const loadCategoriesAndConfig = async () => {
      try {
        // Cargar la industria del usuario
        const businessInfoRef = doc(db, "businessInfo", auth.currentUser.uid);
        const businessInfoDoc = await getDoc(businessInfoRef);

        let userIndustry = "general";
        if (businessInfoDoc.exists()) {
          userIndustry = businessInfoDoc.data().industry || "general";
          setIndustryType(userIndustry);
        }

        // Obtener categorías directamente de categoryUtils
        const industryCategories = getCategoriesForIndustry(userIndustry);
        setCategories(industryCategories);

        // Cargar configuración de campos personalizados
        const configDoc = await getDoc(
          doc(db, "industryConfig", auth.currentUser.uid)
        );
        if (configDoc.exists()) {
          const config = configDoc.data();

          // Verificar que la industria en la configuración coincida con la industria actual
          if (config.industry !== userIndustry) {
            // Actualizar la configuración con los campos correctos para la industria actual
            const updatedConfig = {
              ...config,
              industry: userIndustry,
              customFields: getCustomFieldsForIndustry(userIndustry),
              updatedAt: new Date(),
            };

            // Guardar la configuración actualizada
            await setDoc(
              doc(db, "industryConfig", auth.currentUser.uid),
              updatedConfig,
              { merge: true }
            );

            setIndustryConfig(updatedConfig);

            // Inicializar campos personalizados
            const initialCustomFields = {};
            if (updatedConfig.customFields) {
              Object.keys(updatedConfig.customFields).forEach((field) => {
                if (updatedConfig.customFields[field].enabled) {
                  initialCustomFields[field] = "";
                }
              });
            }
            setCustomFields(initialCustomFields);
          } else {
            // La industria coincide, usar la configuración existente
            setIndustryConfig(config);

            // Inicializar campos personalizados
            const initialCustomFields = {};
            if (config.customFields) {
              Object.keys(config.customFields).forEach((field) => {
                if (config.customFields[field].enabled) {
                  initialCustomFields[field] = "";
                }
              });
            }
            setCustomFields(initialCustomFields);
          }
        }
      } catch (error) {
        console.error("Error al cargar categorías y configuración:", error);
      }
    };

    loadCategoriesAndConfig();
  }, []);

  useEffect(() => {
    const loadProductLimit = async () => {
      try {
        const limit = await verifyProductLimit(auth.currentUser.uid);
        setProductLimit(limit);
      } catch (error) {
        console.error("Error al cargar límite de productos:", error);
      }
    };

    loadProductLimit();
  }, []);

  // Función para aplicar porcentaje al precio
  const applyPercentage = (percentage) => {
    if (!price) return;

    // Si ya se tiene seleccionado ese porcentaje, se quita la ganancia y se restablece el precio original
    if (selectedPercentage === percentage) {
      resetPrice();
      return;
    }

    // Se usa el precio base; si por alguna razón no está definido, se toma el precio actual
    const baseValue = parseFloat(basePrice || price);
    if (isNaN(baseValue)) return;

    const percentValue = parseFloat(percentage);
    if (isNaN(percentValue)) return;

    // Se calcula el nuevo precio: precio base + (precio base * porcentaje / 100)
    const newPrice = baseValue * (1 + percentValue / 100);

    // Se redondea y se actualiza el precio y el porcentaje seleccionado
    setPrice(Math.round(newPrice).toString());
    setSelectedPercentage(percentage);
  };

  // Función para restablecer el precio al valor original
  const resetPrice = () => {
    if (basePrice) {
      setPrice(basePrice);
      setSelectedPercentage("");
    }
  };

  // Al cambiar el precio manualmente se actualiza también el precio base si no hay porcentaje aplicado
  const handlePriceChange = (text) => {
    setPrice(text);
    if (!selectedPercentage) {
      setBasePrice(text);
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanning(false);
    setBarcode(data);
  };

  const validateForm = () => {
    if (!name || !price || !stock || !category) {
      Alert.alert(
        "Error",
        "El nombre, precio, stock y categoría son obligatorios"
      );
      return false;
    }
    return true;
  };

  const handleAddProduct = async () => {
    if (!validateForm()) return;

    try {
      // Verificar si el usuario puede agregar más productos según su plan
      const canAddProduct = await verifyProductLimit(navigation);
      if (!canAddProduct) {
        return; // La función verifyProductLimit ya muestra una alerta si es necesario
      }

      setLoading(true);
      // Si hay un código de barras, verificar si ya existe
      if (barcode) {
        const productsRef = collection(db, "products");
        const q = query(
          productsRef,
          where("barcode", "==", barcode),
          where("userId", "==", auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          Alert.alert(
            "Producto existente",
            "Ya existe un producto con este código de barras. ¿Deseas actualizar su stock?",
            [
              {
                text: "Cancelar",
                style: "cancel",
                onPress: () => setLoading(false),
              },
              {
                text: "Actualizar",
                onPress: async () => {
                  setLoading(false);
                  navigation.navigate("EditProduct", {
                    productId: querySnapshot.docs[0].id,
                  });
                },
              },
            ]
          );
          return;
        }
      }

      // Crear objeto de producto con campos básicos
      const productData = {
        name,
        barcode,
        price: parseFloat(price),
        basePrice: basePrice ? parseFloat(basePrice) : parseFloat(price),
        stock: parseInt(stock),
        category,
        lowStockThreshold: lowStockThreshold
          ? parseInt(lowStockThreshold)
          : null,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiryDate: expiryDate || null,
        notifyExpiry: notifyExpiry,
        industryType: industryType
      };

      await addDoc(collection(db, "products"), productData);

      Alert.alert("Éxito", "Producto agregado correctamente", [
        {
          text: "OK",
          onPress: () => {
            // Limpiar el formulario
            setBarcode("");
            setName("");
            setPrice("");
            setBasePrice("");
            setSelectedPercentage("");
            setStock("");
            setLowStockThreshold("");
            setCategory("");
            setExpiryDate(new Date());
            setNotifyExpiry(false);

            // Navegar de vuelta a la lista de productos
            navigation.navigate("ProductList");
          },
        },
      ]);
    } catch (error) {
      console.error("Error al agregar producto:", error);
      Alert.alert("Error", "No se pudo agregar el producto");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios" ? true : false);

    if (selectedDate) {
      if (currentDateField === "expiryDate") {
        setExpiryDate(selectedDate);
      } else if (currentDateField) {
        setCustomFields({
          ...customFields,
          [currentDateField]: selectedDate,
        });
      }
    }
  };

  const renderCategoryModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showCategoryModal}
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  category === item.id && styles.categoryItemSelected,
                ]}
                onPress={() => {
                  setCategory(item.id);
                  setShowCategoryModal(false);
                }}
              >
                <Ionicons 
                  name={item.icon || "pricetag-outline"} 
                  size={24} 
                  color={category === item.id ? colors.primary : colors.text.primary} 
                />
                <Text
                  style={[
                    styles.categoryItemText,
                    category === item.id && styles.categoryItemTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowCategoryModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const getCategoryName = (categoryId, categoriesList) => {
    const category = categoriesList.find((cat) => cat.id === categoryId);
    return category ? category.name : "Sin categoría";
  };

  const renderCustomFields = () => {
    if (!industryConfig || !industryConfig.customFields) {
      return null;
    }

    return (
      <View style={styles.section}>
        {Object.entries(industryConfig.customFields).map(
          ([fieldKey, field]) => {
            // Si el campo no tiene nombre, usar el ID como nombre
            const fieldName = field.name || fieldKey;

            return (
              <View key={fieldKey} style={styles.formGroup}>
                <Text style={styles.label}>
                  {fieldName}
                  {field.required && (
                    <Text style={styles.requiredStar}> *</Text>
                  )}
                </Text>

                {/* Campo de texto simple */}
                {field.type === "text" && (
                  <TextInput
                    style={styles.input}
                    value={customFields[fieldKey] || ""}
                    onChangeText={(text) => {
                      setCustomFields({ ...customFields, [fieldKey]: text });
                    }}
                    placeholder={`Ingrese ${fieldName.toLowerCase()}`}
                  />
                )}

                {/* Campo de texto multilínea */}
                {field.type === "textarea" && (
                  <TextInput
                    style={[
                      styles.input,
                      { height: 100, textAlignVertical: "top" },
                    ]}
                    value={customFields[fieldKey] || ""}
                    onChangeText={(text) => {
                      setCustomFields({ ...customFields, [fieldKey]: text });
                    }}
                    placeholder={`Ingrese ${fieldName.toLowerCase()}`}
                    multiline={true}
                    numberOfLines={4}
                  />
                )}

                {/* Campo numérico */}
                {field.type === "number" && (
                  <TextInput
                    style={styles.input}
                    value={customFields[fieldKey] || ""}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, "");
                      setCustomFields({
                        ...customFields,
                        [fieldKey]: numericValue,
                      });
                    }}
                    placeholder={`Ingrese ${fieldName.toLowerCase()}`}
                    keyboardType="numeric"
                  />
                )}

                {/* Selector de opciones */}
                {field.type === "select" && field.options && (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={customFields[fieldKey] || ""}
                      style={styles.picker}
                      onValueChange={(itemValue) => {
                        setCustomFields({
                          ...customFields,
                          [fieldKey]: itemValue,
                        });
                      }}
                    >
                      <Picker.Item label={`Seleccionar ${fieldName.toLowerCase()}`} value="" />
                      {field.options.map((option, index) => (
                        <Picker.Item key={index} label={option} value={option} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
            );
          }
        )}
      </View>
    );
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
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Código de Barras (opcional)</Text>
          <View style={styles.barcodeContainer}>
            <TextInput
              style={styles.barcodeInput}
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Escanea o ingresa el código"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setScanning(true)}
            >
              <Ionicons name="scan-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre del Producto</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ingresa el nombre"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Precio</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={handlePriceChange}
            placeholder="Ingresa el precio"
            keyboardType="numeric"
          />

          {price ? (
            <>
              <View style={styles.percentageHeader}>
                <Text style={styles.sublabel}>
                  Aplicar porcentaje de ganancia:
                </Text>
                {selectedPercentage ? (
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetPrice}
                  >
                    <Text style={styles.resetButtonText}>Quitar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.percentageButtonsContainer}>
                {commonPercentages.map((percent) => (
                  <TouchableOpacity
                    key={percent}
                    style={[
                      styles.percentageButton,
                      selectedPercentage === percent &&
                        styles.selectedPercentageButton,
                    ]}
                    onPress={() => applyPercentage(percent)}
                  >
                    <Text
                      style={[
                        styles.percentageButtonText,
                        selectedPercentage === percent &&
                          styles.selectedPercentageButtonText,
                      ]}
                    >
                      {percent}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Stock</Text>
          <TextInput
            style={styles.input}
            value={stock}
            onChangeText={setStock}
            placeholder="Ingresa la cantidad"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Umbral de Stock Bajo (opcional)</Text>
          <TextInput
            style={styles.input}
            value={lowStockThreshold}
            onChangeText={setLowStockThreshold}
            placeholder="Notificar cuando el stock sea menor a"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Categoría</Text>
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setShowCategoryModal(true)}
          >
            <Ionicons
              name="pricetag-outline"
              size={20}
              color={colors.text.primary}
              style={styles.inputIcon}
            />
            <Text style={styles.categoryText}>
              {category
                ? getCategoryName(category, categories)
                : "Seleccionar categoría"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Fecha de Vencimiento (opcional)</Text>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {expiryDate.toLocaleDateString()}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.text.secondary}
            />
          </TouchableOpacity>

          <View style={styles.notificationOption}>
            <Text style={styles.notificationText}>
              Notificar cuando se acerque la fecha de vencimiento
            </Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                notifyExpiry
                  ? styles.toggleButtonActive
                  : styles.toggleButtonInactive,
              ]}
              onPress={() => setNotifyExpiry(!notifyExpiry)}
            >
              <View
                style={[
                  styles.toggleIndicator,
                  notifyExpiry
                    ? styles.toggleIndicatorActive
                    : styles.toggleIndicatorInactive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, loading && { opacity: 0.7 }]}
          onPress={handleAddProduct}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.addButtonText}>Agregar Producto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {renderCategoryModal()}

      {scanning && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={scanning}
          onRequestClose={() => setScanning(false)}
        >
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={handleBarCodeScanned}
              cameraType="back"
              flashMode="auto"
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerTarget}>
                  <View style={styles.scanLine} />
                </View>
                <Text style={styles.scannerText}>
                  Apunta al código de barras
                </Text>
                <TouchableOpacity
                  style={styles.cancelScanButton}
                  onPress={() => setScanning(false)}
                >
                  <Text style={styles.cancelScanButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={expiryDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: colors.text.primary,
  },
  sublabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.secondary,
    marginBottom: 5,
  },
  requiredStar: {
    color: "red",
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    marginLeft: 10,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
    color: colors.text.primary,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryItemSelected: {
    backgroundColor: colors.background.highlight,
  },
  categoryItemText: {
    fontSize: 16,
    marginLeft: 10,
    color: colors.text.primary,
  },
  categoryItemTextSelected: {
    fontWeight: "600",
    color: colors.primary,
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 15,
  },
  modalCloseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  cameraPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scannerTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  scanLine: {
    height: 2,
    width: "80%",
    backgroundColor: colors.primary,
  },
  scannerCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 10,
  },
  percentageButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  percentageButton: {
    backgroundColor: colors.background.secondary,
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPercentageButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  percentageButtonText: {
    color: colors.text.primary,
    fontWeight: "500",
  },
  selectedPercentageButtonText: {
    color: "white",
  },
  percentageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  resetButton: {
    backgroundColor: colors.background.secondary,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetButtonText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  inputIcon: {
    marginRight: 10,
    color: colors.text.primary,
  },
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  notificationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  notificationText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
    marginRight: 10,
  },
  toggleButton: {
    width: 50,
    height: 26,
    borderRadius: 13,
    padding: 3,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonInactive: {
    backgroundColor: "#ccc",
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
  },
  toggleIndicatorActive: {
    alignSelf: "flex-end",
  },
  toggleIndicatorInactive: {
    alignSelf: "flex-start",
  },
  pickerContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 5,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
    color: colors.text.primary,
  },
  scannerText: {
    color: "white",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  cancelScanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  cancelScanButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
