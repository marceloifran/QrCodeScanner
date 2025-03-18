import React, { useState, useEffect } from 'react';
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
  FlatList
} from 'react-native';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Camera, CameraView } from 'expo-camera';
import { colors } from '../theme/colors';
import { categories } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddProductScreen({ navigation }) {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');         // Precio mostrado (posible modificado con ganancia)
  const [basePrice, setBasePrice] = useState('');   // Precio original ingresado
  const [selectedPercentage, setSelectedPercentage] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifyExpiry, setNotifyExpiry] = useState(false);

  const commonPercentages = ['10', '15', '20', '25', '30', '35', '40', '50'];

  // Solicitar permisos al montar el componente
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
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
      setSelectedPercentage('');
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
      Alert.alert('Error', 'El nombre, precio, stock y categoría son obligatorios');
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
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef, 
          where('barcode', '==', barcode),
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          Alert.alert(
            'Producto existente',
            'Ya existe un producto con este código de barras. ¿Deseas actualizar su stock?',
            [
              {
                text: 'Cancelar',
                style: 'cancel',
                onPress: () => setLoading(false)
              },
              {
                text: 'Actualizar',
                onPress: async () => {
                  setLoading(false);
                  navigation.navigate('EditProduct', { productId: querySnapshot.docs[0].id });
                }
              }
            ]
          );
          return;
        }
      }
      
      // Crear el producto con o sin código de barras
      const productData = {
        name,
        price: parseFloat(price),
        basePrice: basePrice ? parseFloat(basePrice) : parseFloat(price),
        stock: parseInt(stock),
        category,
        barcode: barcode || '', // Guardar cadena vacía si no hay código
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiryDate: expiryDate || null,
        notifyExpiry: notifyExpiry,
      };
      
      await addDoc(collection(db, 'products'), productData);
      
      Alert.alert(
        'Éxito',
        'Producto agregado correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              // Limpiar el formulario
              setBarcode('');
              setName('');
              setPrice('');
              setBasePrice('');
              setSelectedPercentage('');
              setStock('');
              setLowStockThreshold('');
              setCategory('');
              setExpiryDate(new Date());
              setNotifyExpiry(false);
              
              // Navegar de vuelta a la lista de productos
              navigation.navigate('ProductList');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error al agregar producto:', error);
      Alert.alert('Error', 'No se pudo agregar el producto');
    } finally {
      setLoading(false);
    }
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
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
                  category === item.id && styles.categoryItemSelected
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
                    category === item.id && styles.categoryItemTextSelected
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                <Text style={styles.sublabel}>Aplicar porcentaje de ganancia:</Text>
                {selectedPercentage ? (
                  <TouchableOpacity style={styles.resetButton} onPress={resetPrice}>
                    <Text style={styles.resetButtonText}>Quitar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              
              <View style={styles.percentageButtonsContainer}>
                {commonPercentages.map(percent => (
                  <TouchableOpacity
                    key={percent}
                    style={[
                      styles.percentageButton,
                      selectedPercentage === percent && styles.selectedPercentageButton
                    ]}
                    onPress={() => applyPercentage(percent)}
                  >
                    <Text
                      style={[
                        styles.percentageButtonText,
                        selectedPercentage === percent && styles.selectedPercentageButtonText
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
            <Text
              style={category ? styles.categoryText : styles.categoryPlaceholder}
            >
              {category ? categories.find(c => c.id === category)?.name : 'Seleccionar categoría'}
            </Text>
            <Ionicons name="chevron-down" size={24} color={colors.text.secondary} />
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
            <Ionicons name="calendar-outline" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          
          <View style={styles.notificationOption}>
            <Text style={styles.notificationText}>Notificar cuando se acerque la fecha de vencimiento</Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                notifyExpiry ? styles.toggleButtonActive : styles.toggleButtonInactive
              ]}
              onPress={() => setNotifyExpiry(!notifyExpiry)}
            >
              <View style={[
                styles.toggleIndicator,
                notifyExpiry ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
              ]} />
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
        </Modal>
      )}
      
      {showDatePicker && (
        <DateTimePicker
          value={expiryDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
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
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
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
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: 'white',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#666',
  },
  percentageButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  percentageButton: {
    backgroundColor: '#f0f0f0',
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
    color: '#333',
  },
  selectedPercentageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  categorySelector: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  categoryPlaceholder: {
    color: colors.text.secondary,
  },
  dateSelector: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#e8f5e9',
  },
  categoryItemTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTarget: {
    width: 300,
    height: 100,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    height: 2,
    width: '90%',
    backgroundColor: 'red',
  },
  scannerText: {
    color: 'white',
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
});
