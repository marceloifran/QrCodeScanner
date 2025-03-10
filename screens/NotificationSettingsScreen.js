import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Switch, 
  ActivityIndicator 
} from 'react-native';
import { collection, query, getDocs, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationSettingsScreen() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar productos
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar alfabéticamente
      productsList.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(productsList);
      
      // Cargar configuraciones
      const settingsDoc = await getDoc(doc(db, 'notificationSettings', auth.currentUser.uid));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data().productSettings || {});
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleNotification = async (productId) => {
    try {
      const newSettings = {
        ...settings,
        [productId]: !settings[productId]
      };
      
      setSettings(newSettings);
      
      // Guardar en Firestore
      await setDoc(doc(db, 'notificationSettings', auth.currentUser.uid), {
        productSettings: newSettings
      }, { merge: true });
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurar Notificaciones</Text>
        <Text style={styles.subtitle}>Activa o desactiva notificaciones por producto</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productDetails}>
                  Stock: {item.stock} | Precio: ${parseFloat(item.price).toFixed(2)}
                </Text>
              </View>
              <Switch
                value={settings[item.id] !== false} // Por defecto activadas
                onValueChange={() => toggleNotification(item.id)}
                trackColor={{ false: '#d3d3d3', true: colors.primary }}
              />
            </View>
          )}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="information-circle" size={50} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No hay productos registrados</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 5,
  },
  loader: {
    marginTop: 30,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 40,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 5,
  },
  productDetails: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 10,
    textAlign: 'center',
  },
}); 