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
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';
import { categories, getCategoryName } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Camera, CameraView } from 'expo-camera'; // Import Camera components

export default function EditProductScreen({ navigation, route }) {
  const { productId } = route.params;
  
  const [product, setProduct] = useState(null);
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [selectedPercentage, setSelectedPercentage] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [scanning, setScanning] = useState(false); // State for scanning mode
  const [hasPermission, setHasPermission] = useState(null);  // State for camera permission

  const commonPercentages = ['10', '15', '20', '25', '30', '35', '40', '50'];

  useEffect(() => {
    loadProduct();

    // Request camera permissions on component mount
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      
      if (!productDoc.exists()) {
        Alert.alert('Error', 'El producto no existe');
        navigation.goBack();
        return;
      }
      
      const productData = {
        id: productDoc.id,
        ...productDoc.data()
      };
      
      setProduct(productData);
      setName(productData.name || '');
      setBarcode(productData.barcode || '');
      setPrice(productData.price ? productData.price.toString() : '');
      setBasePrice(productData.price ? productData.price.toString() : '');
      setStock(productData.stock ? productData.stock.toString() : '');
      setCategory(productData.category || '');
      setExpiryDate(productData.expiryDate ? new Date(productData.expiryDate.seconds * 1000) : null);
    } catch (error) {
      console.error('Error al cargar el producto:', error);
      Alert.alert('Error', 'No se pudo cargar el producto');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product && product.userId !== auth.currentUser.uid) {
      Alert.alert('Error', 'No tienes permiso para editar este producto');
      navigation.goBack();
    }
  }, []);

  const validateForm = () => {
    if (!name || !price || !stock || !category) {
      Alert.alert('Error', 'El nombre, precio, stock y categoría son obligatorios');
      return false;
    }
    if (isNaN(price) || parseFloat(price) <= 0) {
      Alert.alert('Error', 'El precio debe ser un número válido mayor a 0');
      return false;
    }
    if (isNaN(stock) || parseInt(stock) < 0) {
      Alert.alert('Error', 'El stock debe ser un número válido mayor o igual a 0');
      return false;
    }
    return true;
  };

  const handleUpdateProduct = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      if (barcode !== product.barcode) {
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef, 
          where('barcode', '==', barcode),
          where('userId', '==', auth.currentUser.uid),
          where('__name__', '!=', productId)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          Alert.alert(
            'Código de barras duplicado',
            'Ya existe otro producto con este código de barras.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
      }
      
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        name,
        barcode,
        price: parseFloat(price),
        basePrice: basePrice ? parseFloat(basePrice) : parseFloat(price),
        stock: parseInt(stock),
        category,
        updatedAt: serverTimestamp(),
        expiryDate: expiryDate || null
      });
      
      Alert.alert(
        'Producto actualizado',
        'El producto se ha actualizado correctamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      Alert.alert('Error', 'No se pudo actualizar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = () => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await deleteDoc(doc(db, 'products', product.id));
              navigation.goBack();
            } catch (error) {
              console.error('Error al eliminar producto:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto');
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const CategoryModal = () => (
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
                key={item.id}
                style={[
                  styles.categoryItem,
                  category === item.id && styles.categoryItemSelected
                ]}
                onPress={() => {
                  setCategory(item.id);
                  setShowCategoryModal(false);
                }}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={category === item.id ? colors.primary : colors.text.secondary} 
                />
                <Text style={[
                  styles.categoryItemText,
                  category === item.id && styles.categoryItemTextSelected
                ]}>
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

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
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
      setSelectedPercentage('');
    }
  };

  const handlePriceChange = (text) => {
    setPrice(text);
    if (!selectedPercentage) {
      setBasePrice(text);
    }
  };

  // Barcode Scanning Logic
  const handleBarCodeScanned = ({ type, data }) => {
    console.log(`Código escaneado: ${data} (Tipo: ${type})`);
    setBarcode(data);
    setScanning(false);
  };

  // Render methods for different permission states
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

  const renderBarcodeScanner = () => (
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
  );

  if (loading && !name) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Encontrar el nombre de la categoría
  const categoryName = getCategoryName(category);

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
                onPress={() => setScanning(true)} // Open scanner modal
              >
                <Ionicons name="barcode-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Nombre del producto"
            value={name}
            onChangeText={setName}
          />

<Text style={styles.label}>Categoría</Text>
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[
              styles.categoryText,
              !category && styles.categoryPlaceholder
            ]}>
              <Text>{categoryName}</Text> {/* Wrap categoryName with <Text> */}
            </Text>
            <Ionicons name="chevron-down" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <Text style={styles.label}>Fecha de vencimiento (opcional)</Text>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[
              styles.dateText,
              !expiryDate && styles.datePlaceholder
            ]}>
              <Text>{expiryDate ? expiryDate.toLocaleDateString() : 'Seleccionar fecha de vencimiento (opcional)'}</Text> {/* Wrap conditional string */}
            </Text>
            <Ionicons name="calendar-outline" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          
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
          
          <Text style={styles.label}>Stock</Text>
          <TextInput
            style={styles.input}
            placeholder="Stock"
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
          />
          
          <Text style={styles.label}>Fecha de vencimiento (opcional)</Text>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[
              styles.dateText,
              !expiryDate && styles.datePlaceholder
            ]}>
              {expiryDate ? expiryDate.toLocaleDateString() : 'Seleccionar fecha de vencimiento (opcional)'}
            </Text>
            <Ionicons name="calendar-outline" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={expiryDate || new Date()}
              mode="date"
              display="default"
              onChange={onChangeDate}
              minimumDate={new Date()}
            />
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { flex: 1 }, loading && { opacity: 0.7 }]}
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
        </View>

        {/* Mostrar el código de barras como texto e icono */}
        {barcode && (
          <View style={styles.barcodeContainer}>
            <View style={styles.barcodeContent}>
              <Text style={styles.barcodeTitle}>Código de barras</Text>
              <Text style={styles.barcodeValue}>{barcode}</Text>
              <Ionicons name="barcode-outline" size={60} color={colors.text.secondary} style={styles.barcodeIcon} />
            </View>
          </View>
        )}
      </View>

      <CategoryModal />
      {renderBarcodeScanner()} {/* Render the Barcode Scanner Modal */}
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
  formContainer: {
    // Add any necessary styles for the form container
  },
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
    width: '100%',
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
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  categoryPlaceholder: {
    color: colors.text.secondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
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
  categoryItemSelected: {
    backgroundColor: colors.surface,
  },
  categoryItemText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 15,
  },
  categoryItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  datePlaceholder: {
    color: colors.text.secondary,
  },
  percentageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    marginBottom: 15,
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
  formGroup: {
    marginBottom: 20,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 5,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barcodeContent: {
    alignItems: 'center',
  },
  barcodeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 10,
  },
  barcodeValue: {
    fontSize: 18,
    fontWeight: 'bold',
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
  // Styles for Barcode Scanner Overlay
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
  cameraPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});