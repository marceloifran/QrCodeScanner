import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Alert } from "react-native";
import { getPlanById } from "../constants/plans";
import { checkSubscriptionStatus } from "../services/PaymentService";

// Función para verificar el plan del usuario al iniciar la aplicación
export const validateUserSubscription = async (userId) => {
  try {
    if (!userId) {
      console.error("No se proporcionó ID de usuario");
      return {
        isValid: false,
        planId: "base",
        message: "Necesitas iniciar sesión para usar la aplicación",
        requiresPlanSelection: true,
      };
    }

    console.log("Verificando suscripción para usuario:", userId);

    // Verificar el estado actual de la suscripción
    const subscriptionStatus = await checkSubscriptionStatus(userId);

    if (!subscriptionStatus.active) {
      console.log("Suscripción no activa:", subscriptionStatus.message);

      // Si el usuario tiene una suscripción pero expiró, actualizar el estado
      if (subscriptionStatus.planId !== "base") {
        try {
          const userRef = doc(db, "businessInfo", userId);
          await updateDoc(userRef, {
            subscriptionPlan: "base",
            "subscription.status": "expired",
          });
          console.log("Estado de suscripción actualizado a expirado");
        } catch (updateError) {
          console.error(
            "Error al actualizar estado de suscripción:",
            updateError
          );
        }
      }

      return {
        isValid: false,
        planId: "base",
        message: "Debes seleccionar un plan para usar la aplicación",
        requiresPlanSelection: true,
      };
    }

    console.log("Suscripción activa:", subscriptionStatus.planId);
    return {
      isValid: true,
      planId: subscriptionStatus.planId,
      expirationDate: subscriptionStatus.expirationDate,
      requiresPlanSelection: false,
    };
  } catch (error) {
    console.error("Error al validar suscripción:", error);
    return {
      isValid: false,
      planId: "base",
      error: error.message,
      requiresPlanSelection: true,
    };
  }
};

// Función para verificar si un usuario puede agregar más productos
export const checkProductLimit = async (userId) => {
  try {
    // Obtener información del plan del usuario
    const userRef = doc(db, "businessInfo", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return {
        canAdd: false,
        message: "No se encontró información del usuario",
      };
    }

    const userData = userDoc.data();
    let planId = "base";

    // Verificar si el usuario tiene una suscripción activa
    if (userData.subscription && userData.subscription.status === "active") {
      planId = userData.subscription.planId || "base";
    } else if (userData.subscriptionPlan) {
      // Para compatibilidad con versiones anteriores
      planId = userData.subscriptionPlan || "base";
    }

    // Asegurar que planId sea una cadena de texto válida
    if (!planId || typeof planId !== "string") {
      planId = "base";
    }

    const plan = getPlanById(planId);

    // Contar cuántos productos tiene el usuario
    const productsQuery = query(
      collection(db, "products"),
      where("userId", "==", userId)
    );
    const productsSnapshot = await getDocs(productsQuery);
    const productCount = productsSnapshot.size;

    // Verificar si ha alcanzado el límite
    if (productCount >= plan.productLimit) {
      return {
        canAdd: false,
        message: `Has alcanzado el límite de ${plan.productLimit} productos de tu plan ${plan.name}. Actualiza tu plan para agregar más productos.`,
        currentCount: productCount,
        limit: plan.productLimit,
        planId: planId,
      };
    }

    return {
      canAdd: true,
      currentCount: productCount,
      limit: plan.productLimit,
      planId: planId,
    };
  } catch (error) {
    console.error("Error al verificar límite de productos:", error);
    // En caso de error, permitimos agregar para no bloquear al usuario
    return { canAdd: true };
  }
};

// Función para mostrar una alerta cuando se alcanza el límite
export const showLimitAlert = (result, navigation) => {
  if (!result.canAdd) {
    Alert.alert("Límite de productos alcanzado", result.message, [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Actualizar Plan",
        onPress: () =>
          navigation.navigate("SubscriptionPlans", { upgrade: true }),
      },
    ]);
    return true; // Se mostró la alerta
  }
  return false; // No se mostró la alerta
};

// Función para verificar el límite antes de agregar un producto
export const verifyProductLimit = async (navigation) => {
  try {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      console.error("No hay usuario autenticado");
      return true; // Permitimos continuar para no bloquear
    }

    console.log("Verificando límite de productos para usuario:", userId);
    const result = await checkProductLimit(userId);

    if (!result.canAdd) {
      console.log("Límite de productos alcanzado:", result);
      // Mostrar alerta con la opción de actualizar el plan
      if (navigation) {
        Alert.alert("Límite de productos alcanzado", result.message, [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Actualizar Plan",
            onPress: () =>
              navigation.navigate("SubscriptionPlans", { upgrade: true }),
          },
        ]);
      } else {
        Alert.alert("Límite de productos alcanzado", result.message);
      }
      return false;
    }

    console.log("Verificación de límite exitosa:", result);
    return true;
  } catch (error) {
    console.error("Error en verificación de límite:", error);
    return true; // En caso de error, permitimos continuar
  }
};
