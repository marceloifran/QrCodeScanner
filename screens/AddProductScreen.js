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
  Picker,
} from "react-native";
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

        console.log(
          "AddProduct - Cargando datos para industria:",
          userIndustry
        );

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
            console.log(
              "La industria en la configuración no coincide con la industria actual, actualizando..."
            );
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
        } else {
          // Si no existe configuración, crear una basada en la industria
          const defaultConfig = {
            industry: userIndustry,
            customFields: getCustomFieldsForIndustry(userIndustry),
            createdAt: new Date(),
          };

          // Guardar la configuración por defecto
          await setDoc(
            doc(db, "industryConfig", auth.currentUser.uid),
            defaultConfig
          );

          setIndustryConfig(defaultConfig);

          // Inicializar campos personalizados
          const initialCustomFields = {};
          if (defaultConfig.customFields) {
            Object.keys(defaultConfig.customFields).forEach((field) => {
              if (defaultConfig.customFields[field].enabled) {
                initialCustomFields[field] = "";
              }
            });
          }
          setCustomFields(initialCustomFields);
        }
      } catch (error) {
        console.error("Error al cargar categorías y configuración:", error);
        // En caso de error, usar categorías generales
        const defaultCategories = getCategoriesForIndustry("general");
        setCategories(defaultCategories);
      }
    };

    loadCategoriesAndConfig();
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
    console.log(`Código escaneado: ${data} (Tipo: ${type})`);
    setBarcode(data);
    setScanning(false);
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

    setLoading(true);
    try {
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
      };

      // Añadir campos personalizados según la industria
      if (industryConfig) {
        productData.industryType = industryType;
        productData.customFields = customFields;
      }

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
        console.log(
          "Actualizando campo personalizado de fecha:",
          currentDateField,
          selectedDate
        );
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
      transparent={true}
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
                <Ionicons name={item.icon} size={24} color={colors.primary} />
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
      console.log("No hay configuración de industria o campos personalizados");
      return null;
    }

    return (
      <View style={styles.section}>
        {Object.entries(industryConfig.customFields).map(
          ([fieldKey, field]) => {
            // Si el campo no tiene nombre, usar el ID como nombre
            const fieldName = field.name || fieldKey;

            // Si estamos en la industria de ropa (clothing) y el campo es uno de los repetidos, no mostrarlo
            if (industryType === "clothing" && 
                (fieldKey === "price" || fieldKey === "stock" || fieldKey === "barcode")) {
              return null;
            }

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
                  <View>
                    {/* Reemplazar el sistema de botones por un Picker para el campo talle */}
                    {fieldKey === "size" ? (
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
                          <Picker.Item label="Seleccionar talle" value="" />
                          {field.options.map((option, index) => (
                            <Picker.Item key={index} label={option} value={option} />
                          ))}
                        </Picker>
                      </View>
                    ) : (
                      <View style={styles.selectContainer}>
                        {field.options.map((option, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.selectOption,
                              customFields[fieldKey] === option &&
                                styles.selectedSelectOption,
                            ]}
                            onPress={() => {
                              setCustomFields({
                                ...customFields,
                                [fieldKey]: option,
                              });
                            }}
                          >
                            <Text
                              style={[
                                styles.selectOptionText,
                                customFields[fieldKey] === option &&
                                  styles.selectedSelectOptionText,
                              ]}
                            >
                              {option}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
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
            style={styles.inputContainer}
            onPress={() => setShowCategoryModal(true)}
          >
            <Ionicons
              name="pricetag-outline"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <Text style={[styles.input, !category && styles.placeholderText]}>
              {category
                ? getCategoryName(category, categories)
                : "Seleccionar categoría"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
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

        {renderCustomFields()}

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
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 5,
  },
  sublabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  percentageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  resetButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  resetButtonText: {
    fontSize: 12,
    color: "#666",
  },
  percentageButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  percentageButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedPercentageButton: {
    backgroundColor: colors.primary,
  },
  percentageButtonText: {
    fontSize: 14,
    color: "#333",
  },
  selectedPercentageButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  inputContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputIcon: {
    marginRight: 10,
  },
  placeholderText: {
    color: colors.text.secondary,
  },
  dateSelector: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryItemText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 15,
  },
  categoryItemSelected: {
    backgroundColor: "#e8f5e9",
  },
  categoryItemTextSelected: {
    color: colors.primary,
    fontWeight: "bold",
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTarget: {
    width: 300,
    height: 100,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  scanLine: {
    height: 2,
    width: "90%",
    backgroundColor: "red",
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
  notificationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 5,
  },
  notificationText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
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
    backgroundColor: "#e0e0e0",
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
  },
  toggleIndicatorActive: {
    marginLeft: "auto",
  },
  toggleIndicatorInactive: {
    marginLeft: 0,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 10,
  },
  requiredStar: {
    color: "red",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: colors.text.primary,
    marginRight: 10,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 15,
    height: 50,
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: colors.text.primary,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedOptionItem: {
    backgroundColor: "rgba(0, 128, 0, 0.05)",
  },
  optionText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  selectedOptionText: {
    color: colors.primary,
    fontWeight: "bold",
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  pickerContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    marginBottom: 10,
  },
  picker: {
    height: 50,
  },
  booleanOption: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    marginRight: 5,
    alignItems: "center",
  },
  selectedBooleanOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  booleanOptionText: {
    color: colors.text.primary,
  },
  selectedBooleanOptionText: {
    color: "white",
    fontWeight: "bold",
  },
  selectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
    gap: 8,
  },
  selectOption: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  selectedSelectOption: {
    backgroundColor: colors.primary,
  },
  selectOptionText: {
    fontSize: 14,
    color: "#333",
  },
  selectedSelectOptionText: {
    color: "white",
    fontWeight: "bold",
  },
});
