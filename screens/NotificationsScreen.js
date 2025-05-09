import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { colors } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState({
    lowStock: [],
    expiration: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lowStock");

  useEffect(() => {
    loadNotifications();

    // Agregar un listener para cuando la pantalla vuelva a estar activa
    const unsubscribe = navigation.addListener("focus", () => {
      // Cuando volvemos a esta pantalla, recargamos las notificaciones
      loadNotifications();
    });
    
    // Configurar un timer para actualizar las notificaciones cada minuto
    // para mantener actualizado el cálculo de días restantes
    const timer = setInterval(() => {
      if (activeTab === "expiration") {
        loadNotifications();
      }
    }, 60000); // Actualiza cada minuto

    // Limpiar el listener y el timer cuando se desmonte el componente
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [navigation, activeTab]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      console.log("Cargando notificaciones...");

      // Cargar todos los productos para verificar stock bajo y fechas de vencimiento
      const productQuery = query(
        collection(db, "products"),
        where("userId", "==", auth.currentUser.uid)
      );
      const productSnapshot = await getDocs(productQuery);
      const lowStockNotifications = [];
      const currentDate = new Date();
      
      // Notificaciones de expiración generadas dinámicamente desde productos
      const expirationNotifications = [];
      const createdNotifications = [];

      // Primero procesamos cada producto para stock bajo y para crear notificaciones de vencimiento si es necesario
      for (const docSnap of productSnapshot.docs) {
        const product = docSnap.data();
        const productId = docSnap.id;
        
        // Verificar stock bajo
        const threshold = product.lowStockThreshold || 5;
        if (product.stock <= threshold) {
          lowStockNotifications.push({
            id: `stock_${productId}`,
            title: "Stock Bajo",
            message: `El producto "${product.name}" tiene un stock de ${product.stock} unidades (umbral: ${threshold}).`,
            date: new Date(),
            type: "low_stock",
            productId: productId,
            threshold: threshold,
            stock: product.stock,
          });
        }
        
        // Verificar si el producto tiene fecha de vencimiento
        if (product.expiryDate) {
          let expiryDate;
          try {
            // Convertir la fecha de vencimiento a un objeto Date
            if (product.expiryDate.toDate) {
              expiryDate = product.expiryDate.toDate();
            } else if (product.expiryDate.seconds) {
              expiryDate = new Date(product.expiryDate.seconds * 1000);
            } else if (typeof product.expiryDate === "string") {
              expiryDate = new Date(product.expiryDate);
            }
            
            // Si la fecha es válida, calcular días hasta vencimiento
            if (expiryDate && !isNaN(expiryDate.getTime())) {
              const daysUntilExpiration = Math.ceil(
                (expiryDate - currentDate) / (1000 * 60 * 60 * 24)
              );
              
              // Si está próximo a vencer (15 días o menos), crear o verificar notificación
              if (daysUntilExpiration <= 15) {
                // Crear notificación para listar en la pantalla
                expirationNotifications.push({
                  id: `expiry_${productId}`,
                  title: "Próximo a Vencer",
                  message: daysUntilExpiration <= 0
                    ? `El producto "${product.name}" ha vencido.`
                    : `El producto "${product.name}" vencerá en ${daysUntilExpiration} días.`,
                  date: new Date(),
                  type: "expiration",
                  productId: productId,
                  productName: product.name,
                  expirationDate: expiryDate,
                  daysUntilExpiration,
                });
                
                // También crear o verificar la notificación persistente en Firestore
                const notificationId = `expiry_${productId}`;
                const notificationData = {
                  productId: productId,
                  productName: product.name,
                  expiryDate: product.expiryDate,
                  notifyExpiry: true,
                  notificationCreated: new Date(),
                  userId: auth.currentUser.uid,
                };
                
                createdNotifications.push({
                  id: notificationId,
                  data: notificationData
                });
              }
            }
          } catch (error) {
            console.error(`Error procesando fecha de vencimiento para producto ${productId}:`, error);
          }
        }
      }
      
      // Ahora, guardar en Firestore las notificaciones que se crearon dinámicamente
      const saveTasks = createdNotifications.map(notification => 
        setDoc(doc(db, "productNotifications", notification.id), notification.data)
      );
      
      if (saveTasks.length > 0) {
        console.log(`Guardando/actualizando ${saveTasks.length} notificaciones de vencimiento`);
        await Promise.all(saveTasks);
      }

      // Cargar notificaciones existentes de la colección productNotifications
      // (esto es para casos donde la notificación tiene datos adicionales o históricos)
      const notificationsQuery = query(
        collection(db, "productNotifications"),
        where("userId", "==", auth.currentUser.uid)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const deleteTasks = [];
      
      // Procesar las notificaciones existentes en Firestore
      notificationsSnapshot.docs.forEach((doc) => {
        const notification = doc.data();
        const notificationId = doc.id;
        
        // Verificar que sea una notificación de vencimiento
        if (!notification.expiryDate || notification.notifyExpiry === false) {
          // Si la notificación no tiene fecha de vencimiento o notifyExpiry es false,
          // programamos su eliminación
          deleteTasks.push(deleteDoc(doc.ref));
          return;
        }
        
        // Verificar si ya tenemos esta notificación en la lista generada dinámicamente
        const alreadyProcessed = expirationNotifications.some(n => n.id === notificationId);
        
        if (!alreadyProcessed) {
          try {
            // Convertir la fecha de vencimiento si es un timestamp de Firestore
            let expirationDate;
            if (notification.expiryDate.toDate) {
              expirationDate = notification.expiryDate.toDate();
            } else if (notification.expiryDate.seconds) {
              expirationDate = new Date(notification.expiryDate.seconds * 1000);
            } else if (typeof notification.expiryDate === "string") {
              expirationDate = new Date(notification.expiryDate);
            } else {
              console.warn(
                "Formato de fecha de vencimiento no reconocido:",
                notification.expiryDate
              );
              // Programar eliminación de notificación inválida
              deleteTasks.push(deleteDoc(doc.ref));
              return;
            }

            // Verificar que la fecha sea válida
            if (isNaN(expirationDate.getTime())) {
              console.warn(
                "Fecha de vencimiento inválida:",
                notification.expiryDate
              );
              // Programar eliminación de notificación inválida
              deleteTasks.push(deleteDoc(doc.ref));
              return;
            }

            // Calcular días restantes basado en la fecha actual
            const daysUntilExpiration = Math.ceil(
              (expirationDate - currentDate) / (1000 * 60 * 60 * 24)
            );

            // Asegurar que la fecha de notificación sea válida
            let notificationDate;
            if (notification.notificationCreated) {
              if (notification.notificationCreated.toDate) {
                notificationDate = notification.notificationCreated.toDate();
              } else if (notification.notificationCreated.seconds) {
                notificationDate = new Date(
                  notification.notificationCreated.seconds * 1000
                );
              } else if (notification.notificationCreated instanceof Date) {
                notificationDate = notification.notificationCreated;
              } else {
                notificationDate = new Date();
              }
            } else {
              notificationDate = new Date();
            }

            // Solo mostrar notificaciones para productos que vencen en menos de 15 días
            if (daysUntilExpiration <= 15) {
              // Verificar si el producto aún existe
              const productDoc = productSnapshot.docs.find(
                (p) => p.id === notification.productId
              );
              
              if (productDoc) {
                // Si el producto existe, añadir a la lista si no está ya
                expirationNotifications.push({
                  id: doc.id,
                  title: "Próximo a Vencer",
                  message:
                    daysUntilExpiration <= 0
                      ? `El producto "${notification.productName}" ha vencido.`
                      : `El producto "${notification.productName}" vencerá en ${daysUntilExpiration} días.`,
                  date: notificationDate,
                  type: "expiration",
                  productId: notification.productId,
                  expirationDate: expirationDate,
                  daysUntilExpiration,
                });
              } else {
                // Si el producto ya no existe, eliminar la notificación
                deleteTasks.push(deleteDoc(doc.ref));
              }
            } else {
              // Si ya no está dentro del rango de notificación, programar eliminación
              console.log(
                `Eliminando notificación fuera de rango: ${daysUntilExpiration} días`
              );
              deleteTasks.push(deleteDoc(doc.ref));
            }
          } catch (error) {
            console.error("Error procesando notificación:", error, notification);
            // En caso de error, programar eliminación de notificación problemática
            deleteTasks.push(deleteDoc(doc.ref));
          }
        }
      });

      // Ejecutar todas las eliminaciones de notificaciones obsoletas o inválidas
      if (deleteTasks.length > 0) {
        console.log(
          `Eliminando ${deleteTasks.length} notificaciones obsoletas o inválidas`
        );
        await Promise.all(deleteTasks);
      }

      // Ordenar por fecha (las más recientes primero para stock bajo)
      const sortedLowStock = lowStockNotifications.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date();
        const dateB = b.date instanceof Date ? b.date : new Date();
        return dateB - dateA;
      });

      // Ordenar por días hasta vencimiento (los más próximos primero)
      const sortedExpiration = expirationNotifications.sort(
        (a, b) => a.daysUntilExpiration - b.daysUntilExpiration
      );

      setNotifications({
        lowStock: sortedLowStock,
        expiration: sortedExpiration,
      });

      console.log(
        `Cargadas ${sortedLowStock.length} notificaciones de stock bajo y ${sortedExpiration.length} de vencimiento`
      );
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
      Alert.alert("Error", "No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = (notification) => {
    if (notification.type === "expiration") {
      // Para notificaciones de vencimiento, navegar a pantalla de edición especializada
      navigation.navigate("EditExpiryDate", {
        productId: notification.productId,
        productName: notification.message.split('"')[1], // Extraer nombre del producto
        expiryDate: notification.expirationDate,
      });
    } else {
      // Para otras notificaciones (stock bajo), ir a edición normal
      navigation.navigate("EditProduct", { productId: notification.productId });
    }
  };

  const handleDeleteNotification = async (notification) => {
    try {
      if (notification.type === "expiration") {
        // Para notificaciones de vencimiento, eliminar la notificación
        const notificationId = notification.id;
        await deleteDoc(doc(db, "productNotifications", notificationId));

        // Actualizar la lista de notificaciones localmente
        setNotifications((prev) => ({
          ...prev,
          expiration: prev.expiration.filter(
            (item) => item.id !== notification.id
          ),
        }));

        Alert.alert("Éxito", "La notificación ha sido eliminada");
      }
    } catch (error) {
      console.error("Error al eliminar notificación:", error);
      Alert.alert("Error", "No se pudo eliminar la notificación");
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={
            item.type === "low_stock" ? "alert-circle-outline" : "time-outline"
          }
          size={24}
          color={item.type === "low_stock" ? colors.warning : colors.danger}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text
          style={[
            styles.notificationTitle,
            {
              color: item.type === "low_stock" ? colors.warning : colors.danger,
            },
          ]}
        >
          {item.title}
        </Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationDate}>{formatDate(item.date)}</Text>
      </View>

      <View style={styles.actionButtons}>
        {item.type === "expiration" && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNotification(item)}
          >
            <Ionicons name="close-circle" size={22} color="#ff6b6b" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.arrowIcon}
          onPress={() => handleNotificationPress(item)}
        >
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={
          activeTab === "lowStock" ? "checkmark-circle-outline" : "time-outline"
        }
        size={48}
        color="#666"
      />
      <Text style={styles.emptyText}>
        {activeTab === "lowStock"
          ? "No hay productos con stock bajo"
          : "No hay productos próximos a vencer"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "lowStock" && styles.activeTab]}
          onPress={() => setActiveTab("lowStock")}
        >
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={activeTab === "lowStock" ? colors.primary : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "lowStock" && styles.activeTabText,
            ]}
          >
            Stock Bajo
          </Text>
          {notifications.lowStock.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notifications.lowStock.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "expiration" && styles.activeTab]}
          onPress={() => setActiveTab("expiration")}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={activeTab === "expiration" ? colors.primary : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "expiration" && styles.activeTabText,
            ]}
          >
            Vencimientos
          </Text>
          {notifications.expiration.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>
                {notifications.expiration.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={
            activeTab === "lowStock"
              ? notifications.lowStock
              : notifications.expiration
          }
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
          onRefresh={loadNotifications}
          refreshing={loading}
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  activeTab: {
    backgroundColor: `${colors.primary}15`,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: colors.primary,
  },
  badge: {
    backgroundColor: colors.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  notificationIcon: {
    marginRight: 12,
    justifyContent: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 12,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    padding: 5,
    marginRight: 5,
  },
  arrowIcon: {
    justifyContent: "center",
    paddingLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

// Añadir esta función para formatear fechas de manera segura
const formatDate = (dateValue) => {
  try {
    if (!dateValue) return "Fecha no disponible";

    let date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (dateValue.toDate) {
      // Es un timestamp de Firestore
      date = dateValue.toDate();
    } else if (dateValue.seconds) {
      // Es un timestamp en formato objeto { seconds, nanoseconds }
      date = new Date(dateValue.seconds * 1000);
    } else if (typeof dateValue === "string") {
      date = new Date(dateValue);
    } else {
      return "Fecha inválida";
    }

    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", error, dateValue);
    return "Error en fecha";
  }
};
