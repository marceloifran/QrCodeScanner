import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image
} from 'react-native';
import { 
  getAuth, 
  updatePassword, 
  sendPasswordResetEmail,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    products: 0,
    sales: 0,
    lastActivity: null
  });
  const auth = getAuth();

  useEffect(() => {
    loadUserData();
    loadUserStats();
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

  const loadUserStats = async () => {
    try {
      // Contar productos
      const productsQuery = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const productsSnapshot = await getDocs(productsQuery);
      
      // Simulamos ventas para el ejemplo
      const salesCount = Math.floor(Math.random() * 50);
      
      setStats({
        products: productsSnapshot.size,
        sales: salesCount,
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      {/* Header con gradiente verde */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={90} color={colors.background} />
          </View>
          <Text style={styles.userName}>{userData?.displayName || 'Usuario'}</Text>
          <Text style={styles.email}>{auth.currentUser.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userData?.role || 'Usuario'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={28} color={colors.primary} />
            <Text style={styles.statNumber}>{stats.products}</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cart-outline" size={28} color={colors.primary} />
            <Text style={styles.statNumber}>{stats.sales}</Text>
            <Text style={styles.statLabel}>Ventas</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={28} color={colors.primary} />
            <Text style={styles.statNumber}>{userData?.lastLogin ? '✓' : '-'}</Text>
            <Text style={styles.statLabel}>Actividad</Text>
          </View>
        </View>

        {/* Sección de Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          
          <TouchableOpacity 
            style={styles.option}
            onPress={handleResetPassword}
          >
            <View style={[styles.iconContainer, {backgroundColor: colors.info}]}>
              <Ionicons name="key-outline" size={20} color={colors.text.onPrimary} />
            </View>
            <Text style={styles.optionText}>Cambiar contraseña</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.option}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={[styles.iconContainer, {backgroundColor: colors.secondary}]}>
              <Ionicons name="person-outline" size={20} color={colors.text.onPrimary} />
            </View>
            <Text style={styles.optionText}>Editar perfil</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.option}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={[styles.iconContainer, {backgroundColor: colors.accent}]}>
              <Ionicons name="settings-outline" size={20} color={colors.text.onPrimary} />
            </View>
            <Text style={styles.optionText}>Configuración</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Sección de Información */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="login" size={20} color={colors.text.secondary} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Último acceso</Text>
              <Text style={styles.infoValue}>
                {userData?.lastLogin?.toDate().toLocaleString() || 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="account-plus" size={20} color={colors.text.secondary} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Cuenta creada</Text>
              <Text style={styles.infoValue}>
                {userData?.createdAt?.toDate().toLocaleString() || 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="shield-account" size={20} color={colors.text.secondary} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Tipo de cuenta</Text>
              <Text style={styles.infoValue}>{userData?.role || 'Usuario estándar'}</Text>
            </View>
          </View>
        </View>

        {/* Botón de Cerrar Sesión */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.text.onPrimary} />
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Versión 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: colors.background,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.onPrimary,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: {
    color: colors.text.onPrimary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    margin: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    margin: 15,
    marginTop: 5,
    marginBottom: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoIcon: {
    marginRight: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    margin: 15,
    marginTop: 5,
  },
  logoutButtonText: {
    color: colors.text.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  versionContainer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    color: colors.text.light,
    fontSize: 12,
  }
});