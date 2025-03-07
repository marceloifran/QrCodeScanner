import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadNotifications();
  }, []);
  
  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Obtener todos los productos del usuario
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const today = new Date();
      const notificationsList = [];
      
      // Verificar productos con bajo stock
      productsList.forEach(product => {
        if (product.stock <= 5) {
          notificationsList.push({
            id: `stock-${product.id}`,
            type: 'stock',
            product: product,
            message: `Quedan solo ${product.stock} unidades de ${product.name}`,
            icon: 'alert-circle'
          });
        }
        
        // Verificar productos próximos a vencer
        if (product.expiryDate) {
          const expiryDate = new Date(product.expiryDate.seconds * 1000);
          const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry <= 30 && daysToExpiry > 0) {
            notificationsList.push({
              id: `expiry-${product.id}`,
              type: 'expiry',
              product: product,
              message: `${product.name} vence en ${daysToExpiry} días`,
              daysToExpiry: daysToExpiry,
              icon: 'time'
            });
          } else if (daysToExpiry <= 0) {
            notificationsList.push({
              id: `expired-${product.id}`,
              type: 'expired',
              product: product,
              message: `${product.name} ha vencido`,
              icon: 'warning'
            });
          }
        }
      });
      
      // Ordenar notificaciones: primero vencidos, luego por vencer, luego bajo stock
      notificationsList.sort((a, b) => {
        if (a.type === 'expired' && b.type !== 'expired') return -1;
        if (a.type !== 'expired' && b.type === 'expired') return 1;
        if (a.type === 'expiry' && b.type === 'expiry') {
          return a.daysToExpiry - b.daysToExpiry;
        }
        return 0;
      });
      
      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getNotificationColor = (type) => {
    switch (type) {
      case 'expired':
        return colors.error;
      case 'expiry':
        return '#FF9800'; // Naranja
      case 'stock':
        return '#2196F3'; // Azul
      default:
        return colors.text.secondary;
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.notificationCard}
              onPress={() => navigation.navigate('EditProduct', { product: item.product })}
            >
              <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
                <Ionicons name={item.icon} size={24} color="white" />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationMessage}>{item.message}</Text>
                <Text style={styles.notificationDate}>
                  {item.type === 'expiry' ? 
                    `Fecha de vencimiento: ${new Date(item.product.expiryDate.seconds * 1000).toLocaleDateString()}` : 
                    `Stock actual: ${item.product.stock}`
                  }
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={60} color={colors.success} />
              <Text style={styles.emptyText}>No hay notificaciones</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadNotifications}
      >
        <Ionicons name="refresh" size={24} color="white" />
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
  listContainer: {
    padding: 10,
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 5,
  },
  notificationDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text.secondary,
    marginTop: 10,
  },
  refreshButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
}); 