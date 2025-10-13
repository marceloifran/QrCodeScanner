import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { colors } from '../theme/colors';
// Usando componentes nativos en lugar de Picker externo
import { categories } from '../constants/categories';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function EditProductScreen({ route, navigation }) {
  const { product } = route.params;
  
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [category, setCategory] = useState(product.category || 'other');
  const [loading, setLoading] = useState(false);

  const handleUpdateProduct = async () => {
    if (!name || !price || !stock) {
      Alert.alert('Error', 'Por favor complete todos los campos');
      return;
    }

    setLoading(true);
    try {
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category,
        updatedAt: new Date()
      });
      
      Alert.alert('Éxito', 'Producto actualizado correctamente');
      navigation.goBack();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      Alert.alert('Error', 'No se pudo actualizar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Está seguro de que desea eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'products', product.id));
              Alert.alert('Éxito', 'Producto eliminado correctamente');
              navigation.goBack();
            } catch (error) {
              console.error('Error al eliminar producto:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.icon : 'help-circle-outline';
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Producto</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {/* Product Icon and Barcode */}
          <View style={styles.productHeader}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="package-variant-closed" 
                size={40} 
                color={colors.primary} 
              />
            </View>
            <View style={styles.barcodeContainer}>
              <Text style={styles.barcodeLabel}>Código de barras</Text>
              <Text style={styles.barcodeText}>{product.barcode}</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre del producto</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nombre del producto"
                placeholderTextColor={colors.text.light}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <Text style={styles.label}>Precio</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.text.light}
                  />
                </View>
              </View>

              <View style={[styles.inputContainer, styles.halfInput]}>
                <Text style={styles.label}>Stock</Text>
                <TextInput
                  style={styles.input}
                  value={stock}
                  onChangeText={setStock}
                  placeholder="Cantidad"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.text.light}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Categoría</Text>
              <View style={styles.categorySelector}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      category === cat.id && styles.categoryButtonActive
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Ionicons 
                      name={cat.icon} 
                      size={18} 
                      color={category === cat.id ? colors.text.onPrimary : colors.text.secondary} 
                    />
                    <Text 
                      style={[
                        styles.categoryButtonText,
                        category === cat.id && styles.categoryButtonTextActive
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.updateButton} 
              onPress={handleUpdateProduct}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={colors.text.onPrimary} />
                  <Text style={styles.buttonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDeleteProduct}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={20} color={colors.text.onPrimary} />
              <Text style={styles.buttonText}>Eliminar Producto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.onPrimary,
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  barcodeContainer: {
    flex: 1,
  },
  barcodeLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  barcodeText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: colors.text.secondary,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  categoryButtonTextActive: {
    color: colors.text.onPrimary,
  },
  buttonContainer: {
    marginTop: 10,
  },
  updateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  deleteButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  buttonText: {
    color: colors.text.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});