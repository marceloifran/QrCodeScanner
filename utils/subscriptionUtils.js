import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Alert } from 'react-native';
import { getPlanById } from '../constants/plans';

// Función para verificar si un usuario puede agregar más productos
export const checkProductLimit = async (userId) => {
  try {
    // Obtener información del plan del usuario
    const userRef = doc(db, 'businessInfo', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { canAdd: false, message: 'No se encontró información del usuario' };
    }
    
    const userData = userDoc.data();
    let planId = 'base';
    
    // Verificar si el usuario tiene una suscripción activa
    if (userData.subscription && userData.subscription.status === 'active') {
      planId = userData.subscription.planId;
    } else if (userData.subscriptionPlan) {
      // Para compatibilidad con versiones anteriores
      planId = userData.subscriptionPlan;
    }
    
    const plan = getPlanById(planId);
    
    // Contar cuántos productos tiene el usuario
    const productsQuery = query(
      collection(db, 'products'),
      where('userId', '==', userId)
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
        planId: planId
      };
    }
    
    return {
      canAdd: true,
      currentCount: productCount,
      limit: plan.productLimit,
      planId: planId
    };
  } catch (error) {
    console.error('Error al verificar límite de productos:', error);
    // En caso de error, permitimos agregar para no bloquear al usuario
    return { canAdd: true };
  }
};

// Función para mostrar una alerta cuando se alcanza el límite
export const showLimitAlert = (result, navigation) => {
  if (!result.canAdd) {
    Alert.alert(
      'Límite de productos alcanzado',
      result.message,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Actualizar Plan',
          onPress: () => navigation.navigate('SubscriptionPlans', { upgrade: true })
        }
      ]
    );
    return true; // Se mostró la alerta
  }
  return false; // No se mostró la alerta
};

// Función para verificar el límite antes de agregar un producto
export const verifyProductLimit = async (userId) => {
  try {
    if (!userId) {
      userId = auth.currentUser?.uid;
    }
    
    if (!userId) return false;
    
    const result = await checkProductLimit(userId);
    return result.canAdd;
  } catch (error) {
    console.error('Error en verificación de límite:', error);
    return true; // En caso de error, permitimos continuar
  }
};
