import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { SUBSCRIPTION_PLANS } from '../constants/plans';
import { 
  MP_PUBLIC_KEY, 
  MP_ACCESS_TOKEN, 
  MP_API_URL, 
  MP_CHECKOUT_URL,
  MP_WEBHOOK_URL 
} from '../config/mercadopago';

// Constantes para almacenamiento local
const SUBSCRIPTION_KEY = '@subscription_info';

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
    // Verificar si el plan existe
    const planDetails = SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
    if (!planDetails) {
      throw new Error('Plan no encontrado');
    }
    
    // Obtener información del usuario
    let userEmail = 'usuario@ejemplo.com';
    let userName = 'Usuario';
    
    if (auth && auth.currentUser) {
      userEmail = auth.currentUser.email || userEmail;
      userName = auth.currentUser.displayName || userName;
    }
    
    // Crear la preferencia
    const preferenceData = {
      items: [
        {
          id: planId,
          title: `Plan ${planName}`,
          description: `Suscripción al plan ${planName}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: parseFloat(price)
        }
      ],
      payer: {
        email: userEmail,
        name: userName
      },
      external_reference: userId,
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
      statement_descriptor: "QR CODE SCANNER",
      notification_url: MP_WEBHOOK_URL
    };
    
    // Llamar a la API de Mercado Pago
    const response = await fetch(`${MP_API_URL}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al crear preferencia de pago');
    }
    
    const result = await response.json();
    
    // Guardar información de la transacción
    const transactionInfo = {
      preferenceId: result.id,
      planId,
      planName,
      price,
      userId,
      timestamp: new Date().toISOString()
    };
    
    await AsyncStorage.setItem('@last_transaction', JSON.stringify(transactionInfo));
    
    return {
      preferenceId: result.id,
      checkoutUrl: result.init_point,
      sandboxUrl: result.sandbox_init_point,
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
    // Verificar si el usuario ya tiene un plan activo
    const currentStatus = await checkSubscriptionStatus(userId);
    if (currentStatus.active && currentStatus.planId === planId) {
      throw new Error('No puedes seleccionar el mismo plan que ya tienes activo');
    }
    
    // Verificar si el plan existe
    const planDetails = SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
    if (!planDetails) {
      throw new Error('Plan no encontrado');
    }
    
    // Calcular fecha de próximo pago (1 mes desde ahora)
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    
    // Crear o actualizar la información de suscripción
    const subscriptionData = {
      planId,
      planName: planDetails.name,
      productLimit: planDetails.productLimit,
      price: planDetails.price,
      startDate: new Date(),
      expirationDate: nextPaymentDate,
      lastPayment: new Date(),
      nextPaymentAmount: planDetails.price,
      status: 'active',
      updatedAt: new Date()
    };
    
    // Actualizar en Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      subscription: subscriptionData
    });
    
    // Guardar localmente
    await saveSubscriptionInfo(subscriptionData);
    
    return {
      success: true,
      nextPaymentDate,
      nextPaymentAmount: planDetails.price
    };
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    throw error;
  }
};

/**
 * Función para verificar el estado de una suscripción
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Estado de la suscripción
 */
export const checkSubscriptionStatus = async (userId) => {
  try {
    // Primero intentar obtener del almacenamiento local
    const localSubscription = await getSubscriptionInfo();
    
    // Verificar en Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return {
        active: false,
        message: 'Usuario no encontrado'
      };
    }

    const userData = userDoc.data();
    const subscription = userData.subscription;

    if (!subscription) {
      return {
        active: false,
        message: 'No tiene suscripción activa'
      };
    }

    // Verificar si la suscripción ha expirado
    const expirationDate = new Date(subscription.expirationDate);
    const now = new Date();

    // Si ha expirado, actualizar el estado
    if (expirationDate < now) {
      await updateDoc(userRef, {
        'subscription.status': 'expired'
      });

      return {
        active: false,
        message: 'Suscripción expirada',
        planId: subscription.planId,
        expirationDate: expirationDate,
        lastPayment: subscription.lastPayment,
        nextPaymentAmount: subscription.price
      };
    }

    return {
      active: true,
      planId: subscription.planId,
      planName: subscription.planName,
      expirationDate: expirationDate,
      lastPayment: subscription.lastPayment,
      nextPaymentAmount: subscription.price,
      nextPaymentDate: expirationDate
    };
  } catch (error) {
    console.error('Error al verificar suscripción:', error);
    throw error;
  }
};

/**
 * Función para cancelar una suscripción
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - Resultado de la operación
 */
export const cancelSubscription = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      'subscription.status': 'cancelled',
      'subscription.cancelledAt': serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    throw error;
  }
};

/**
 * Función para renovar una suscripción
 * @param {string} userId - ID del usuario
 * @param {string} planId - ID del plan
 * @returns {Promise<Object>} - Información de la preferencia de pago
 */
export const renewSubscription = async (userId, planId) => {
  try {
    // Obtener información del plan
    const planDetails = SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
    if (!planDetails) {
      throw new Error('Plan no encontrado');
    }

    // Crear preferencia de pago para renovación
    const preference = await createMercadoPagoPreference(
      planId,
      planDetails.name,
      planDetails.price,
      userId
    );

    return preference;
  } catch (error) {
    console.error('Error al renovar suscripción:', error);
    throw error;
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
