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
import { SUBSCRIPTION_PLANS } from '../constants/plans';
import { checkSubscriptionStatus } from '../services/PaymentService';
import { colors } from '../theme/colors';

export default function SubscriptionPlansScreen({ navigation, route }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('base');
  const [isUpgrade, setIsUpgrade] = useState(false);

  useEffect(() => {
    // Verificar el plan actual del usuario
    const checkCurrentPlan = async () => {
      try {
        setLoading(true);
        const userId = auth.currentUser?.uid;
        if (userId) {
          const status = await checkSubscriptionStatus(userId);
          setCurrentPlan(status.planId);
          
          // Si venimos de una pantalla que indica upgrade, marcamos como upgrade
          if (route.params?.upgrade) {
            setIsUpgrade(true);
          }
        }
      } catch (error) {
        console.error('Error al verificar plan actual:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCurrentPlan();
  }, [route.params]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan.id);
  };

  const handleContinue = async () => {
    if (!selectedPlan) {
      Alert.alert('Selecciona un plan', 'Por favor selecciona un plan para continuar');
      return;
    }

    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'Debes iniciar sesión para continuar');
        setLoading(false);
        return;
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
      
      // Navegar a la pantalla de pago con los detalles del plan seleccionado
      navigation.navigate('Payment', {
        planId: selectedPlan,
        planName: plan.name,
        price: plan.price,
        userId
      });
      
    } catch (error) {
      console.error('Error al procesar el plan:', error);
      Alert.alert('Error', 'No se pudo procesar la selección del plan. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const isPlanDisabled = (planId) => {
    // Determinar si un plan debe estar deshabilitado
    // Un plan está deshabilitado si es de menor nivel que el actual
    const currentPlanIndex = SUBSCRIPTION_PLANS.findIndex(p => p.id === currentPlan);
    const planIndex = SUBSCRIPTION_PLANS.findIndex(p => p.id === planId);
    
    return planIndex < currentPlanIndex;
  };

  const renderPlanCard = (plan) => {
    const isDisabled = isPlanDisabled(plan.id);
    const isSelected = selectedPlan === plan.id;
    const isCurrentPlan = currentPlan === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard,
          isDisabled && styles.disabledPlanCard,
          { borderColor: plan.color }
        ]}
        onPress={() => !isDisabled && handleSelectPlan(plan)}
        disabled={isDisabled}
      >
        {plan.recommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Recomendado</Text>
          </View>
        )}
        
        <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
        <Text style={styles.planPrice}>{plan.priceDisplay}<Text style={styles.perMonth}>/mes</Text></Text>
        
        <View style={styles.planFeatures}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={plan.color} style={styles.featureIcon} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        {isCurrentPlan && (
          <View style={[styles.currentPlanBadge, { backgroundColor: plan.color }]}>
            <Text style={styles.currentPlanText}>Plan Actual</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando planes...</Text>
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
        
        {SUBSCRIPTION_PLANS.map(plan => renderPlanCard(plan))}
        
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
  disabledPlanCard: {
    opacity: 0.6,
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
  currentPlanBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  currentPlanText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
