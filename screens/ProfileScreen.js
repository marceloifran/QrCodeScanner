import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { 
  getAuth, 
  updatePassword, 
  sendPasswordResetEmail,
  signOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      Alert.alert(
        'Email enviado', 
        'Se ha enviado un correo para restablecer tu contraseña'
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el email de recuperación');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar sesión', 
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color={colors.primary} />
        </View>
        <Text style={styles.email}>{auth.currentUser.email}</Text>
        <Text style={styles.role}>{userData?.role || 'Usuario'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        
        <TouchableOpacity 
          style={styles.option}
          onPress={handleResetPassword}
        >
          <Ionicons name="key-outline" size={24} color={colors.text.primary} />
          <Text style={styles.optionText}>Cambiar contraseña</Text>
          <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.option}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={[styles.optionText, { color: colors.error }]}>
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Último acceso</Text>
          <Text style={styles.infoValue}>
            {userData?.lastLogin?.toDate().toLocaleString() || 'N/A'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Cuenta creada</Text>
          <Text style={styles.infoValue}>
            {userData?.createdAt?.toDate().toLocaleString() || 'N/A'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginBottom: 10,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: colors.text.primary,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
  },
}); 