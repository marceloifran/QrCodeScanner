import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  Alert
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
      // Obtener productos con stock bajo
      const q = query(
        collection(db, 'products'),
        where('userId', '==', auth.currentUser.uid),
        where('stock', '<=', 5)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Crear notificaciones a partir de productos con stock bajo
      const notificationsList = querySnapshot.docs.map(doc => {
        const product = doc.data();
        return {
          id: doc.id,
          title: 'Stock Bajo',
          message: `El producto "${product.name}" tiene un stock de ${product.stock} unidades.`,
          date: new Date(),
          type: 'low_stock',
          productId: doc.id
        };
      });
      
      // Filtrar notificaciones más antiguas de 24 horas
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const filteredNotifications = notificationsList.filter(
        notification => notification.date >= oneDayAgo
      );
      
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = (notification) => {
    // Navegar a la pantalla de edición del producto
    navigation.navigate('EditProduct', { productId: notification.productId });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.notificationItem}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons 
          name="alert-circle" 
          size={24} 
          color={colors.error} 
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationDate}>
          {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={60} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No hay notificaciones</Text>
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationIcon: {
    marginRight: 15,
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  notificationDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 10,
    textAlign: 'center',
  },
}); 