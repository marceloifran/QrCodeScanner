import React, { useState } from 'react';
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
  Modal
} from 'react-native';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { colors } from '../theme/colors';
import { categories } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';

export default function EditProductScreen({ route, navigation }) {
  const { product } = route.params;
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [category, setCategory] = useState(product.category || '');
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const validateForm = () => {
    if (!name || !price || !stock || !category) {
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

  const handleUpdateProduct = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'products', product.id), {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category,
        updatedAt: new Date()
      });
      
      Alert.alert(
        'Éxito', 
        'Producto actualizado correctamente',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
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
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'products', product.id));
              navigation.goBack();
            } catch (error) {
              console.error('Error al eliminar producto:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto');
              setLoading(false);
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
          <ScrollView>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryItem,
                  category === cat.id && styles.categoryItemSelected
                ]}
                onPress={() => {
                  setCategory(cat.id);
                  setShowCategoryModal(false);
                }}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={24} 
                  color={category === cat.id ? colors.primary : colors.text.secondary} 
                />
                <Text style={[
                  styles.categoryItemText,
                  category === cat.id && styles.categoryItemTextSelected
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Editar Producto</Text>
        
        <Text style={styles.label}>Código de barras</Text>
        <Text style={styles.barcode}>{product.barcode}</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Nombre del producto"
          value={name}
          onChangeText={setName}
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
        />
        
        <TextInput
          style={styles.input}
          placeholder="Stock"
          value={stock}
          onChangeText={setStock}
          keyboardType="numeric"
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.updateButton, loading && styles.disabledButton]} 
            onPress={handleUpdateProduct}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Actualizar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.deleteButton, loading && styles.disabledButton]} 
            onPress={handleDeleteProduct}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CategoryModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 30,
    textAlign: 'center',
    color: colors.text.primary,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  barcode: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 20,
    padding: 15,
    backgroundColor: colors.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
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
  updateButton: {
    flex: 1,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deleteButton: {
    flex: 1,
    height: 50,
    backgroundColor: colors.error,
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
}); 