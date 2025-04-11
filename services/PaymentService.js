import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { SUBSCRIPTION_PLANS } from '../constants/plans';

// Constantes para almacenamiento local
const SUBSCRIPTION_KEY = '@subscription_info';

// Credenciales de Mercado Pago para pruebas (solo para desarrollo)
const MP_PUBLIC_KEY = 'TEST-0a99d5a6-92b7-4940-8173-c98a9683a848';
const MP_ACCESS_TOKEN = 'TEST-7878626425925742-041017-2bae189dde108d47b19609cdc94a038f-721448179';

// URL de la API de Mercado Pago
const MP_API_URL = 'https://api.mercadopago.com/checkout';

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
    
    // Crear la preferencia directamente usando la API de Mercado Pago
    const preferenceData = {
      items: [
        {
          id: planId,
          title: `Plan ${planName}`,
          description: `Suscripción al plan ${planName}`,
          quantity: 1,
          currency_id: 'ARS', // Moneda Argentina, cambia según tu país
          unit_price: parseFloat(price)
        }
      ],
      payer: {
        email: userEmail,
        name: userName || 'Usuario'
      },
      external_reference: userId, // Referencia para identificar al usuario
      back_urls: {
        success: Platform.OS === 'ios' 
          ? "https://qrcodescanner.app.link/payment/success" 
          : "qrcodescanner://payment/success",
        failure: Platform.OS === 'ios' 
          ? "https://qrcodescanner.app.link/payment/failure" 
          : "qrcodescanner://payment/failure",
        pending: Platform.OS === 'ios' 
          ? "https://qrcodescanner.app.link/payment/pending" 
          : "qrcodescanner://payment/pending"
      },
      auto_return: "approved",
      statement_descriptor: "QR CODE SCANNER"
    };
    
    // Llamar directamente a la API de Mercado Pago
    const response = await fetch(`${MP_API_URL}/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en respuesta de Mercado Pago:', errorText);
      throw new Error(`Error al crear preferencia: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Preferencia creada:', result.id);
    
    // Guardar la información de la transacción para referencia futura
    const transactionInfo = {
      preferenceId: result.id,
      planId,
      planName,
      price,
      userId,
      timestamp: new Date().toISOString()
    };
    
    // Guardar en AsyncStorage para poder recuperarlo después
    await AsyncStorage.setItem('@last_transaction', JSON.stringify(transactionInfo));
    
    return {
      preferenceId: result.id,
      checkoutUrl: result.init_point, // Usar init_point para producción
      sandboxUrl: result.sandbox_init_point, // Usar sandbox_init_point para pruebas
      success: true
    };
  } catch (error) {
    console.error('Error al crear preferencia de pago:', error);
    throw error;
  }
};

// Función para guardar la información de suscripción localmente
export const saveSubscriptionInfo = async (subscriptionInfo) => {
  try {
    await AsyncStorage.setItem('userSubscription', JSON.stringify(subscriptionInfo));
    return true;
  } catch (error) {
    console.error('Error al guardar información de suscripción:', error);
    return false;
  }
};

// Función para obtener la información de suscripción guardada localmente
export const getSubscriptionInfo = async () => {
  try {
    const subscriptionData = await AsyncStorage.getItem('userSubscription');
    return subscriptionData ? JSON.parse(subscriptionData) : null;
  } catch (error) {
    console.error('Error al obtener información de suscripción:', error);
    return null;
  }
};

