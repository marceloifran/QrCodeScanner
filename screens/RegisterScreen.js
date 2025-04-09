import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Picker } from 'react-native';
import { getCategoriesForIndustry, getCustomFieldsForIndustry } from '../utils/categoryUtils';

// Lista de industrias disponibles
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

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('general');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  
  const handleRegister = async () => {
    // Validaciones
    if (!email || !password || !confirmPassword || !businessName) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Actualizar el perfil del usuario con el nombre del negocio
      await updateProfile(user, {
        displayName: businessName
      });
      
      // Guardar información del negocio en Firestore
      await setDoc(doc(db, 'businessInfo', user.uid), {
        name: businessName,
        industry: industry,
        createdAt: new Date()
      });
      
      // Crear configuración de campos personalizados según la industria
      await setDoc(doc(db, 'industryConfig', user.uid), {
        industry: industry,
        customFields: getCustomFieldsForIndustry(industry),
        createdAt: new Date()
      });
      
      // Crear documento de notificaciones
      await setDoc(doc(db, 'notificationSettings', user.uid), {
        lowStock: true,
        zeroStock: true,
        productsByCategory: {}
      });
      
      // Mostrar mensaje de éxito
      Alert.alert(
        'Registro Exitoso',
        'Tu cuenta ha sido creada correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              // La navegación automática al Dashboard debería ocurrir por el AuthContext
              // Pero podemos forzarla aquí para asegurarnos
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      let errorMessage = 'Ocurrió un error al registrar el usuario';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está en uso';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es demasiado débil';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const getIndustryIcon = (industryId) => {
    const industry = INDUSTRY_TYPES.find(item => item.id === industryId);
    return industry ? industry.icon : 'storefront-outline';
  };
  
  const renderIndustrySelector = () => (
    <View style={styles.formGroup}>
      <Text style={styles.pickerLabel}>Tipo de Negocio</Text>
      <View style={styles.pickerWrapper}>
        <Ionicons 
          name={getIndustryIcon(industry)} 
          size={22} 
          color={colors.text.secondary} 
          style={styles.pickerIcon} 
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
                  style={styles.industryOption}
                  onPress={() => {
                    setIndustry(item.id);
                    setShowIndustryModal(false);
                  }}
                >
                  <Ionicons name={item.icon} size={24} color={colors.primary} style={styles.industryOptionIcon} />
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
    </View>
  );
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="storefront" size={80} color={colors.primary} />
          </View>
          <Text style={styles.title}>Registra tu Negocio</Text>
          <Text style={styles.subtitle}>Crea una cuenta para gestionar tu inventario y ventas</Text>
        </View>
        
        <View style={styles.form}>
          {/* Correo Electrónico */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo Electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          {/* Contraseña */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color={colors.text.secondary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Confirmar Contraseña */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar Contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color={colors.text.secondary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Nombre del Negocio */}
          <View style={styles.inputContainer}>
            <Ionicons name="storefront-outline" size={22} color={colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre del Negocio"
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>
          
          {/* Tipo de Industria */}
          {renderIndustrySelector()}
          
          {/* Botón de Registro */}
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.registerButtonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>
          
          {/* Enlace para iniciar sesión */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>¿Ya tienes una cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 15,
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
  eyeIcon: {
    padding: 10,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
    marginLeft: 5,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    height: 55,
  },
  pickerIcon: {
    marginRight: 10,
  },
  picker: {
    flex: 1,
    height: 50,
    color: colors.text.primary,
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: colors.text.secondary,
    marginRight: 5,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 15,
  },
  industrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  industrySelectorText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignSelf: 'center',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
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
}); 