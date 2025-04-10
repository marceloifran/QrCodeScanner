import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { checkSubscriptionStatus } from '../services/PaymentService';
import { getPlanById, getProductLimit, getRemainingProducts, needsUpgrade } from '../constants/plans';
import { colors } from '../theme/colors';

export default function SubscriptionInfoScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [productCount, setProductCount] = useState(0);
  const [remainingProducts, setRemainingProducts] = useState(0);
  const [needsUpgradeFlag, setNeedsUpgradeFlag] = useState(false);

  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  const loadSubscriptionInfo = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'Debes iniciar sesión para ver esta información');
        navigation.goBack();
        return;
      }
      
      // Obtener información de suscripción
      const status = await checkSubscriptionStatus(userId);
      setSubscriptionInfo(status);
      
      // Obtener el conteo de productos del usuario
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('userId', '==', userId));
      const productsSnapshot = await getDocs(q);
      setProductCount(productsSnapshot.size);
      
      // Calcular productos restantes
      const remaining = getRemainingProducts(productsSnapshot.size, status.planId);
      setRemainingProducts(remaining);
      
      // Verificar si necesita actualizar
      const shouldUpgrade = needsUpgrade(productsSnapshot.size, status.planId);
      setNeedsUpgradeFlag(shouldUpgrade);
      
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar información de suscripción:', error);
      Alert.alert('Error', 'No se pudo cargar la información de suscripción');
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigation.navigate('SubscriptionPlans', { upgrade: true });
  };

  const formatDate = (date) => {
    if (!date) return 'No disponible';
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const renderPlanDetails = () => {
    if (!subscriptionInfo) return null;
    
    const plan = getPlanById(subscriptionInfo.planId);
    const productLimit = getProductLimit(subscriptionInfo.planId);
    const limitText = productLimit === Infinity ? 'Ilimitados' : productLimit;
    
    return (
      <View style={styles.planDetailsContainer}>
        <View style={[styles.planHeader, { backgroundColor: plan.color }]}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>{plan.priceDisplay}<Text style={styles.perMonth}>/mes</Text></Text>
        </View>
        
        <View style={styles.planInfoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <View style={[styles.statusBadge, { 
              backgroundColor: subscriptionInfo.active ? '#28a745' : '#dc3545' 
            }]}>
              <Text style={styles.statusText}>
                {subscriptionInfo.active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
          
          {subscriptionInfo.expirationDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vence el:</Text>
              <Text style={styles.infoValue}>{formatDate(subscriptionInfo.expirationDate)}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Límite de productos:</Text>
            <Text style={styles.infoValue}>{limitText}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Productos actuales:</Text>
            <Text style={styles.infoValue}>{productCount}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Productos restantes:</Text>
            <Text style={[styles.infoValue, remainingProducts < 20 ? styles.warningText : null]}>
              {remainingProducts === Infinity ? 'Ilimitados' : remainingProducts}
            </Text>
          </View>
        </View>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Características incluidas:</Text>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={plan.color} style={styles.featureIcon} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        {needsUpgradeFlag && (
          <View style={styles.upgradeContainer}>
            <View style={styles.upgradeMessage}>
              <Ionicons name="warning" size={20} color="#ff9800" style={styles.warningIcon} />
              <Text style={styles.upgradeText}>
                Estás cerca del límite de productos. Considera actualizar tu plan para continuar creciendo.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: plan.color }]}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Actualizar Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Suscripción</Text>
        <View style={styles.placeholder} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {renderPlanDetails()}
          
          <TouchableOpacity
            style={styles.viewPlansButton}
            onPress={() => navigation.navigate('SubscriptionPlans')}
          >
            <Text style={styles.viewPlansButtonText}>Ver Todos los Planes</Text>
          </TouchableOpacity>
          
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>¿Necesitas ayuda?</Text>
            <Text style={styles.helpText}>
              Si tienes alguna pregunta sobre tu suscripción o necesitas asistencia,
              no dudes en contactarnos a través de nuestro correo de soporte.
            </Text>
            <TouchableOpacity style={styles.contactButton}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
              <Text style={styles.contactButtonText}>soporte@ifsin.com</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
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
    width: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  planDetailsContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  planHeader: {
    padding: 15,
    alignItems: 'center',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  perMonth: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  planInfoContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  warningText: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuresContainer: {
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
  },
  upgradeContainer: {
    padding: 15,
    backgroundColor: '#fff9c4',
  },
  upgradeMessage: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  warningIcon: {
    marginRight: 10,
  },
  upgradeText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  upgradeButton: {
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewPlansButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 5,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  viewPlansButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
});
