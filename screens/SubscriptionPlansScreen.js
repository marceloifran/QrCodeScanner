import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/config';
import { SUBSCRIPTION_PLANS, getPlanById } from '../constants/plans';
import { checkSubscriptionStatus } from '../services/PaymentService';
import { colors } from '../theme/colors';

export default function SubscriptionPlansScreen({ navigation, route }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPlanInfo, setCurrentPlanInfo] = useState(null);
  const [isUpgrade, setIsUpgrade] = useState(false);

  useEffect(() => {
    loadCurrentPlan();
    if (route.params?.upgrade) {
      setIsUpgrade(true);
    }
  }, [route.params]);

  const loadCurrentPlan = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (userId) {
        const status = await checkSubscriptionStatus(userId);
        if (status.active) {
          setCurrentPlanInfo({
            planId: status.planId,
            planName: status.planName,
            nextPaymentDate: status.nextPaymentDate,
            nextPaymentAmount: status.nextPaymentAmount
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar plan actual:', error);
      Alert.alert('Error', 'No se pudo cargar la información de tu plan actual');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (currentPlanInfo && plan.id === currentPlanInfo.planId) {
      Alert.alert(
        'Plan Actual',
        'Este es tu plan actual. Selecciona un plan diferente si deseas cambiar.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    setSelectedPlan(plan.id);
  };

  const formatDate = (date) => {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleContinue = () => {
    if (!selectedPlan) {
      Alert.alert('Selecciona un plan', 'Por favor selecciona un plan para continuar');
      return;
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
    const nextPayment = new Date();
    nextPayment.setMonth(nextPayment.getMonth() + 1);

    Alert.alert(
      'Confirmar cambio de plan',
      `¿Deseas cambiar al ${plan.name}?\n\n` +
      `Precio mensual: ${formatCurrency(plan.price)}\n` +
      `Próximo pago: ${formatDate(nextPayment)}\n\n` +
      `Tu plan actual será desactivado al confirmar el cambio.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            navigation.navigate('Payment', {
              planId: selectedPlan,
              planName: plan.name,
              price: plan.price,
              userId: auth.currentUser?.uid,
              nextPaymentDate: nextPayment
            });
          }
        }
      ]
    );
  };

  const renderPlanCard = (plan) => {
    const isCurrentPlan = currentPlanInfo && currentPlanInfo.planId === plan.id;
    const isSelected = selectedPlan === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard,
          isCurrentPlan && styles.currentPlanCard
        ]}
        onPress={() => handleSelectPlan(plan)}
        disabled={isCurrentPlan}
      >
        {plan.recommended && !isCurrentPlan && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Recomendado</Text>
          </View>
        )}
        
        {isCurrentPlan && (
          <View style={[styles.recommendedBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.recommendedText}>Plan Actual</Text>
          </View>
        )}
        
        <Text style={[
          styles.planName, 
          { color: isCurrentPlan ? colors.success : plan.color }
        ]}>
          {plan.name}
        </Text>
        
        <Text style={styles.planPrice}>
          {formatCurrency(plan.price)}
          <Text style={styles.perMonth}>/mes</Text>
        </Text>

        <View style={styles.planFeatures}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons 
                name="checkmark-circle" 
                size={20} 
                color={isCurrentPlan ? colors.success : plan.color} 
                style={styles.featureIcon} 
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isCurrentPlan && currentPlanInfo?.nextPaymentDate && (
          <View style={styles.currentPlanInfo}>
            <Text style={styles.nextPaymentText}>
              Próximo pago: {formatDate(currentPlanInfo.nextPaymentDate)}
            </Text>
            <Text style={styles.nextPaymentText}>
              Monto: {formatCurrency(currentPlanInfo.nextPaymentAmount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando planes disponibles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planes de Suscripción</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          {isUpgrade 
            ? 'Actualiza tu plan para obtener más beneficios y aumentar el límite de productos.' 
            : 'Elige el plan que mejor se adapte a las necesidades de tu negocio.'}
        </Text>
        
        {SUBSCRIPTION_PLANS.map(renderPlanCard)}
        
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Todos los planes incluyen acceso a todas las funciones básicas de la aplicación.
            La suscripción se renueva automáticamente cada mes.
          </Text>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedPlan && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!selectedPlan}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
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
  introText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 2,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  selectedPlanCard: {
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 2.5,
  },
  currentPlanCard: {
    borderColor: colors.success,
    backgroundColor: '#f8fff8',
    opacity: 0.9
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#ff9800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  perMonth: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
  planFeatures: {
    marginTop: 10,
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
  currentPlanInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 8
  },
  nextPaymentText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
