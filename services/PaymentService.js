import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { SUBSCRIPTION_PLANS } from '../constants/plans';

// Constantes para almacenamiento local
const SUBSCRIPTION_KEY = '@subscription_info';

// URL de Firebase Functions (reemplazar con la URL real en producción)
const FIREBASE_FUNCTIONS_URL = 'https://us-central1-qrcodescanner-12345.cloudfunctions.net';

// URL para pruebas de Mercado Pago
const MP_CHECKOUT_URL = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=241561424-d0f7a9b5-f383-4df5-a30a-1af06761720a';

/**
 * Función para crear una preferencia de pago con Mercado Pago
 * @param {string} planId - ID del plan
 * @param {string} planName - Nombre del plan
 * @param {number} price - Precio del plan
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Objeto con la información de la preferencia
 */
export const createMercadoPagoPreference = async (planId, planName, price, userId) => {
  try {
    console.log(`Creando preferencia para plan: ${planId}, precio: ${price}`);
    
    // Verificar si el plan existe
    const planDetails = SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
    if (!planDetails) {
      console.error('Plan no encontrado:', planId);
      throw new Error('Plan no encontrado');
    }
    
    // Obtener información del usuario si está disponible
    let userEmail = 'usuario@ejemplo.com';
    let userName = 'Usuario';
    
    try {
      if (auth && auth.currentUser) {
        userEmail = auth.currentUser.email || userEmail;
        userName = auth.currentUser.displayName || userName;
      }
    } catch (authError) {
      console.log('No se pudo obtener información del usuario:', authError);
      // Continuar con los valores predeterminados
    }
    
    // Datos para la preferencia de pago
    const preferenceData = {
      items: [
        {
          id: planId,
          title: `Plan ${planName}`,
          quantity: 1,
          unit_price: parseFloat(price),
          currency_id: 'ARS'
        }
      ],
      payer: {
        email: userEmail,
        name: userName,
        identification: {
          type: 'DNI',
          number: '12345678'
        }
      },
      back_urls: {
        success: 'https://success.com',
        failure: 'https://failure.com',
        pending: 'https://pending.com'
      },
      auto_return: 'approved',
      statement_descriptor: 'QR Code Scanner',
      external_reference: userId
    };
    
    // En modo de desarrollo, simular la creación de preferencia
    if (__DEV__) {
      console.log('Modo desarrollo: Simulando creación de preferencia');
      
      // Generar un ID de preferencia único para pruebas
      const preferenceId = `TEST_PREF_${Date.now()}`;
      
      // Guardar la información de la transacción para referencia futura
      const transactionInfo = {
        preferenceId,
        planId,
        planName,
        price,
        userId,
        timestamp: new Date().toISOString()
      };
      
      // Guardar en AsyncStorage para poder recuperarlo después
      await AsyncStorage.setItem('@last_transaction', JSON.stringify(transactionInfo));
      
      console.log('Preferencia simulada creada:', preferenceId);
      
      // Retornar una URL de checkout simulada (usaremos la sandbox de Mercado Pago)
      return {
        preferenceId,
        checkoutUrl: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=' + preferenceId,
        success: true
      };
    }
    
    // En producción, usar Firebase Functions
    const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/createPreference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData)
    });
    
    if (!response.ok) {
      throw new Error(`Error al crear preferencia: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error al crear preferencia de pago:', error);
    throw error;
  }
};

// Función para guardar la información de suscripción localmente
export const saveSubscriptionInfo = async (subscriptionInfo) => {
  try {
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscriptionInfo));
  } catch (error) {
    console.error('Error al guardar información de suscripción:', error);
  }
};

// Función para obtener la información de suscripción guardada localmente
export const getSubscriptionInfo = async () => {
  try {
    const info = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    return info ? JSON.parse(info) : null;
  } catch (error) {
    console.error('Error al obtener información de suscripción:', error);
    return null;
  }
};

// Función para actualizar el plan del usuario en Firestore
export const updateUserPlan = async (userId, planId, expirationDate) => {
  try {
    console.log(`Actualizando plan: ${planId} para usuario: ${userId}`);
    
    if (!userId) {
      console.error('ID de usuario no proporcionado');
      throw new Error('ID de usuario no proporcionado');
    }
    
    // Verificar si el usuario existe
    const userRef = doc(db, 'businessInfo', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('El usuario no existe en Firestore');
      throw new Error('El usuario no existe');
    }
    
    // Obtener detalles del plan
    const planDetails = SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
    if (!planDetails) {
      console.error('Plan no encontrado:', planId);
      throw new Error('Plan no encontrado');
    }
    
    // Crear o actualizar la información de suscripción
    const subscriptionData = {
      planId,
      planName: planDetails.name,
      productLimit: planDetails.productLimit,
      startDate: serverTimestamp(),
      expirationDate: expirationDate || null, // null para planes sin fecha de expiración
      status: 'active',
      updatedAt: serverTimestamp()
    };
    
    console.log('Datos de suscripción a guardar:', JSON.stringify(subscriptionData));
    
    // Actualizar en Firestore
    await updateDoc(userRef, {
      subscription: {
        planId: planId,
        planName: planDetails.name,
        productLimit: planDetails.productLimit,
        startDate: serverTimestamp(),
        expirationDate: expirationDate || null,
        status: 'active',
        updatedAt: serverTimestamp()
      }
    });
    
    // Verificar que se haya actualizado correctamente
    const updatedDoc = await getDoc(userRef);
    if (!updatedDoc.exists()) {
      throw new Error('No se pudo verificar la actualización');
    }
    
    const updatedData = updatedDoc.data();
    console.log('Datos actualizados:', JSON.stringify(updatedData.subscription || {}));
    
    // Guardar localmente
    await saveSubscriptionInfo({
      ...subscriptionData,
      userId
    });
    
    console.log('Plan actualizado correctamente:', planId);
    return true;
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    
    // Intentar mostrar un mensaje de error amigable
    if (error.code === 'permission-denied') {
      Alert.alert('Error', 'No tienes permisos para realizar esta acción. Por favor, inicia sesión nuevamente.');
    } else {
      Alert.alert('Error', 'No se pudo actualizar tu plan. Por favor, intenta nuevamente más tarde.');
    }
    
    return false;
  }
};

// Función para verificar el estado de la suscripción
export const checkSubscriptionStatus = async (userId) => {
  try {
    // Verificar en Firestore
    const userRef = doc(db, 'businessInfo', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('El usuario no existe en Firestore');
      return { active: false, plan: 'free' };
    }
    
    const userData = userDoc.data();
    
    // Si no tiene suscripción, es plan gratuito
    if (!userData.subscription) {
      return { active: true, plan: 'free' };
    }
    
    const subscription = userData.subscription;
    
    // Verificar si la suscripción está activa
    if (subscription.status !== 'active') {
      return { active: false, plan: 'free' };
    }
    
    // Verificar si la suscripción ha expirado (si tiene fecha de expiración)
    if (subscription.expirationDate) {
      const expirationDate = subscription.expirationDate.toDate();
      if (expirationDate < new Date()) {
        // La suscripción ha expirado, actualizar en Firestore
        await updateDoc(userRef, {
          'subscription.status': 'expired'
        });
        return { active: false, plan: 'free' };
      }
    }
    
    // La suscripción está activa
    return {
      active: true,
      plan: subscription.planId,
      productLimit: subscription.productLimit,
      expirationDate: subscription.expirationDate ? subscription.expirationDate.toDate() : null
    };
  } catch (error) {
    console.error('Error al verificar estado de suscripción:', error);
    return { active: false, plan: 'free' };
  }
};

/**
 * Función para verificar un pago
 * @param {string} paymentId - ID del pago
 * @param {string} preferenceId - ID de la preferencia
 * @returns {Promise<Object>} - Objeto con la información del pago
 */
export const verifyPayment = async (paymentId, preferenceId) => {
  try {
    console.log(`Verificando pago ID: ${paymentId}, Preference ID: ${preferenceId}`);
    
    // En modo de desarrollo, simular una respuesta exitosa
    if (__DEV__) {
      console.log('Modo desarrollo: Simulando verificación exitosa');
      return {
        success: true,
        status: 'approved',
        paymentId: paymentId || `test_${Date.now()}`,
        message: 'Pago aprobado (simulación)'
      };
    }
    
    // En producción, verificar con Firebase Functions
    const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/verifyPayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentId,
        preferenceId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error al verificar pago: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error al verificar pago:', error);
    return {
      success: false,
      status: 'error',
      message: error.message || 'No se pudo verificar el pago'
    };
  }
};

// Función para cancelar una suscripción
export const cancelSubscription = async (userId) => {
  try {
    // Actualizar en Firestore
    const userRef = doc(db, 'businessInfo', userId);
    await updateDoc(userRef, {
      'subscription.status': 'cancelled',
      'subscription.cancelledAt': serverTimestamp()
    });
    
    // Actualizar localmente
    const subscriptionInfo = await getSubscriptionInfo();
    if (subscriptionInfo && subscriptionInfo.userId === userId) {
      subscriptionInfo.status = 'cancelled';
      subscriptionInfo.cancelledAt = new Date().toISOString();
      await saveSubscriptionInfo(subscriptionInfo);
    }
    
    return true;
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    Alert.alert('Error', 'No se pudo cancelar tu suscripción. Por favor, intenta nuevamente más tarde.');
    return false;
  }
};

/**
 * Función para obtener la URL de la app de Mercado Pago según la plataforma
 * @param {string} preferenceId - ID de la preferencia
 * @returns {string} - URL para abrir la app de Mercado Pago
 */
export const getMercadoPagoAppUrl = (preferenceId) => {
  // Para pruebas, retornamos una URL que no abrirá la app
  // así forzamos a usar el WebView
  return `mercadopago://checkout/preferences/${preferenceId}`;
};
