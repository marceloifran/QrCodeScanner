import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [businessInfo, setBusinessInfo] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUser(currentUser);
        
        // Cargar información del negocio
        const businessInfoRef = doc(db, 'businessInfo', currentUser.uid);
        const businessInfoDoc = await getDoc(businessInfoRef);
        
        if (businessInfoDoc.exists()) {
          setBusinessInfo(businessInfoDoc.data());
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión');
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {businessInfo?.name ? businessInfo.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.businessName}>
              {businessInfo?.name || 'Mi Negocio'}
            </Text>
            
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => navigation.navigate('NotificationSettings')}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.primary} />
              <Text style={styles.optionText}>Configurar Notificaciones</Text>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => navigation.navigate('BusinessInfo')}
            >
              <Ionicons name="business-outline" size={24} color={colors.primary} />
              <Text style={styles.optionText}>Información del Negocio</Text>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
              <Text style={styles.optionText}>Configuración</Text>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="white" />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: 'white',
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  optionsContainer: {
    marginTop: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: colors.text.primary,
  },
  logoutButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
}); 