import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Switch, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  TextInput
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_SETTINGS = {
  lowStock: {
    enabled: true,
    threshold: 5
  },
  expiration: {
    enabled: true,
    criticalDays: 7,  // Alerta roja - 7 días o menos
    warningDays: 15,  // Alerta naranja - 15 días o menos
    noticeDays: 30    // Alerta amarilla - 30 días o menos
  }
};

export default function NotificationSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'notificationSettings', auth.currentUser.uid));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() || DEFAULT_SETTINGS);
      } else {
        // Si no existe, crear con valores por defecto
        await setDoc(doc(db, 'notificationSettings', auth.currentUser.uid), DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await setDoc(doc(db, 'notificationSettings', auth.currentUser.uid), newSettings);
      setSettings(newSettings);
      Alert.alert('Éxito', 'Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('Error al guardar configuraciones:', error);
      Alert.alert('Error', 'No se pudieron guardar las configuraciones');
    }
  };

  const handleExpirationDaysChange = (type, value) => {
    const numValue = parseInt(value) || 0;
    const newSettings = { ...settings };
    newSettings.expiration[type] = numValue;

    // Validar que los días tengan sentido (crítico < advertencia < aviso)
    if (type === 'criticalDays' && numValue >= settings.expiration.warningDays) {
      Alert.alert('Error', 'Los días críticos deben ser menos que los días de advertencia');
      return;
    }
    if (type === 'warningDays') {
      if (numValue <= settings.expiration.criticalDays) {
        Alert.alert('Error', 'Los días de advertencia deben ser más que los días críticos');
        return;
      }
      if (numValue >= settings.expiration.noticeDays) {
        Alert.alert('Error', 'Los días de advertencia deben ser menos que los días de aviso');
        return;
      }
    }
    if (type === 'noticeDays' && numValue <= settings.expiration.warningDays) {
      Alert.alert('Error', 'Los días de aviso deben ser más que los días de advertencia');
      return;
    }

    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView>
        {/* Configuración de Stock Bajo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
            <Text style={styles.sectionTitle}>Alertas de Stock Bajo</Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Activar notificaciones</Text>
            <Switch
              value={settings.lowStock.enabled}
              onValueChange={(value) => {
                const newSettings = { 
                  ...settings,
                  lowStock: { ...settings.lowStock, enabled: value }
                };
                saveSettings(newSettings);
              }}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Umbral de stock bajo</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={settings.lowStock.threshold.toString()}
              onChangeText={(value) => {
                const newSettings = { 
                  ...settings,
                  lowStock: { ...settings.lowStock, threshold: parseInt(value) || 0 }
                };
                saveSettings(newSettings);
              }}
            />
          </View>
        </View>

        {/* Configuración de Vencimientos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={24} color={colors.danger} />
            <Text style={styles.sectionTitle}>Alertas de Vencimiento</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Activar notificaciones</Text>
            <Switch
              value={settings.expiration.enabled}
              onValueChange={(value) => {
                const newSettings = { 
                  ...settings,
                  expiration: { ...settings.expiration, enabled: value }
                };
                saveSettings(newSettings);
              }}
            />
          </View>

          <View style={styles.alertLevelsContainer}>
            <Text style={styles.alertLevelsTitle}>Niveles de Alerta</Text>
            
            <View style={[styles.alertLevel, { borderColor: colors.danger }]}>
              <View style={styles.alertLevelHeader}>
                <View style={[styles.alertDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.alertLevelTitle}>Alerta Crítica</Text>
              </View>
              <View style={styles.alertLevelInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={settings.expiration.criticalDays.toString()}
                  onChangeText={(value) => handleExpirationDaysChange('criticalDays', value)}
                />
                <Text style={styles.daysLabel}>días o menos</Text>
              </View>
            </View>

            <View style={[styles.alertLevel, { borderColor: colors.warning }]}>
              <View style={styles.alertLevelHeader}>
                <View style={[styles.alertDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.alertLevelTitle}>Advertencia</Text>
              </View>
              <View style={styles.alertLevelInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={settings.expiration.warningDays.toString()}
                  onChangeText={(value) => handleExpirationDaysChange('warningDays', value)}
                />
                <Text style={styles.daysLabel}>días o menos</Text>
              </View>
            </View>

            <View style={[styles.alertLevel, { borderColor: '#FFD700' }]}>
              <View style={styles.alertLevelHeader}>
                <View style={[styles.alertDot, { backgroundColor: '#FFD700' }]} />
                <Text style={styles.alertLevelTitle}>Aviso Anticipado</Text>
              </View>
              <View style={styles.alertLevelInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={settings.expiration.noticeDays.toString()}
                  onChangeText={(value) => handleExpirationDaysChange('noticeDays', value)}
                />
                <Text style={styles.daysLabel}>días o menos</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
    textAlign: 'center',
  },
  alertLevelsContainer: {
    marginTop: 16,
  },
  alertLevelsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333',
  },
  alertLevel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  alertLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  alertLevelTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  alertLevelInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysLabel: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
});