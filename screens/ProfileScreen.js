import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { colors } from '../theme/colors';

export default function ProfileScreen({ navigation }) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // La redirección a la pantalla de login se maneja automáticamente por el AuthContext
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión. Inténtalo de nuevo.');
    }
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
        
        <View style={styles.optionsContainer}>
          {/* Sección de Configuración de Notificaciones */}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="notifications-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Configuración de Notificaciones</Text>
              <Text style={styles.optionDescription}>Gestiona tus preferencias de notificaciones</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
    paddingTop: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  optionsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 3,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  signOutOption: {
    borderBottomWidth: 0,
  },
  signOutIconContainer: {
    backgroundColor: '#ffebee',
  },
  signOutText: {
    color: '#e53935',
  },
}); 