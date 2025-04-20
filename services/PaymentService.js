import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import { SUBSCRIPTION_PLANS } from "../constants/plans";
import {
  MP_PUBLIC_KEY,
  MP_ACCESS_TOKEN,
  MP_API_URL,
  MP_CHECKOUT_URL,
  MP_WEBHOOK_URL,
} from "../config/mercadopago";

// Constantes para almacenamiento local
const SUBSCRIPTION_KEY = "@subscription_info";

/**
 * Función para crear una preferencia de pago con Mercado Pago
 * @param {string} planId - ID del plan
 * @param {string} planName - Nombre del plan
 * @param {number} price - Precio del plan
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Objeto con la información de la preferencia
 */
export const createMercadoPagoPreference = async (
  planId,
  planName,
  price,
  userId
) => {
  try {
    // Verificar si el plan existe
    const planDetails = SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
    if (!planDetails) {
      throw new Error("Plan no encontrado");
    }

    // Obtener información del usuario
    let userEmail = "usuario@ejemplo.com";
    let userName = "Usuario";

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
          currency_id: "ARS",
          unit_price: parseFloat(price),
        },
      ],
      payer: {
        email: userEmail,
        name: userName,
      },
      external_reference: userId,
      back_urls: {
        success:
          Platform.OS === "ios"
            ? "https://qrcodescanner.app.link/payment/success"
            : "qrcodescanner://payment/success",
        failure:
          Platform.OS === "ios"
            ? "https://qrcodescanner.app.link/payment/failure"
            : "qrcodescanner://payment/failure",
        pending:
          Platform.OS === "ios"
            ? "https://qrcodescanner.app.link/payment/pending"
            : "qrcodescanner://payment/pending",
      },
      auto_return: "approved",
      statement_descriptor: "QR CODE SCANNER",
      notification_url: MP_WEBHOOK_URL,
    };

    // Llamar a la API de Mercado Pago
    const response = await fetch(`${MP_API_URL}/checkout/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Error al crear preferencia de pago"
      );
    }

    const result = await response.json();

    // Guardar información de la transacción
    const transactionInfo = {
      preferenceId: result.id,
      planId,
      planName,
      price,
      userId,
      timestamp: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      "@last_transaction",
      JSON.stringify(transactionInfo)
    );

    return {
      preferenceId: result.id,
      checkoutUrl: result.init_point,
      sandboxUrl: result.sandbox_init_point,
      success: true,
    };
  } catch (error) {
    console.error("Error al crear preferencia de pago:", error);
    throw error;
  }
};

// Función para guardar la información de suscripción localmente
export const saveSubscriptionInfo = async (subscriptionInfo) => {
  try {
    await AsyncStorage.setItem(
      "userSubscription",
      JSON.stringify(subscriptionInfo)
    );
    return true;
  } catch (error) {
    console.error("Error al guardar información de suscripción:", error);
    return false;
  }
};

// Función para obtener la información de suscripción guardada localmente
export const getSubscriptionInfo = async () => {
  try {
    const subscriptionData = await AsyncStorage.getItem("userSubscription");
    return subscriptionData ? JSON.parse(subscriptionData) : null;
  } catch (error) {
    console.error("Error al obtener información de suscripción:", error);
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

    return subscription.status === "active" && expirationDate > now;
  } catch (error) {
    console.error("Error al verificar suscripción activa:", error);
    return false;
  }
};

// Función para actualizar el plan del usuario en Firestore
export const updateUserPlan = async (userId, planId, expirationDate) => {
  try {
    // Verificar si el usuario ya tiene un plan activo
    const currentStatus = await checkSubscriptionStatus(userId);
    if (currentStatus.active && currentStatus.planId === planId) {
      throw new Error(
        "No puedes seleccionar el mismo plan que ya tienes activo"
      );
    }

    // Verificar si el plan existe
    const planDetails = SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
    if (!planDetails) {
      throw new Error("Plan no encontrado");
    }

    // Asegurar que la fecha de expiración sea exactamente 30 días desde hoy (mensual)
    const currentDate = new Date();
    const nextPaymentDate = new Date(currentDate);
    nextPaymentDate.setDate(currentDate.getDate() + 30); // Exactamente 30 días

    console.log(
      `Actualizando plan a ${planId}, expira: ${nextPaymentDate.toISOString()}`
    );

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
      status: "active",
      billingCycle: "monthly", // Explícitamente mensual
      updatedAt: new Date(),
    };

    // Actualizar en Firestore
    const userRef = doc(db, "businessInfo", userId);
    await updateDoc(userRef, {
      subscription: subscriptionData,
    });

    // Guardar localmente
    await saveSubscriptionInfo(subscriptionData);

    return {
      success: true,
      nextPaymentDate,
      nextPaymentAmount: planDetails.price,
    };
  } catch (error) {
    console.error("Error al actualizar plan:", error);
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
    // Buscar en businessInfo primero, que es donde se almacena la información actualizada
    const businessRef = doc(db, "businessInfo", userId);
    const businessDoc = await getDoc(businessRef);

    if (businessDoc.exists()) {
      const userData = businessDoc.data();

      // Si tiene información de suscripción
      if (userData.subscription) {
        const subscription = userData.subscription;

        // Obtener fecha de expiración y convertirla correctamente si es timestamp de Firestore
        let expirationDate = subscription.expirationDate;
        if (expirationDate && expirationDate.seconds) {
          expirationDate = new Date(expirationDate.seconds * 1000);
        } else if (expirationDate) {
          expirationDate = new Date(expirationDate);
        }

        const now = new Date();
        const isActive = expirationDate && expirationDate > now;

        console.log(
          `Estado de suscripción para ${userId}: Plan ${subscription.planId}, Activo: ${isActive}, Expira: ${expirationDate}`
        );

        return {
          active: isActive,
          planId: subscription.planId || "base",
          planName: subscription.planName || "Plan Base",
          expirationDate: expirationDate,
          nextPaymentDate: expirationDate,
          nextPaymentAmount: subscription.nextPaymentAmount || 0,
          message: isActive
            ? "Suscripción activa"
            : "Tu suscripción ha expirado",
        };
      }
    }

    // Si llegamos aquí, no se encontró información de suscripción activa
    return {
      active: false,
      planId: "base",
      planName: "Plan Base",
      message: "No tienes una suscripción activa",
    };
  } catch (error) {
    console.error("Error al verificar estado de suscripción:", error);
    // En caso de error, devolvemos que no hay suscripción activa
    return {
      active: false,
      planId: "base",
      planName: "Plan Base",
      message: "Error al verificar suscripción: " + error.message,
    };
  }
};

/**
 * Función para cancelar una suscripción
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - Resultado de la operación
 */
export const cancelSubscription = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);

    await updateDoc(userRef, {
      "subscription.status": "cancelled",
      "subscription.cancelledAt": serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error al cancelar suscripción:", error);
    throw error;
  }
};

/**
 * Función para renovar automáticamente la suscripción
 * @param {string} userId - ID del usuario
 * @param {string} planId - ID del plan
 * @returns {Promise<Object>} - Resultado de la renovación
 */
export const renewSubscription = async (userId, planId) => {
  try {
    // Verificar si el plan existe
    const planDetails = SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
    if (!planDetails) {
      return {
        success: false,
        message: "Plan no encontrado",
      };
    }

    // Asegurar que la fecha de expiración sea exactamente 30 días desde hoy (mensual)
    const currentDate = new Date();
    const expirationDate = new Date(currentDate);
    expirationDate.setDate(currentDate.getDate() + 30); // Exactamente 30 días

    console.log(
      `Renovando plan ${planId}, nueva expiración: ${expirationDate.toISOString()}`
    );

    // Crear o actualizar la información de suscripción
    const subscriptionData = {
      planId,
      planName: planDetails.name,
      productLimit: planDetails.productLimit,
      price: planDetails.price,
      startDate: new Date(),
      expirationDate: expirationDate,
      lastPayment: new Date(),
      nextPaymentAmount: planDetails.price,
      status: "active",
      billingCycle: "monthly", // Explícitamente mensual
      updatedAt: new Date(),
    };

    // Actualizar en Firestore usando la misma referencia que en updateUserPlan
    const userRef = doc(db, "businessInfo", userId);
    await updateDoc(userRef, {
      subscription: subscriptionData,
    });

    // Guardar localmente
    await saveSubscriptionInfo(subscriptionData);

    return {
      success: true,
      expirationDate: expirationDate,
      message: "Suscripción renovada correctamente",
    };
  } catch (error) {
    console.error("Error al renovar suscripción:", error);
    return {
      success: false,
      message: "Error al renovar la suscripción: " + error.message,
    };
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
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error al verificar pago: ${response.status}`);
    }

    const paymentData = await response.json();

    // Verificar el estado del pago
    const status = paymentData.status;

    // Determinar si el pago fue exitoso
    let success = false;
    let message = "";

    switch (status) {
      case "approved":
        success = true;
        message = "Pago aprobado";
        break;
      case "pending":
        success = false;
        message = "Pago pendiente de aprobación";
        break;
      case "in_process":
        success = false;
        message = "Pago en proceso";
        break;
      case "rejected":
        success = false;
        message = "Pago rechazado";
        break;
      default:
        success = false;
        message = `Estado desconocido: ${status}`;
    }

    return {
      success,
      status,
      message,
      paymentData,
    };
  } catch (error) {
    console.error("Error al verificar pago:", error);
    return {
      success: false,
      status: "error",
      message: error.message || "Error al verificar el pago",
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
    approved: "Pago aprobado",
    pending: "Pago pendiente de aprobación",
    in_process: "Pago en proceso",
    rejected: "Pago rechazado",
    cancelled: "Pago cancelado",
    refunded: "Pago reembolsado",
    charged_back: "Pago contracargado",
  };

  return messages[status] || "Estado desconocido";
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
