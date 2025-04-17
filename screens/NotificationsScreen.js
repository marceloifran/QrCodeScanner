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
import { collection, query, where, getDocs } from "firebase/firestore";
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
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Cargar notificaciones de stock bajo
      const productQuery = query(
        collection(db, "products"),
        where("userId", "==", auth.currentUser.uid)
      );
      const productSnapshot = await getDocs(productQuery);
      const lowStockNotifications = [];

      productSnapshot.docs.forEach((doc) => {
        const product = doc.data();
        const threshold = product.lowStockThreshold || 5;

        // Verificar stock bajo
        if (product.stock <= threshold) {
          lowStockNotifications.push({
            id: `stock_${doc.id}`,
            title: "Stock Bajo",
            message: `El producto "${product.name}" tiene un stock de ${product.stock} unidades (umbral: ${threshold}).`,
            date: new Date(),
            type: "low_stock",
            productId: doc.id,
            threshold: threshold,
            stock: product.stock,
          });
        }
      });

      // Cargar notificaciones de vencimiento de la colección productNotifications
      const notificationsQuery = query(
        collection(db, "productNotifications"),
        where("userId", "==", auth.currentUser.uid),
        where("notifyExpiry", "==", true)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const expirationNotifications = [];
      const currentDate = new Date();

      notificationsSnapshot.docs.forEach((doc) => {
        const notification = doc.data();
        if (notification.expiryDate) {
          // Convertir la fecha de vencimiento si es un timestamp de Firestore
          let expirationDate;
          if (notification.expiryDate.toDate) {
            expirationDate = notification.expiryDate.toDate();
          } else if (notification.expiryDate.seconds) {
            expirationDate = new Date(notification.expiryDate.seconds * 1000);
          } else {
            expirationDate = new Date(notification.expiryDate);
          }

          const daysUntilExpiration = Math.ceil(
            (expirationDate - currentDate) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiration <= 15) {
            expirationNotifications.push({
              id: doc.id,
              title: "Próximo a Vencer",
              message:
                daysUntilExpiration <= 0
                  ? `El producto "${notification.productName}" ha vencido.`
                  : `El producto "${notification.productName}" vencerá en ${daysUntilExpiration} días.`,
              date: notification.notificationCreated || new Date(),
              type: "expiration",
              productId: notification.productId,
              expirationDate: expirationDate,
              daysUntilExpiration,
            });
          }
        }
      });

      setNotifications({
        lowStock: lowStockNotifications.sort((a, b) => b.date - a.date),
        expiration: expirationNotifications.sort(
          (a, b) => a.daysUntilExpiration - b.daysUntilExpiration
        ),
      });
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
      Alert.alert("Error", "No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = (notification) => {
    navigation.navigate("EditProduct", { productId: notification.productId });
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
        <Text style={styles.notificationDate}>
          {item.date.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.arrowIcon}
        onPress={() => handleNotificationPress(item)}
      >
        <Ionicons name="chevron-forward" size={24} color="#666" />
      </TouchableOpacity>
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