// Función para verificar si el usuario tiene una suscripción activa
export const hasActiveSubscription = async () => {
  try {
    const subscription = await getSubscriptionInfo();
    
    if (!subscription) return false;
    
    // Verificar si la suscripción ha expirado
    const expirationDate = new Date(subscription.expirationDate);
    const now = new Date();
    
    return subscription.status === 'active' && expirationDate > now;
  } catch (error) {
    console.error('Error al verificar suscripción activa:', error);
    return false;
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
    
    // Si el usuario no existe, crear un documento básico para él
    if (!userDoc.exists()) {
      console.log('No se encontró documento de usuario, creando uno nuevo');
      
      try {
        // Obtener información básica del usuario desde auth
        const user = auth.currentUser;
        const userEmail = user ? user.email : 'usuario@ejemplo.com';
        const userName = user ? (user.displayName || 'Usuario') : 'Usuario';
        
        // Crear un documento básico para el usuario
        await setDoc(userRef, {
          name: userName,
          email: userEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          industry: 'general', // Valor predeterminado
        });
        
        console.log('Documento de usuario creado exitosamente');
      } catch (createError) {
        console.error('Error al crear documento de usuario:', createError);
        // Continuar con la actualización del plan a pesar del error
      }
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
      expirationDate: expirationDate || null, 
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
    console.log(`Verificando pago ID: ${paymentId}`);
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al verificar pago: ${response.status}`);
    }
    
    const paymentData = await response.json();
    console.log('Datos del pago:', JSON.stringify(paymentData));
    
    // Verificar el estado del pago
    const status = paymentData.status;
    
    // Determinar si el pago fue exitoso
    let success = false;
    let message = '';
    
    switch (status) {
      case 'approved':
        success = true;
        message = 'Pago aprobado';
        break;
      case 'pending':
        success = false;
        message = 'Pago pendiente de aprobación';
        break;
      case 'in_process':
        success = false;
        message = 'Pago en proceso';
        break;
      case 'rejected':
        success = false;
        message = 'Pago rechazado';
        break;
      default:
        success = false;
        message = `Estado desconocido: ${status}`;
    }
    
    return {
      success,
      status,
      message,
      paymentData
    };
  } catch (error) {
    console.error('Error al verificar pago:', error);
    return {
      success: false,
      status: 'error',
      message: error.message || 'Error al verificar el pago'
    };
  }
};

/**
 * Obtiene un mensaje descriptivo según el estado del pago
 * @param {string} status - Estado del pago
 * @returns {string} - Mensaje descriptivo
 */
const getPaymentStatusMessage = (status) => {
  const messages = {
    approved: 'Pago aprobado',
    pending: 'Pago pendiente de aprobación',
    in_process: 'Pago en proceso',
    rejected: 'Pago rechazado',
    cancelled: 'Pago cancelado',
    refunded: 'Pago reembolsado',
    charged_back: 'Pago contracargado'
  };
  
  return messages[status] || 'Estado desconocido';
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

/**
 * Función para actualizar directamente a plan premium sin proceso de pago
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
export const upgradeDirectlyToPremium = async (userId) => {
  try {
    console.log(`Actualizando directamente a premium para usuario: ${userId}`);
    
    if (!userId) {
      console.error('ID de usuario no proporcionado');
      throw new Error('ID de usuario no proporcionado');
    }
    
    // Verificar si el usuario existe
    const userRef = doc(db, 'businessInfo', userId);
    const userDoc = await getDoc(userRef);
    
    // Si el usuario no existe, crear un documento básico para él
    if (!userDoc.exists()) {
      console.log('No se encontró documento de usuario, creando uno nuevo');
      
      try {
        // Obtener información básica del usuario desde auth
        const user = auth.currentUser;
        const userEmail = user ? user.email : 'usuario@ejemplo.com';
        const userName = user ? (user.displayName || 'Usuario') : 'Usuario';
        
        // Crear un documento básico para el usuario
        await setDoc(userRef, {
          name: userName,
          email: userEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          industry: 'general', // Valor predeterminado
        });
        
        console.log('Documento de usuario creado exitosamente');
      } catch (createError) {
        console.error('Error al crear documento de usuario:', createError);
        // Continuar con la actualización del plan a pesar del error
      }
    }
    
    // Buscar el plan premium
    const premiumPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'premium');
    if (!premiumPlan) {
      console.error('Plan premium no encontrado');
      throw new Error('Plan premium no encontrado');
    }
    
    // Calcular fecha de expiración (1 año desde ahora)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    
    // Crear o actualizar la información de suscripción
    const subscriptionData = {
      planId: 'premium',
      planName: premiumPlan.name,
      productLimit: premiumPlan.productLimit,
      startDate: serverTimestamp(),
      expirationDate: expirationDate, 
      status: 'active',
      updatedAt: serverTimestamp(),
      activationMethod: 'direct_upgrade'
    };
    
    console.log('Datos de suscripción a guardar:', JSON.stringify(subscriptionData));
    
    // Actualizar en Firestore
    await updateDoc(userRef, {
      subscription: subscriptionData
    });
    
    // Guardar información de la suscripción localmente para acceso rápido
    const subscriptionInfo = {
      planId: 'premium',
      planName: premiumPlan.name,
      startDate: new Date().toISOString(),
      expirationDate: expirationDate.toISOString(),
      status: 'active'
    };
    
    // Usar el servicio para guardar localmente
    await saveSubscriptionInfo(subscriptionInfo);
    
    console.log('Plan actualizado exitosamente a premium');
    return true;
  } catch (error) {
    console.error('Error al actualizar a premium:', error);
    return false;
  }
};
