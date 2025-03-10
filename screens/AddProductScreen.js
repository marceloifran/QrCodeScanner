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
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Camera, CameraView } from 'expo-camera';
import { colors } from '../theme/colors';
import { categories, loadCustomCategories, predefinedCategories } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddProductScreen({ navigation, route }) {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    // Si se recibió un código de barras como parámetro, establecerlo en el estado
    if (route.params?.barcode) {
      setBarcode(route.params.barcode);
      console.log("Código de barras recibido:", route.params.barcode);
    }
  }, [route.params?.barcode]);

  useEffect(() => {
    const loadCategories = async () => {
      await loadCustomCategories();
      // Forzar actualización del estado para reflejar las nuevas categorías
      setForceUpdate(prev => !prev);
    };
    
    loadCategories();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status === 'granted') {
      setScanning(true);
    } else {
      Alert.alert('Error', 'Se requiere permiso de cámara para escanear códigos');
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    setBarcode(data);
    setScanning(false);
  };

  const validateForm = () => {
    if (!barcode || !name || !price || !stock || !category) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
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

  const handleAddProduct = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Verificar si ya existe un producto con el mismo código de barras para este usuario
      const q = query(
        collection(db, 'products'), 
        where('barcode', '==', barcode),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        Alert.alert('Error', 'Ya existe un producto con este código de barras');
        setLoading(false);
        return;
      }
      
      // Agregar el nuevo producto con el ID del usuario y fecha de vencimiento
      await addDoc(collection(db, 'products'), {
        barcode,
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category,
        expiryDate: expiryDate ? expiryDate : null,
        createdAt: new Date(),
        userId: auth.currentUser.uid
      });
      
      Alert.alert(
        'Éxito', 
        'Producto agregado correctamente',
        [{ 
          text: 'OK', 
          onPress: () => {
            navigation.goBack();
          }
        }]
      );
    } catch (error) {
      console.error('Error al agregar producto:', error);
      Alert.alert('Error', 'No se pudo agregar el producto');
    } finally {
      setLoading(false);
    }
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
            data={predefinedCategories}
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
            onPress={() => {
              setShowCategoryModal(false);
            }}
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

  // Función para guardar categoría personalizada
  const saveCustomCategory = async (categoryId, categoryName) => {
    try {
      // Obtener categorías personalizadas existentes
      const customCategoriesRef = doc(db, 'customCategories', auth.currentUser.uid);
      const customCategoriesDoc = await getDoc(customCategoriesRef);
      
      let customCategories = {};
      if (customCategoriesDoc.exists()) {
        customCategories = customCategoriesDoc.data().categories || {};
      }
      
      // Añadir nueva categoría
      customCategories[categoryId] = {
        name: categoryName,
        icon: 'pricetag-outline' // Icono predeterminado
      };
      
      // Guardar en Firestore
      await setDoc(customCategoriesRef, { categories: customCategories }, { merge: true });
      
      // Mostrar confirmación
      Alert.alert('Categoría creada', `La categoría "${categoryName}" ha sido creada`);
    } catch (error) {
      console.error('Error al guardar categoría personalizada:', error);
      Alert.alert('Error', 'No se pudo guardar la categoría');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          {/* Eliminar este texto si está duplicado */}
          {/* <Text style={styles.headerTitle}>Agregar Producto</Text> */}
        </View>
        
        <View style={styles.barcodeContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Código de barras"
            value={barcode}
            onChangeText={setBarcode}
            editable={!scanning}
          />
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.scanButtonText}>Escanear</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Nombre del producto"
          value={name}
          onChangeText={setName}
          editable={!scanning}
        />

        <TouchableOpacity
          style={styles.categorySelector}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={[
            styles.categoryText,
            !category && styles.categoryPlaceholder
          ]}>
            {category ? 
              categories.find(cat => cat.id === category)?.name : 
              'Seleccionar categoría'
            }
          </Text>
          <Ionicons name="chevron-down" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Precio"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          editable={!scanning}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Stock"
          value={stock}
          onChangeText={setStock}
          keyboardType="numeric"
          editable={!scanning}
        />
        
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.dateSelectorContent}>
            <Ionicons name="calendar" size={24} color={colors.text.secondary} />
            <Text style={[
              styles.dateText,
              !expiryDate && styles.datePlaceholder
            ]}>
              {expiryDate ? expiryDate.toLocaleDateString() : 'Fecha de vencimiento (opcional)'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.addButton, loading && styles.disabledButton]} 
          onPress={handleAddProduct}
          disabled={loading || scanning}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>Agregar Producto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CategoryModal />

      {scanning && hasPermission && (
  <View style={StyleSheet.absoluteFill}>
    <Camera
      style={styles.camera}
      onBarCodeScanned={handleBarCodeScanned}
      barCodeScannerSettings={{
        barCodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
      }}
    >
      <View style={styles.overlay}>
        <Text style={styles.scanText}>Escanea el código de barras</Text>
        <View style={styles.scanArea}>
          <View style={styles.scanLine} />
        </View>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => setScanning(false)}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Camera>
  </View>
)}


      {showDatePicker && (
        <DateTimePicker
          value={expiryDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    // Eliminar este texto si está duplicado
    // <Text style={styles.headerTitle}>Agregar Producto</Text>
  },
  barcodeContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000',
  },
  scanButton: {
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  scanButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  cancelButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 5,
    marginTop: 30,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
    backgroundColor: colors.background,
  },
  categoryItemTextSelected: {
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
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dateText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 10,
  },
  datePlaceholder: {
    color: colors.text.secondary,
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  newCategoryInput: {
    flex: 1,
    height: 50,
    backgroundColor: 'white',
    borderRadius: 5,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000',
  },
  newCategoryButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  newCategoryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 