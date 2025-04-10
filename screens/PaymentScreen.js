import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
  Linking,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/config';
import { 
  createMercadoPagoPreference, 
  updateUserPlan, 
  verifyPayment,
  getMercadoPagoAppUrl
} from '../services/PaymentService';
import { colors } from '../theme/colors';

export default function PaymentScreen({ navigation, route }) {
  const { planId, planName, price, userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [preferenceId, setPreferenceId] = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    createPaymentPreference();
  }, []);

  const createPaymentPreference = async () => {
    try {
      setLoading(true);
      
      // Crear preferencia de pago usando el servicio
      const preference = await createMercadoPagoPreference(planId, planName, price, userId);
      
      // Guardar el ID de preferencia para verificación posterior
      setPreferenceId(preference.preferenceId);
      
      // Establecer la URL de pago
      setPaymentUrl(preference.checkoutUrl);
      
      setLoading(false);
    } catch (error) {
      console.error('Error al crear preferencia de pago:', error);
      Alert.alert('Error', 'No se pudo iniciar el proceso de pago. Intente nuevamente.');
      navigation.goBack();
    }
  };

  const handleNavigationStateChange = (navState) => {
    // Detectar redirecciones de éxito o fracaso
    const url = navState.url.toLowerCase();
    
    if (url.includes('success') && !paymentProcessing) {
      // Extraer el ID de pago de la URL si está disponible
      const paymentId = extractPaymentId(url);
      handlePaymentSuccess(paymentId);
    } else if (url.includes('failure') && !paymentProcessing) {
      handlePaymentFailure('El pago fue rechazado');
    } else if (url.includes('pending') && !paymentProcessing) {
      handlePaymentFailure('El pago está pendiente de aprobación');
    }
  };

  // Función para extraer el ID de pago de la URL de retorno
  const extractPaymentId = (url) => {
    try {
      // Intentar extraer payment_id de la URL
      const paymentIdMatch = url.match(/payment_id=([^&]+)/);
      return paymentIdMatch ? paymentIdMatch[1] : 'unknown';
    } catch (error) {
      console.error('Error al extraer payment_id:', error);
      return 'unknown';
    }
  };

  const handlePaymentSuccess = async (paymentId) => {
    try {
      if (paymentProcessing) return; // Evitar procesamiento duplicado
      
      setPaymentProcessing(true);
      
      // Verificar el pago usando el servicio
      console.log(`Verificando pago: ${paymentId}, preferenceId: ${preferenceId}`);
      const paymentResult = await verifyPayment(paymentId, preferenceId);
      console.log('Resultado de verificación:', JSON.stringify(paymentResult));
      
      // Calcular fecha de expiración (1 mes desde ahora)
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);
      
      // Actualizar el plan del usuario en Firestore
      console.log(`Actualizando plan: ${planId} para usuario: ${userId}`);
      const updated = await updateUserPlan(userId, planId, expirationDate);
      console.log('Resultado de actualización:', updated);
      
      if (updated) {
        Alert.alert(
          '¡Pago Exitoso!',
          `Tu suscripción al plan ${planName} ha sido activada correctamente.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navegar al Dashboard
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          'El pago fue procesado, pero no pudimos actualizar tu suscripción. Por favor, contacta a soporte.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error al procesar pago exitoso:', error);
      handlePaymentFailure('Ocurrió un error al procesar el pago');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePaymentFailure = (message = 'El pago no pudo ser procesado') => {
    if (paymentProcessing) return; // Evitar procesamiento duplicado
    
    setPaymentProcessing(true);
    
    Alert.alert(
      'Pago no completado',
      message,
      [
        {
          text: 'Intentar nuevamente',
          onPress: () => {
            setPaymentProcessing(false);
            createPaymentPreference();
          },
        },
        {
          text: 'Cancelar',
          onPress: () => navigation.goBack(),
          style: 'cancel',
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          Alert.alert(
            'Cancelar pago',
            '¿Estás seguro que deseas cancelar el proceso de pago?',
            [
              {
                text: 'No, continuar',
                style: 'cancel',
              },
              {
                text: 'Sí, cancelar',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Pago Seguro</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Preparando el pago...</Text>
    </View>
  );

  // Overlay de procesamiento de pago
  const renderProcessingOverlay = () => {
    if (!paymentProcessing) return null;
    
    return (
      <View style={styles.processingOverlay}>
        <View style={styles.processingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>Procesando tu pago</Text>
          <Text style={styles.processingSubtext}>Por favor, espera mientras verificamos tu transacción...</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      {renderHeader()}
      
      {loading ? (
        renderLoading()
      ) : (
        <View style={styles.contentContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: paymentUrl }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          />
          
          {/* Botón para simular un pago exitoso (solo en desarrollo) */}
          {__DEV__ && (
            <View style={styles.devButtonsContainer}>
              <Text style={styles.devTitle}>Opciones de prueba:</Text>
              <TouchableOpacity 
                style={styles.devButton}
                onPress={() => handlePaymentSuccess(`test_payment_${Date.now()}`)}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.devButtonText}>Simular Pago Exitoso</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.devButton, styles.devButtonFail]}
                onPress={() => handlePaymentFailure('Pago rechazado (simulación)')}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.devButtonText}>Simular Pago Rechazado</Text>
              </TouchableOpacity>
              
              <Text style={styles.devNote}>
                Para pruebas reales con Mercado Pago, usa estas tarjetas:
              </Text>
              <Text style={styles.devCardInfo}>
                • Aprobado: 5031 7557 3453 0604 (Nombre: APRO)
              </Text>
              <Text style={styles.devCardInfo}>
                • Rechazado: 5031 7557 3453 0604 (Nombre: OTHE)
              </Text>
              <Text style={styles.devCardInfo}>
                • Cualquier CVV y fecha futura
              </Text>
            </View>
          )}
          
          {/* Overlay de procesamiento */}
          {renderProcessingOverlay()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  contentContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#555',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  processingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  devButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  devTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  devButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonFail: {
    backgroundColor: '#dc3545',
  },
  devButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  devNote: {
    color: '#ddd',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 5,
  },
  devCardInfo: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 3,
  },
});
