import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Picker } from 'react-native';
import { getCategoriesForIndustry, getCustomFieldsForIndustry } from '../utils/categoryUtils';

// Lista de industrias disponibles (igual que en RegisterScreen)
const INDUSTRY_TYPES = [
  { id: 'general', name: 'Tienda General', icon: 'storefront-outline' },
  { id: 'grocery', name: 'Supermercado/Almacén', icon: 'cart-outline' },
  { id: 'clothing', name: 'Tienda de Ropa', icon: 'shirt-outline' },
  { id: 'pharmacy', name: 'Farmacia', icon: 'medical-outline' },
  { id: 'electronics', name: 'Electrónica', icon: 'hardware-chip-outline' },
  { id: 'restaurant', name: 'Restaurante/Cafetería', icon: 'restaurant-outline' },
  { id: 'bakery', name: 'Panadería', icon: 'fast-food-outline' },
  { id: 'hardware', name: 'Ferretería', icon: 'construct-outline' },
  { id: 'beauty', name: 'Belleza/Cosmética', icon: 'cut-outline' },
  { id: 'bookstore', name: 'Librería', icon: 'book-outline' },
  { id: 'other', name: 'Otro', icon: 'ellipsis-horizontal-outline' }
];

export default function BusinessSettingsScreen({ navigation }) {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  
  useEffect(() => {
    loadBusinessInfo();
  }, []);
  
  const loadBusinessInfo = async () => {
    setLoading(true);
    try {
      // Cargar información del negocio
      const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);
      
      if (businessInfoDoc.exists()) {
        const data = businessInfoDoc.data();
        setBusinessName(data.name || '');
        setIndustry(data.industry || 'general');
      } else {
        // Si no existe, usar el displayName del usuario
        setBusinessName(auth.currentUser.displayName || '');
      }
    } catch (error) {
      console.error('Error al cargar información del negocio:', error);
      Alert.alert('Error', 'No se pudo cargar la información del negocio');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!businessName) {
      Alert.alert('Error', 'Por favor ingresa el nombre del negocio');
      return;
    }
    
    setSaving(true);
    try {
      // Verificar si la industria ha cambiado
      const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);
      const currentIndustry = businessInfoDoc.exists() ? businessInfoDoc.data().industry : null;
      const industryChanged = currentIndustry !== industry;
      
      // Actualizar información del negocio
      await setDoc(businessInfoRef, {
        name: businessName,
        industry: industry,
        updatedAt: new Date()
      }, { merge: true });
      
      // Si la industria cambió, actualizar la configuración de campos personalizados
      if (industryChanged) {
        console.log('Industria cambiada de', currentIndustry, 'a', industry);
        
        // Obtener los campos personalizados para la nueva industria
        const newCustomFields = getCustomFieldsForIndustry(industry);
        
        // Actualizar configuración de campos personalizados según la nueva industria
        const industryConfigRef = doc(db, 'industryConfig', auth.currentUser.uid);
        await setDoc(industryConfigRef, {
          industry: industry,
          customFields: newCustomFields,
          updatedAt: new Date()
        });
        
        Alert.alert('Éxito', 'Información del negocio y configuración actualizada correctamente');
        
        // Forzar la actualización de las pantallas principales
        // Esto hará que se recarguen las categorías en todas las pantallas
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        Alert.alert('Éxito', 'Información del negocio actualizada correctamente');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error al guardar información del negocio:', error);
      Alert.alert('Error', 'No se pudo guardar la información del negocio');
    } finally {
      setSaving(false);
    }
  };
  
  const getIndustryIcon = (industryId) => {
    const industry = INDUSTRY_TYPES.find(item => item.id === industryId);
    return industry ? industry.icon : 'storefront-outline';
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre del Negocio</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="storefront-outline" size={22} color={colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Nombre de tu negocio"
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de Negocio</Text>
          <View style={styles.inputContainer}>
            <Ionicons 
              name={INDUSTRY_TYPES.find(item => item.id === industry)?.icon || 'storefront-outline'} 
              size={22} 
              color={colors.text.secondary} 
              style={styles.inputIcon} 
            />
            <TouchableOpacity 
              style={styles.industrySelector}
              onPress={() => setShowIndustryModal(true)}
            >
              <Text style={styles.industrySelectorText}>
                {INDUSTRY_TYPES.find(item => item.id === industry)?.name || 'Seleccionar tipo de negocio'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={24} color={colors.info} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Al cambiar el tipo de negocio, se actualizarán los campos personalizados para tus productos. 
            Los datos existentes no se perderán, pero algunos campos podrían ocultarse según el tipo de negocio seleccionado.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Modal para seleccionar industria */}
      <Modal
        visible={showIndustryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIndustryModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIndustryModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona el tipo de negocio</Text>
            <ScrollView>
              {INDUSTRY_TYPES.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.industryOption,
                    industry === item.id && styles.selectedIndustryOption
                  ]}
                  onPress={() => {
                    setIndustry(item.id);
                    setShowIndustryModal(false);
                  }}
                >
                  <View style={styles.industryIconContainer}>
                    <Ionicons name={item.icon} size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.industryOptionText}>{item.name}</Text>
                  {industry === item.id && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text.secondary,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: colors.text.primary,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    height: 55,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#e1f5fe',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
  },
  industryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  industryOptionIcon: {
    marginRight: 10,
  },
  industryOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  industrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    height: 55,
  },
  industrySelectorText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  industryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  selectedIndustryOption: {
    backgroundColor: 'rgba(40, 167, 69, 0.05)',
  },
}); 