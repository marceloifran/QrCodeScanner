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
  Platform,
  TextInput
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/config';
import { 
  createMercadoPagoPreference, 
  updateUserPlan, 
  verifyPayment,
  getMercadoPagoAppUrl,
  saveSubscriptionInfo
} from '../services/PaymentService';
import { colors } from '../theme/colors';

export default function PaymentScreen({ navigation, route }) {
  const { planId, planName, price, userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [preferenceId, setPreferenceId] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [manualPaymentId, setManualPaymentId] = useState('');
  const [showManualVerification, setShowManualVerification] = useState(false);

  useEffect(() => {
    createPaymentPreference();
    
    // Configurar el listener para las URLs de retorno
    const handleDeepLink = async (event) => {
      let url = event?.url || '';
      if (!url) return;
      
      console.log('Deep link recibido:', url);
      
      // Manejar diferentes formatos de URL (deep link directo y URL universal)
      if (url.includes('success') || url.includes('payment/success')) {
        const paymentId = extractPaymentId(url);
        handlePaymentSuccess(paymentId);
      } else if (url.includes('failure') || url.includes('payment/failure')) {
        handlePaymentFailure('El pago fue rechazado');
      } else if (url.includes('pending') || url.includes('payment/pending')) {
        handlePaymentFailure('El pago está pendiente de aprobación');
      }
    };
    
    // Usar la API moderna de Linking (addListener en lugar de addEventListener)
    const subscription = Linking.addListener('url', handleDeepLink);
    
    // Verificar si la app fue abierta con un deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    return () => {
      // Limpiar el listener al desmontar usando la API moderna
      subscription.remove();
    };
  }, []);

  const createPaymentPreference = async () => {
    try {
      setLoading(true);
      
      // Crear preferencia de pago usando el servicio
      const preference = await createMercadoPagoPreference(planId, planName, price, userId);
      
      // Guardar el ID de preferencia para verificación posterior
      setPreferenceId(preference.preferenceId);
      
      // Establecer la URL de pago (usar init_point para producción)
      setPaymentUrl(preference.checkoutUrl);
      
      setLoading(false);
      
      // Abrir el navegador externo con la URL de pago
      openPaymentBrowser(preference.checkoutUrl);
    } catch (error) {
      console.error('Error al crear preferencia de pago:', error);
      Alert.alert('Error', 'No se pudo iniciar el proceso de pago. Intente nuevamente.');
      navigation.goBack();
    }
  };
  
  const openPaymentBrowser = async (url) => {
    try {
      // Usar Chrome Custom Tabs o Safari View Controller
      const result = await WebBrowser.openBrowserAsync(url);
      console.log('Resultado del navegador:', result);
      
      // Verificar el resultado
      if (result.type === 'dismiss') {
        // El usuario cerró el navegador sin completar el pago
        Alert.alert(
          'Pago no completado',
          '¿Desea intentar nuevamente o cancelar el proceso?',
          [
            {
              text: 'Intentar nuevamente',
              onPress: () => openPaymentBrowser(paymentUrl),
            },
            {
              text: 'Cancelar',
              onPress: () => navigation.goBack(),
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error al abrir el navegador:', error);
      Alert.alert('Error', 'No se pudo abrir el navegador de pago. Intente nuevamente.');
    }
  };

  // Función para extraer el ID de pago de la URL de retorno
  const extractPaymentId = (url) => {
    try {
      console.log('Extrayendo payment_id de URL:', url);
      
      // Intentar extraer payment_id de la URL usando diferentes patrones
      // Patrón 1: payment_id como parámetro de consulta
      const paymentIdMatch = url.match(/payment_id=([^&]+)/);
      if (paymentIdMatch && paymentIdMatch[1]) {
        console.log('Payment ID encontrado (patrón 1):', paymentIdMatch[1]);
        return paymentIdMatch[1];
      }
      
      // Patrón 2: collection_id como parámetro de consulta (alternativo en Mercado Pago)
      const collectionIdMatch = url.match(/collection_id=([^&]+)/);
      if (collectionIdMatch && collectionIdMatch[1]) {
        console.log('Collection ID encontrado (patrón 2):', collectionIdMatch[1]);
        return collectionIdMatch[1];
      }
      
      // Patrón 3: buscar en los parámetros de la URL usando URLSearchParams
      if (url.includes('?')) {
        const urlParts = url.split('?');
        const queryString = urlParts[1];
        const urlParams = new URLSearchParams(queryString);
        
        // Intentar obtener payment_id
        const paymentId = urlParams.get('payment_id');
        if (paymentId) {
          console.log('Payment ID encontrado (patrón 3):', paymentId);
          return paymentId;
        }
        
        // Intentar obtener collection_id como alternativa
        const collectionId = urlParams.get('collection_id');
        if (collectionId) {
          console.log('Collection ID encontrado (patrón 3):', collectionId);
          return collectionId;
        }
        
        // Intentar obtener cualquier ID que pueda ser relevante
        const externalReference = urlParams.get('external_reference');
        if (externalReference) {
          console.log('External reference encontrado:', externalReference);
          return externalReference;
        }
      }
      
      console.warn('No se pudo extraer payment_id de la URL');
      return 'unknown';
    } catch (error) {
      console.error('Error al extraer payment_id:', error);
      return 'unknown';
    }
  };

  const handlePaymentSuccess = async (paymentId) => {
    try {
      if (paymentProcessing) return; // Evitar procesamiento duplicado
      
      setPaymentProcessing(true);
      
      // Mostrar indicador de carga
      Alert.alert(
        'Procesando pago',
        'Estamos verificando tu pago, por favor espera un momento...'
      );
      
      // Verificar el pago usando el servicio
      console.log(`Verificando pago: ${paymentId}, preferenceId: ${preferenceId}`);
      const paymentResult = await verifyPayment(paymentId, preferenceId);
      console.log('Resultado de verificación:', JSON.stringify(paymentResult));
      
      // Verificar si el pago fue aprobado
      if (!paymentResult.success) {
        // El pago no fue aprobado
        let errorMessage = 'El pago no pudo ser procesado.';
        
        // Personalizar mensaje según el estado
        switch (paymentResult.status) {
          case 'rejected':
            errorMessage = 'El pago fue rechazado. Por favor, intenta con otro método de pago.';
            break;
          case 'pending':
            errorMessage = 'El pago está pendiente de aprobación. Te notificaremos cuando se complete.';
            break;
          case 'in_process':
            errorMessage = 'El pago está siendo procesado. Te notificaremos cuando se complete.';
            break;
          default:
            errorMessage = `Error en el pago: ${paymentResult.message || 'Desconocido'}`;
        }
        
        Alert.alert(
          'Pago no completado',
          errorMessage,
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
        
        setPaymentProcessing(false);
        return;
      }
      
      // Si llegamos aquí, el pago fue aprobado
      // Calcular fecha de expiración (1 mes desde ahora)
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);
      
      // Actualizar el plan del usuario en Firestore
      console.log(`Actualizando plan: ${planId} para usuario: ${userId}`);
      
      try {
        const updated = await updateUserPlan(userId, planId, expirationDate);
        console.log('Resultado de actualización:', updated);
        
        if (updated) {
          // Guardar información de la suscripción localmente para acceso rápido
          const subscriptionInfo = {
            planId,
            planName,
            startDate: new Date().toISOString(),
            expirationDate: expirationDate.toISOString(),
            paymentId,
            status: 'active'
          };
          
          // Usar el servicio para guardar localmente
          await saveSubscriptionInfo(subscriptionInfo);
          
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
          throw new Error('No se pudo actualizar la suscripción');
        }
      } catch (updateError) {
        console.error('Error al actualizar plan:', updateError);
        
        // Aunque el pago fue exitoso, no se pudo actualizar el plan
        Alert.alert(
          'Error en la actualización',
          'El pago fue procesado correctamente, pero no pudimos actualizar tu suscripción. Por favor, contacta a soporte con este ID de pago: ' + paymentId,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error al procesar pago:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al procesar el pago. Por favor, intenta nuevamente más tarde.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
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

  const verifyManualPayment = async () => {
    if (!manualPaymentId || manualPaymentId.trim() === '') {
      Alert.alert('Error', 'Por favor ingresa un ID de pago válido');
      return;
    }
    
    try {
      setPaymentProcessing(true);
      
      // Mostrar indicador de carga
      Alert.alert(
        'Procesando pago',
        'Estamos verificando tu pago, por favor espera un momento...'
      );
      
      // Verificar el pago usando el servicio
      console.log(`Verificando pago manual: ${manualPaymentId}, preferenceId: ${preferenceId}`);
      const paymentResult = await verifyPayment(manualPaymentId, preferenceId);
      console.log('Resultado de verificación manual:', JSON.stringify(paymentResult));
      
      // Procesar el resultado igual que en handlePaymentSuccess
      if (paymentResult.success) {
        // Si llegamos aquí, el pago fue aprobado
        // Calcular fecha de expiración (1 mes desde ahora)
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        
        // Actualizar el plan del usuario en Firestore
        console.log(`Actualizando plan: ${planId} para usuario: ${userId}`);
        
        try {
          const updated = await updateUserPlan(userId, planId, expirationDate);
          console.log('Resultado de actualización:', updated);
          
          if (updated) {
            // Guardar información de la suscripción localmente para acceso rápido
            const subscriptionInfo = {
              planId,
              planName,
              startDate: new Date().toISOString(),
              expirationDate: expirationDate.toISOString(),
              paymentId: manualPaymentId,
              status: 'active'
            };
            
            // Usar el servicio para guardar localmente
            await saveSubscriptionInfo(subscriptionInfo);
            
            Alert.alert(
              '¡Pago Verificado Exitosamente!',
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
            throw new Error('No se pudo actualizar la suscripción');
          }
        } catch (updateError) {
          console.error('Error al actualizar plan:', updateError);
          
          Alert.alert(
            'Error en la actualización',
            'El pago fue verificado correctamente, pero no pudimos actualizar tu suscripción. Por favor, contacta a soporte con este ID de pago: ' + manualPaymentId
          );
        }
      } else {
        // El pago no fue aprobado
        let errorMessage = 'El pago no pudo ser verificado.';
        
        // Personalizar mensaje según el estado
        switch (paymentResult.status) {
          case 'rejected':
            errorMessage = 'El pago fue rechazado. Por favor, intenta con otro método de pago.';
            break;
          case 'pending':
            errorMessage = 'El pago está pendiente de aprobación. Te notificaremos cuando se complete.';
            break;
          case 'in_process':
            errorMessage = 'El pago está siendo procesado. Te notificaremos cuando se complete.';
            break;
          default:
            errorMessage = `Error en el pago: ${paymentResult.message || 'Desconocido'}`;
        }
        
        Alert.alert('Verificación fallida', errorMessage);
      }
    } catch (error) {
      console.error('Error al verificar pago manual:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al verificar el pago. Por favor, intenta nuevamente más tarde.'
      );
    } finally {
      setPaymentProcessing(false);
    }
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

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>Resumen de compra</Text>
      
      <View style={styles.planCard}>
        <Text style={styles.planName}>{planName}</Text>
        <Text style={styles.planPrice}>$ {price}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.payButton}
        onPress={() => openPaymentBrowser(paymentUrl)}
      >
        <Text style={styles.payButtonText}>Realizar Pago</Text>
      </TouchableOpacity>
      
      <Text style={styles.securityText}>
        Todos los pagos son procesados de forma segura por Mercado Pago
      </Text>
      
      {__DEV__ && (
        <View style={styles.testCardsContainer}>
          <Text style={styles.testCardsTitle}>Tarjetas para pruebas:</Text>
          <View style={styles.testCardItem}>
            <Text style={styles.testCardLabel}>Mastercard:</Text>
            <Text style={styles.testCardNumber}>5031 7557 3453 0604</Text>
          </View>
          <View style={styles.testCardItem}>
            <Text style={styles.testCardLabel}>Visa:</Text>
            <Text style={styles.testCardNumber}>4509 9535 6623 3704</Text>
          </View>
          <View style={styles.testCardItem}>
            <Text style={styles.testCardLabel}>American Express:</Text>
            <Text style={styles.testCardNumber}>3711 803052 57522</Text>
          </View>
          <Text style={styles.testCardNote}>Código: 123 o 1234 | Fecha: 11/30</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.testCardLabel}>Datos del titular:</Text>
          <View style={styles.testCardItem}>
            <Text style={styles.testCardLabel}>Nombre:</Text>
            <Text style={styles.testCardNumber}>APRO (aprobado) o OTHE (rechazado)</Text>
          </View>
          <View style={styles.testCardItem}>
            <Text style={styles.testCardLabel}>DNI:</Text>
            <Text style={styles.testCardNumber}>12345678</Text>
          </View>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.manualVerificationButton}
        onPress={() => setShowManualVerification(true)}
      >
        <Text style={styles.manualVerificationButtonText}>Verificar pago manualmente</Text>
      </TouchableOpacity>
      
      {showManualVerification && (
        <View style={styles.manualVerificationContainer}>
          <Text style={styles.manualVerificationTitle}>Ingrese el ID de pago:</Text>
          <TextInput
            style={styles.manualVerificationInput}
            value={manualPaymentId}
            onChangeText={(text) => setManualPaymentId(text)}
            placeholder="Ingrese el ID de pago"
          />
          <TouchableOpacity
            style={styles.manualVerificationVerifyButton}
            onPress={verifyManualPayment}
          >
            <Text style={styles.manualVerificationVerifyButtonText}>Verificar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      {loading ? renderLoading() : renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  planCard: {
    backgroundColor: '#f7f7f7',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  planName: {
    fontSize: 18,
    color: '#333',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 16,
    color: '#666',
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  testCardsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  testCardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  testCardItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  testCardLabel: {
    fontSize: 14,
    color: '#555',
    width: 120,
  },
  testCardNumber: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  testCardNote: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#555',
  },
  manualVerificationButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualVerificationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  manualVerificationContainer: {
    padding: 20,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    marginBottom: 20,
  },
  manualVerificationTitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  manualVerificationInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  manualVerificationVerifyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualVerificationVerifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});
