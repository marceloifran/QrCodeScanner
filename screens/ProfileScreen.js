import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { colors } from '../theme/colors';
import { doc, getDoc } from 'firebase/firestore';
import { checkSubscriptionStatus } from '../services/PaymentService';

export default function ProfileScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Cargar la información del usuario y su suscripción
    loadUserSubscription();
    
    // Actualizar cuando se vuelve a esta pantalla
    const unsubscribe = navigation.addListener('focus', () => {
      setRefreshKey(prevKey => prevKey + 1);
    });
    
    return unsubscribe;
  }, [navigation, refreshKey]);

  const loadUserSubscription = async () => {
    try {
      setLoading(true);
      
      if (!auth.currentUser) {
        console.log('No hay usuario autenticado');
        setLoading(false);
        return;
      }
      
      const userId = auth.currentUser.uid;
      console.log('Cargando suscripción para usuario:', userId);
      
      // Obtener información de suscripción
      const userRef = doc(db, 'businessInfo', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Datos del usuario:', JSON.stringify(userData));
        
        if (userData.subscription) {
          setSubscriptionInfo(userData.subscription);
        } else {
          setSubscriptionInfo({ planId: 'free', planName: 'Gratuito', status: 'active' });
        }
      } else {
        console.log('No se encontró documento de usuario');
        setSubscriptionInfo({ planId: 'free', planName: 'Gratuito', status: 'active' });
      }
    } catch (error) {
      console.error('Error al cargar suscripción:', error);
      Alert.alert('Error', 'No se pudo cargar la información de tu suscripción');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // La redirección a la pantalla de login se maneja automáticamente por el AuthContext
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión. Inténtalo de nuevo.');
    }
  };

  const renderSubscriptionInfo = () => {
    if (loading) {
      return (
        <View style={styles.subscriptionContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      );
    }

    if (!subscriptionInfo) {
      return (
        <View style={styles.subscriptionContainer}>
          <Text style={styles.planName}>Plan Gratuito</Text>
          <Text style={styles.planDetails}>Plan básico con funcionalidades limitadas</Text>
        </View>
      );
    }

    const isPremium = subscriptionInfo.planId !== 'free';
    const statusText = subscriptionInfo.status === 'active' ? 'Activo' : 'Inactivo';
    const expirationDate = subscriptionInfo.expirationDate ? 
      new Date(subscriptionInfo.expirationDate.seconds * 1000).toLocaleDateString() : 
      'Sin fecha de expiración';

    return (
      <View style={styles.subscriptionContainer}>
        <View style={styles.planHeader}>
          <Text style={[styles.planName, isPremium && styles.premiumPlanName]}>
            {subscriptionInfo.planName}
          </Text>
          <View style={[styles.statusBadge, 
            subscriptionInfo.status === 'active' ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        
        {isPremium && (
          <View style={styles.planDetailsContainer}>
            <Text style={styles.planDetails}>
              Límite de productos: {subscriptionInfo.productLimit === 'infinity' ? 'Ilimitado' : subscriptionInfo.productLimit}
            </Text>
            <Text style={styles.planDetails}>
              Expira: {expirationDate}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.changePlanButton}
          onPress={() => navigation.navigate('SubscriptionPlans')}
        >
          <Text style={styles.changePlanButtonText}>
            {isPremium ? 'Cambiar plan' : 'Actualizar a premium'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.userInfoContainer}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{auth.currentUser?.displayName || 'Usuario'}</Text>
            <Text style={styles.userEmail}>{auth.currentUser?.email}</Text>
          </View>
        </View>
        
        {renderSubscriptionInfo()}
        
        <View style={styles.optionsContainer}>
          {/* Sección de Configuración del Negocio */}
          <TouchableOpacity 
            style={styles.option}
            onPress={() => navigation.navigate('BusinessSettings')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="business-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.optionText}>Configuración del Negocio</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          {/* Sección de Cerrar Sesión */}
          <TouchableOpacity
            style={[styles.optionItem, styles.signOutOption]}
            onPress={handleSignOut}
          >
            <View style={[styles.optionIconContainer, styles.signOutIconContainer]}>
              <Ionicons name="log-out-outline" size={24} color="#e53935" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, styles.signOutText]}>Cerrar Sesión</Text>
            </View>
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0f2f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  subscriptionContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  premiumPlanName: {
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#e8f5e9',
  },
  inactiveBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  planDetailsContainer: {
    marginVertical: 8,
  },
  planDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  changePlanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  changePlanButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  optionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  signOutOption: {
    borderBottomWidth: 0,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  signOutIconContainer: {
    backgroundColor: '#ffebee',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: '#333',
  },
  signOutText: {
    color: '#e53935',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});