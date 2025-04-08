import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';

export default function BusinessInfoScreen({ navigation }) {
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBusinessInfo();
  }, []);

  const loadBusinessInfo = async () => {
    setLoading(true);
    try {
      const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);
      
      if (businessInfoDoc.exists()) {
        const data = businessInfoDoc.data();
        setBusinessName(data.name || '');
      }
    } catch (error) {
      console.error('Error al cargar información del negocio:', error);
      Alert.alert('Error', 'No se pudo cargar la información del negocio');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'El nombre del negocio es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
      await setDoc(businessInfoRef, {
        name: businessName.trim(),
        updatedAt: new Date()
      }, { merge: true });
      
      Alert.alert('Éxito', 'Información del negocio guardada correctamente');
      navigation.goBack();
    } catch (error) {
      console.error('Error al guardar información del negocio:', error);
      Alert.alert('Error', 'No se pudo guardar la información del negocio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>Información del Negocio</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre del Negocio</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del negocio"
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  loader: {
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 