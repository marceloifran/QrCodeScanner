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
      
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar información de suscripción:', error);
      Alert.alert('Error', 'No se pudo cargar la información de suscripción');
      setLoading(false);
    }
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
    const isPremium = subscriptionInfo.planId === 'premium';
    const statusText = subscriptionInfo.status === 'active' ? 'Activa' : 'Inactiva';
    const nextPaymentDate = formatDate(new Date(subscriptionInfo.expirationDate));
    
    return (
      <View style={styles.planContainer}>
        <View style={styles.planHeader}>
          <Text style={[styles.planName, isPremium && styles.premiumPlanName]}>
            {subscriptionInfo.planName}
          </Text>
          <View style={[styles.statusBadge, 
            subscriptionInfo.status === 'active' ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Costo mensual:</Text>
            <Text style={styles.infoValue}>
              ${plan.price} ARS
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Último pago:</Text>
            <Text style={styles.infoValue}>
              ${subscriptionInfo.lastPaymentAmount} ARS
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Próxima renovación:</Text>
            <Text style={[styles.infoValue, styles.expirationText]}>
              {nextPaymentDate}
            </Text>
          </View>
        </View>
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
  planContainer: {
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
  premiumPlanName: {
    color: '#ff9800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  activeBadge: {
    backgroundColor: '#28a745',
  },
  inactiveBadge: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsContainer: {
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
  expirationText: {
    color: '#666',
  },
});
