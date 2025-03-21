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
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { colors } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera"; // Import Camera components
import { getCategoriesForIndustry, getCustomFieldsForIndustry } from '../utils/categoryUtils';

export default function EditProductScreen({ navigation, route }) {
  const { productId } = route.params;

  const [product, setProduct] = useState(null);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const [stock, setStock] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifyExpiry, setNotifyExpiry] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  const commonPercentages = ["10", "15", "20", "25", "30", "35", "40", "50"];

  const [industryConfig, setIndustryConfig] = useState(null);
  const [customFields, setCustomFields] = useState({});

  const [categories, setCategories] = useState([]);

  const [showSelectModal, setShowSelectModal] = useState(false);
  const [currentSelectField, setCurrentSelectField] = useState(null);
  const [currentDateField, setCurrentDateField] = useState(null);

  useEffect(() => {
    loadProduct();

    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    const loadCategoriesAndConfig = async () => {
      try {
        // Cargar la industria del usuario
        const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
        const businessInfoDoc = await getDoc(businessInfoRef);
        
        let userIndustry = 'general';
        if (businessInfoDoc.exists()) {
          userIndustry = businessInfoDoc.data().industry || 'general';
        }
        
        console.log('EditProduct - Cargando datos para industria:', userIndustry);
        
        // Obtener categorías directamente de categoryUtils
        const industryCategories = getCategoriesForIndustry(userIndustry);
        setCategories(industryCategories);
        
        // Cargar configuración de campos personalizados
        const configDoc = await getDoc(doc(db, 'industryConfig', auth.currentUser.uid));
        if (configDoc.exists()) {
          const config = configDoc.data();
          
          // Verificar que la industria en la configuración coincida con la industria actual
          if (config.industry !== userIndustry) {
            console.log('La industria en la configuración no coincide con la industria actual, actualizando...');
            // Actualizar la configuración con los campos correctos para la industria actual
            const updatedConfig = {
              ...config,
              industry: userIndustry,
              customFields: getCustomFieldsForIndustry(userIndustry),
              updatedAt: new Date()
            };
            
            // Guardar la configuración actualizada
            await setDoc(doc(db, 'industryConfig', auth.currentUser.uid), updatedConfig, { merge: true });
            
            setIndustryConfig(updatedConfig);
          } else {
            // La industria coincide, usar la configuración existente
            setIndustryConfig(config);
          }
        } else {
          // Si no existe configuración, crear una basada en la industria
          const defaultConfig = {
            industry: userIndustry,
            customFields: getCustomFieldsForIndustry(userIndustry),
            createdAt: new Date()
          };
          
          // Guardar la configuración por defecto
          await setDoc(doc(db, 'industryConfig', auth.currentUser.uid), defaultConfig);
          
          setIndustryConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Error al cargar categorías y configuración:', error);
        // En caso de error, usar categorías generales
        const defaultCategories = getCategoriesForIndustry('general');
        setCategories(defaultCategories);
      }
    };
    
    loadCategoriesAndConfig();
  }, []);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const productDoc = await getDoc(doc(db, "products", productId));

      if (!productDoc.exists()) {
        Alert.alert("Error", "El producto no existe");
        navigation.goBack();
        return;
      }

      const productData = {
        id: productDoc.id,
        ...productDoc.data(),
      };

      setProduct(productData);
      setName(productData.name || "");
      setBarcode(productData.barcode || "");
      setPrice(productData.price ? productData.price.toString() : "");
      setBasePrice(productData.price ? productData.price.toString() : "");
      setStock(productData.stock ? productData.stock.toString() : "");
      setLowStockThreshold(productData.lowStockThreshold ? productData.lowStockThreshold.toString() : "5");
      setCategory(productData.category || "");
      setExpiryDate(
        productData.expiryDate
          ? new Date(productData.expiryDate.seconds * 1000)
          : null
      );
      setNotifyExpiry(productData.notifyExpiry || false);

      if (productData.customFields) {
        setCustomFields(productData.customFields);
      }

      const configDoc = await getDoc(doc(db, "industryConfig", auth.currentUser.uid));
      if (configDoc.exists()) {
        setIndustryConfig(configDoc.data());
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el producto");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product && product.userId !== auth.currentUser.uid) {
      Alert.alert("Error", "No tienes permiso para editar este producto");
      navigation.goBack();
    }
  }, []);

  const validateForm = () => {
    if (!name || !price || !stock || !category) {
      Alert.alert(
        "Error",
        "El nombre, precio, stock y categoría son obligatorios"
      );
      return false;
    }
    if (isNaN(price) || parseFloat(price) <= 0) {
      Alert.alert("Error", "El precio debe ser un número válido mayor a 0");
      return false;
    }
    if (isNaN(stock) || parseInt(stock) < 0) {
      Alert.alert(
        "Error",
        "El stock debe ser un número válido mayor o igual a 0"
      );
      return false;
    }
    return true;
  };

  const handleUpdateProduct = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (barcode !== product.barcode) {
        const productsRef = collection(db, "products");
        const q = query(
          productsRef,
          where("barcode", "==", barcode),
          where("userId", "==", auth.currentUser.uid),
          where("__name__", "!=", productId)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          Alert.alert(
            "Código de barras duplicado",
            "Ya existe otro producto con este código de barras.",
            [{ text: "OK" }]
          );
          setLoading(false);
          return;
        }
      }

      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, {
        name,
        barcode,
        price: parseFloat(price),
        basePrice: basePrice ? parseFloat(basePrice) : parseFloat(price),
        stock: parseInt(stock),
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null,
        category,
        updatedAt: serverTimestamp(),
        expiryDate: expiryDate || null,
        notifyExpiry: notifyExpiry,
        customFields: customFields,
      });

      Alert.alert(
        "Producto actualizado",
        "El producto se ha actualizado correctamente",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      Alert.alert("Error", "No se pudo actualizar el producto");
    } finally {
      setLoading(false);
    }
  };

  const renderCategorySelector = () => {
    return (
      <TouchableOpacity
        style={styles.categorySelector}
        onPress={() => setShowCategoryModal(true)}
      >
        <View style={styles.categorySelectorContent}>
          <Ionicons 
            name={getCategoryIcon(category)} 
            size={24} 
            color={colors.primary} 
            style={styles.categoryIcon}
          />
          <Text style={styles.categoryText}>
            {getCategoryName(category, categories)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
    );
  };

  const renderCategoryModal = () => {
    return (
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar categoría</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    category === item.id && styles.selectedCategoryOption
                  ]}
                  onPress={() => {
                    setCategory(item.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <View style={styles.categoryOptionContent}>
                    <View style={[
                      styles.categoryIconContainer, 
                      { backgroundColor: category === item.id ? colors.primary : '#f0f0f0' }
                    ]}>
                      <Ionicons 
                        name={getCategoryIcon(item.id)} 
                        size={20} 
                        color={category === item.id ? 'white' : colors.primary} 
                      />
                    </View>
                    <Text style={[
                      styles.categoryOptionText,
                      category === item.id && styles.selectedCategoryOptionText
                    ]}>
                      {item.name}
                    </Text>
                  </View>
                  {category === item.id && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const handleDateSelection = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        "Seleccionar fecha",
        "Por favor ingresa la fecha de vencimiento en formato DD/MM/YYYY",
        [
          {
            text: "Cancelar",
            style: "cancel"
          },
          {
            text: "Guardar",
            onPress: (value) => {
              const dateParts = value.split('/');
              if (dateParts.length === 3) {
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1;
                const year = parseInt(dateParts[2]);
                setExpiryDate(new Date(year, month, day));
              }
            }
          }
        ]
      );
    } else {
      setShowDatePicker(true);
    }
  };

  const applyPercentage = (percentage) => {
    if (!price) return;

    if (selectedPercentage === percentage) {
      resetPrice();
      return;
    }

    const baseValue = parseFloat(basePrice || price);
    if (isNaN(baseValue)) return;

    const percentValue = parseFloat(percentage);
    if (isNaN(percentValue)) return;

    const newPrice = baseValue * (1 + percentValue / 100);

    setPrice(Math.round(newPrice).toString());
    setSelectedPercentage(percentage);
  };

  const resetPrice = () => {
    if (basePrice) {
      setPrice(basePrice);
      setSelectedPercentage("");
    }
  };

  const handlePriceChange = (text) => {
    setPrice(text);
    if (!selectedPercentage) {
      setBasePrice(text);
    }
  };

  const handleScanBarcode = () => {
    setScanning(true);
  };

  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
    setShowCategoryModal(false);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      if (currentDateField === 'expiryDate') {
        setExpiryDate(selectedDate);
      } else if (currentDateField) {
        setCustomFields({
          ...customFields,
          [currentDateField]: selectedDate
        });
      }
    }
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

  const renderBarcodeScanner = () =>
    scanning && (
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={(data) => {
            setBarcode(data.data);
            setScanning(false);
          }}
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_e",
              "upc_a",
              "code39",
              "code128",
            ],
          }}
        >
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerTarget}>
              <View style={styles.scanLine} />
            </View>
            <Text style={styles.scannerText}>Apunta al código de barras</Text>
            <TouchableOpacity
              style={styles.cancelScanButton}
              onPress={() => setScanning(false)}
            >
              <Text style={styles.cancelScanButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );

  if (loading && !name) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando producto...</Text>
      </View>
    );
  }

  const categoryName = getCategoryName(category, categories) || "Sin categoría";

  const renderDatePicker = () => {
    return (
      <View style={styles.datePickerContainer}>
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => {
            Alert.alert("Fecha", "Selector de fecha temporalmente deshabilitado");
          }}
        >
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.datePickerText}>
            {expiryDate ? expiryDate.toLocaleDateString() : 'Seleccionar fecha'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCustomFields = () => {
    if (!industryConfig || !industryConfig.customFields) {
      console.log('No hay configuración de industria o campos personalizados');
      return null;
    }
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Adicional</Text>
        
        {Object.keys(industryConfig.customFields).map(fieldKey => {
          const field = industryConfig.customFields[fieldKey];
          if (!field.enabled) return null;
          
          return (
            <View key={fieldKey} style={styles.formGroup}>
              <Text style={styles.label}>
                {field.label}
                {field.required && <Text style={styles.requiredStar}> *</Text>}
              </Text>
              
              {/* Campo de texto simple */}
              {(field.type === 'text' || !field.type) && (
                <TextInput
                  style={styles.input}
                  value={customFields[fieldKey] || ''}
                  onChangeText={(text) => {
                    setCustomFields({...customFields, [fieldKey]: text});
                  }}
                  placeholder={`Ingrese ${field.label.toLowerCase()}`}
                />
              )}
              
              {/* Campo de texto multilínea */}
              {field.type === 'textarea' && (
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  value={customFields[fieldKey] || ''}
                  onChangeText={(text) => {
                    setCustomFields({...customFields, [fieldKey]: text});
                  }}
                  placeholder={`Ingrese ${field.label.toLowerCase()}`}
                  multiline={true}
                  numberOfLines={4}
                />
              )}
              
              {/* Campo numérico */}
              {field.type === 'number' && (
                <TextInput
                  style={styles.input}
                  value={customFields[fieldKey] || ''}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setCustomFields({...customFields, [fieldKey]: numericValue});
                  }}
                  placeholder={`Ingrese ${field.label.toLowerCase()}`}
                  keyboardType="numeric"
                />
              )}
              
              {/* Selector de fecha */}
              {field.type === 'date' && (
                <TouchableOpacity 
                  style={styles.input}
                  onPress={() => {
                    // Implementar selector de fecha
                    Alert.alert('Fecha', 'Selector de fecha no implementado');
                  }}
                >
                  <Text style={{ color: customFields[fieldKey] ? '#000' : '#999' }}>
                    {customFields[fieldKey] || `Seleccionar ${field.label.toLowerCase()}`}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Selector booleano (Sí/No) */}
              {field.type === 'boolean' && (
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.booleanOption,
                      customFields[fieldKey] === true && styles.selectedBooleanOption
                    ]}
                    onPress={() => setCustomFields({...customFields, [fieldKey]: true})}
                  >
                    <Text style={[
                      styles.booleanOptionText,
                      customFields[fieldKey] === true && styles.selectedBooleanOptionText
                    ]}>Sí</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.booleanOption,
                      customFields[fieldKey] === false && styles.selectedBooleanOption
                    ]}
                    onPress={() => setCustomFields({...customFields, [fieldKey]: false})}
                  >
                    <Text style={[
                      styles.booleanOptionText,
                      customFields[fieldKey] === false && styles.selectedBooleanOptionText
                    ]}>No</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Selector de opciones */}
              {field.type === 'select' && field.options && (
                <View style={styles.selectContainer}>
                  {field.options.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.selectOption,
                        customFields[fieldKey] === option && styles.selectedSelectOption
                      ]}
                      onPress={() => {
                        setCustomFields({...customFields, [fieldKey]: option});
                      }}
                    >
                      <Text style={[
                        styles.selectOptionText,
                        customFields[fieldKey] === option && styles.selectedSelectOptionText
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scrollContent}>
        <View style={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Código de barras</Text>
            <View style={styles.barcodeContainer}>
              <TextInput
                style={styles.barcodeInput}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Código de barras (opcional)"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleScanBarcode}
              >
                <Ionicons
                  name="barcode-outline"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Nombre del producto"
            value={name}
            onChangeText={setName}
          />
          <View style={styles.formGroup}>
            <Text style={styles.label}>Categoría</Text>
            {renderCategorySelector()}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Fecha de vencimiento (opcional)</Text>
            {renderDatePicker()}
            
            {expiryDate && (
              <View style={styles.notificationOption}>
                <Text style={styles.notificationText}>
                  Notificar cuando se acerque la fecha de vencimiento
                </Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    notifyExpiry ? styles.toggleButtonActive : styles.toggleButtonInactive
                  ]}
                  onPress={() => setNotifyExpiry(!notifyExpiry)}
                >
                  <View
                    style={[
                      styles.toggleIndicator,
                      notifyExpiry ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
                    ]}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Text style={styles.label}>Precio</Text>
          <TextInput
            style={styles.input}
            placeholder="Precio"
            value={price}
            onChangeText={handlePriceChange}
            keyboardType="decimal-pad"
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

          <Text style={styles.label}>Stock</Text>
          <TextInput
            style={styles.input}
            placeholder="Stock"
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
          />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Umbral de Stock Bajo</Text>
            <TextInput
              style={styles.input}
              value={lowStockThreshold}
              onChangeText={setLowStockThreshold}
              placeholder="5"
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>
              Notificar cuando el stock sea menor o igual a este valor
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                { flex: 1 },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleUpdateProduct}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>

          {renderCustomFields()}
        </View>
      </View>
      {renderCategoryModal()}
      {renderBarcodeScanner()}
    </ScrollView>
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
  formContainer: {},
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  sublabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 5,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: colors.background,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  categorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 10,
  },
  categoryText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  categoryOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCategoryOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryOptionText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  selectedCategoryOptionText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  datePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 5,
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  datePickerText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 10,
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#e0e0e0',
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  toggleIndicatorActive: {
    marginLeft: 'auto',
  },
  toggleIndicatorInactive: {
    marginLeft: 0,
  },
  helperText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 5,
    marginBottom: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 10,
  },
  requiredStar: {
    color: 'red',
    fontWeight: 'bold',
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 5,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barcodeContent: {
    alignItems: "center",
  },
  barcodeTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text.primary,
    marginBottom: 10,
  },
  barcodeValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 15,
  },
  barcodeIcon: {
    marginVertical: 10,
  },
  barcodeInput: {
    flex: 1,
    height: 40,
    color: colors.text.primary,
  },
  scanButton: {
    padding: 10,
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
  cameraPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    color: colors.text.primary,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  percentageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
    marginBottom: 15,
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
  formGroup: {
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  picker: {
    flex: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.text.primary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedOptionItem: {
    backgroundColor: 'rgba(0, 128, 0, 0.05)',
  },
  optionText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  selectedOptionText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  booleanOption: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    marginRight: 5,
    alignItems: 'center',
  },
  selectedBooleanOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  booleanOptionText: {
    color: colors.text.primary,
  },
  selectedBooleanOptionText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  selectOption: {
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    margin: 5,
  },
  selectedSelectOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectOptionText: {
    color: colors.text.primary,
  },
  selectedSelectOptionText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

const getCategoryName = (categoryId, categoriesList) => {
  const category = categoriesList.find(cat => cat.id === categoryId);
  return category ? category.name : 'Sin categoría';
};

const getCategoryIcon = (categoryId) => {
  // Implement the logic to return the appropriate icon based on the category
  // This is a placeholder and should be replaced with the actual implementation
  return "category-icon-placeholder";
};

