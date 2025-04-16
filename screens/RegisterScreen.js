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
  Modal,
  StatusBar
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getCustomFieldsForIndustry } from '../utils/categoryUtils';

// Lista de industrias disponibles
const INDUSTRY_TYPES = [
  { id: 'general', name: 'Tienda General', icon: 'storefront-outline' },
  { id: 'grocery', name: 'Supermercado/Almacén', icon: 'cart-outline' },
  { id: 'clothing', name: 'Tienda de Ropa', icon: 'shirt-outline' },
];

// Lista de planes de suscripción
const SUBSCRIPTION_PLANS = [
  { id: 'base', name: 'Plan Básico', price: 0, description: 'Plan básico con características limitadas' },
  { id: 'premium', name: 'Plan Premium', price: 100, description: 'Plan premium con características avanzadas' },
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
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const handleRegister = async () => {
    try {
      // Validaciones
      if (!email || !password || !confirmPassword || !businessName) {
        Alert.alert('Error', 'Por favor completa todos los campos');
        return;
      }
      
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Las contraseñas no coinciden');
        return;
      }

      if (!selectedPlan || !paymentCompleted) {
        Alert.alert('Error', 'Debes seleccionar y pagar un plan para registrarte');
        return;
      }

      setLoading(true);

      // Crear usuario
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualizar perfil
      await updateProfile(user, {
        displayName: businessName
      });

      // Guardar información adicional en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        businessName,
        industry,
        planId: selectedPlan.id,
        createdAt: new Date(),
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      });

      setLoading(false);
      navigation.replace('Main');
    } catch (error) {
      setLoading(false);
      console.error('Error al registrar:', error);
      Alert.alert('Error', 'Hubo un error al crear la cuenta. Por favor intenta nuevamente.');
    }
  };

  const handlePlanSelection = async (plan) => {
    try {
      setLoading(true);
      setSelectedPlan(plan);
      
      // Crear preferencia de pago
      const preference = await createMercadoPagoPreference(
        plan.id,
        plan.name,
        plan.price,
        'pending' // userId pendiente hasta que se complete el registro
      );

      // Redirigir a la pantalla de pago
      navigation.navigate('Payment', {
        preference,
        onPaymentComplete: () => {
          setPaymentCompleted(true);
          Alert.alert('¡Éxito!', 'Pago completado. Ahora puedes completar tu registro.');
        }
      });
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error('Error al seleccionar plan:', error);
      Alert.alert('Error', 'No se pudo procesar la selección del plan. Por favor intenta nuevamente.');
    }
  };

  const getIndustryIcon = (industryId) => {
    const industry = INDUSTRY_TYPES.find(item => item.id === industryId);
    return industry ? industry.icon : 'storefront-outline';
  };

  const renderIndustrySelector = () => (
    <View style={styles.inputContainer}>
      <Ionicons name={getIndustryIcon(industry)} size={20} color="#666" style={styles.inputIcon} />
      <TouchableOpacity 
        style={styles.industrySelector}
        onPress={() => setShowIndustryModal(true)}
      >
        <Text style={styles.industrySelectorText}>
          {INDUSTRY_TYPES.find(item => item.id === industry)?.name || 'Seleccionar tipo de negocio'}
        </Text>
      </TouchableOpacity>
      <Ionicons name="chevron-down" size={20} color="#666" />
      
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
      <StatusBar barStyle="dark-content" />
      
      <View style={[styles.background, { backgroundColor: '#28a745' }]} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Ifsin Negocios</Text>
          <Text style={styles.tagline}>Crea tu cuenta para gestionar tu inventario</Text>
        </View>
        
        <View style={styles.formContainer}>
          {/* Correo Electrónico */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo Electrónico"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          {/* Contraseña */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          
          {/* Confirmar Contraseña */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar Contraseña"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity 
              style={styles.passwordToggle}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          
          {/* Nombre del Negocio */}
          <View style={styles.inputContainer}>
            <Ionicons name="storefront-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre del Negocio"
              placeholderTextColor="#999"
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>
          
          {/* Tipo de Industria */}
          {renderIndustrySelector()}
          
          {/* Selección de plan */}
          <View style={styles.planSection}>
            <Text style={styles.sectionTitle}>Selecciona un Plan</Text>
            <Text style={styles.sectionSubtitle}>Debes elegir un plan para continuar</Text>
            
            {SUBSCRIPTION_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan?.id === plan.id && styles.selectedPlanCard
                ]}
                onPress={() => handlePlanSelection(plan)}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>${plan.price} ARS</Text>
                </View>
                <Text style={styles.planDescription}>{plan.description}</Text>
                {selectedPlan?.id === plan.id && paymentCompleted && (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.paidText}>Pago completado</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Botón de Registro */}
          <TouchableOpacity 
            style={[
              styles.registerButton,
              (!selectedPlan || !paymentCompleted) && styles.disabledButton
            ]}
            onPress={handleRegister}
            disabled={loading || !selectedPlan || !paymentCompleted}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.registerButtonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes una cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 16,
  },
  passwordToggle: {
    padding: 10,
  },
  industrySelector: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
  },
  industrySelectorText: {
    fontSize: 16,
    color: '#333',
  },
  planSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedPlanCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  paidText: {
    marginLeft: 5,
    color: colors.success,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  footerText: {
    color: 'white',
    fontSize: 14,
    marginRight: 5,
  },
  loginLink: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 15,
    textAlign: 'center',
  },
  industryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  industryOptionIcon: {
    marginRight: 15,
  },
  industryOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});