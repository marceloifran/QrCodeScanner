import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/config';
import { upgradeDirectlyToPremium } from '../services/PaymentService';
import { colors } from '../theme/colors';

export default function DirectUpgradeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const handleDirectUpgrade = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para actualizar tu plan');
      return;
    }

    setLoading(true);
    try {
      // Mostrar indicador de carga
      Alert.alert(
        'Actualizando plan',
        'Estamos actualizando tu plan a Premium, por favor espera un momento...'
      );
      
      const userId = auth.currentUser.uid;
      const success = await upgradeDirectlyToPremium(userId);
      
      if (success) {
        Alert.alert(
          '¡Actualización Exitosa!',
          'Tu cuenta ha sido actualizada al plan Premium.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navegar al Dashboard
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              },
            },
          ]
        );
      } else {
        throw new Error('No se pudo actualizar el plan');
      }
    } catch (error) {
      console.error('Error al actualizar plan:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al actualizar tu plan. Por favor, intenta nuevamente más tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Actualización Directa</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.card}>
          <Ionicons name="star" size={60} color={colors.primary} style={styles.icon} />
          <Text style={styles.title}>Plan Premium</Text>
          <Text style={styles.description}>
            Actualiza directamente a nuestro plan Premium y disfruta de todos los beneficios:
          </Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            <Text style={styles.benefitText}>Productos ilimitados</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            <Text style={styles.benefitText}>Categorías personalizadas</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            <Text style={styles.benefitText}>Reportes avanzados</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            <Text style={styles.benefitText}>Soporte prioritario</Text>
          </View>
          
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleDirectUpgrade}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="white" />
                <Text style={styles.upgradeButtonText}>Activar Plan Premium</Text>
              </>
            )}
          </TouchableOpacity>
          
          <Text style={styles.disclaimer}>
            Esta opción es solo para pruebas y desarrollo.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  benefitText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 24,
    width: '100%',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});
