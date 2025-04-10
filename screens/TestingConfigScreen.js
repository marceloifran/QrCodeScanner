import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toggleLocalBackendTesting, isUsingLocalBackend } from '../services/PaymentService';
import { colors } from '../theme/colors';

export default function TestingConfigScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [useLocalBackend, setUseLocalBackend] = useState(false);
  const [testMode, setTestMode] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const usingLocalBackend = await isUsingLocalBackend();
      setUseLocalBackend(usingLocalBackend);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      setLoading(false);
    }
  };

  const handleToggleLocalBackend = async (value) => {
    try {
      setUseLocalBackend(value);
      await toggleLocalBackendTesting(value);
      
      Alert.alert(
        'Configuración actualizada',
        value 
          ? 'Ahora estás usando el backend local para pruebas. Asegúrate de que tu servidor esté en ejecución.'
          : 'Ahora estás usando la simulación para pruebas.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error al cambiar configuración:', error);
      Alert.alert('Error', 'No se pudo actualizar la configuración');
    }
  };

  const renderTestingCards = () => {
    return (
      <View style={styles.testingCardsContainer}>
        <View style={styles.testingCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="server-outline" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>Backend Local</Text>
          </View>
          
          <Text style={styles.cardDescription}>
            Usa un servidor local para procesar pagos con Mercado Pago. Debes tener el servidor ejecutándose en tu computadora.
          </Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Usar backend local</Text>
            <Switch
              value={useLocalBackend}
              onValueChange={handleToggleLocalBackend}
              trackColor={{ false: '#767577', true: '#a8d5ba' }}
              thumbColor={useLocalBackend ? colors.primary : '#f4f3f4'}
            />
          </View>
          
          <Text style={styles.infoText}>
            {useLocalBackend 
              ? 'Las solicitudes de pago se enviarán a tu servidor local (http://10.0.2.2:3000)' 
              : 'Las solicitudes de pago serán simuladas sin usar un servidor real'}
          </Text>
        </View>
        
        <View style={styles.testingCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={24} color="#ff9800" />
            <Text style={styles.cardTitle}>Tarjetas de Prueba</Text>
          </View>
          
          <Text style={styles.cardDescription}>
            Usa estas tarjetas para simular diferentes resultados de pago en el entorno de pruebas de Mercado Pago.
          </Text>
          
          <View style={styles.cardTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.typeCell]}>Tipo</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.numberCell]}>Número</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.codeCell]}>CVV</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.dateCell]}>Fecha</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.typeCell]}>Mastercard</Text>
              <Text style={[styles.tableCell, styles.numberCell]}>5031 7557 3453 0604</Text>
              <Text style={[styles.tableCell, styles.codeCell]}>123</Text>
              <Text style={[styles.tableCell, styles.dateCell]}>11/25</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.typeCell]}>Visa</Text>
              <Text style={[styles.tableCell, styles.numberCell]}>4509 9535 6623 3704</Text>
              <Text style={[styles.tableCell, styles.codeCell]}>123</Text>
              <Text style={[styles.tableCell, styles.dateCell]}>11/25</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.typeCell]}>Amex</Text>
              <Text style={[styles.tableCell, styles.numberCell]}>3711 8030 3257 522</Text>
              <Text style={[styles.tableCell, styles.codeCell]}>1234</Text>
              <Text style={[styles.tableCell, styles.dateCell]}>11/25</Text>
            </View>
          </View>
          
          <Text style={styles.noteText}>
            Para diferentes resultados:
          </Text>
          <Text style={styles.noteItem}>• Aprobado: Cualquier DNI</Text>
          <Text style={styles.noteItem}>• Rechazado: DNI terminado en "0"</Text>
          <Text style={styles.noteItem}>• Pendiente: DNI terminado en "1"</Text>
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
        <Text style={styles.headerTitle}>Configuración de Pruebas</Text>
        <View style={styles.placeholder} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando configuración...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={24} color="#ff9800" style={styles.warningIcon} />
            <Text style={styles.warningText}>
              Esta pantalla es solo para desarrollo y pruebas. No debe estar disponible en la versión de producción.
            </Text>
          </View>
          
          {renderTestingCards()}
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instrucciones para pruebas:</Text>
            <Text style={styles.instructionStep}>1. Configura el backend local siguiendo las instrucciones en backend/README.md</Text>
            <Text style={styles.instructionStep}>2. Inicia el servidor con "npm run dev" en la carpeta backend</Text>
            <Text style={styles.instructionStep}>3. Activa "Usar backend local" en esta pantalla</Text>
            <Text style={styles.instructionStep}>4. Navega a la pantalla de planes y selecciona uno</Text>
            <Text style={styles.instructionStep}>5. Usa las tarjetas de prueba para simular pagos</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => navigation.navigate('SubscriptionPlans')}
          >
            <Text style={styles.testButtonText}>Ir a Planes de Suscripción</Text>
          </TouchableOpacity>
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
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  testingCardsContainer: {
    marginBottom: 20,
  },
  testingCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cardTable: {
    marginTop: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tableCell: {
    padding: 8,
    fontSize: 12,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#333',
  },
  typeCell: {
    flex: 1,
  },
  numberCell: {
    flex: 2,
  },
  codeCell: {
    flex: 0.7,
    textAlign: 'center',
  },
  dateCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  noteText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  noteItem: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
    marginBottom: 3,
  },
  instructionsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instructionStep: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
