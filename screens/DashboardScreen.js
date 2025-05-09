import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  SafeAreaView,
  Modal,
  Image,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { formatPrice } from "../utils/formatters";
import { getCategoriesForIndustry } from "../utils/categoryUtils";
import {
  isSubscriptionExpiringSoon,
  getRemainingDaysMessage,
} from "../constants/plans";
import { validateUserSubscription } from "../utils/subscriptionUtils";
import CacheService from "../utils/cacheService";

export default function DashboardScreen({ navigation }) {
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalSales: 0,
    totalIncome: 0,
    inventoryValue: 0,
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [subscriptionExpiring, setSubscriptionExpiring] = useState(false);
  const [expirationMessage, setExpirationMessage] = useState("");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [userPlan, setUserPlan] = useState("free");
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");

  useEffect(() => {
    loadDashboardData();
    checkNotifications();
    loadCategories();
    checkSubscriptionStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadDashboardData();
      checkNotifications();
      loadCategories();
      checkSubscriptionStatus();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const checkSubscriptionExpiration = async () => {
      try {
        if (!auth || !auth.currentUser) {
          console.log("No hay usuario autenticado para verificar expiración");
          return;
        }

        // Obtener información del usuario
        const userRef = doc(db, "businessInfo", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) return;

        const userData = userDoc.data();

        if (userData.subscription && userData.subscription.expirationDate) {
          const expirationDate = userData.subscription.expirationDate.seconds
            ? new Date(userData.subscription.expirationDate.seconds * 1000)
            : new Date(userData.subscription.expirationDate);

          const isExpiring = isSubscriptionExpiringSoon(expirationDate);
          setSubscriptionExpiring(isExpiring);

          if (isExpiring) {
            setExpirationMessage(getRemainingDaysMessage(expirationDate));
          }
        }
      } catch (error) {
        console.error("Error al verificar expiración de suscripción:", error);
      }
    };

    checkSubscriptionExpiration();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Verificar que el usuario esté autenticado
      if (!auth.currentUser || !auth.currentUser.uid) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const userId = auth.currentUser.uid;
      let productsData = [];
      let salesData = [];

      // Try to get data from cache first
      const useCache = !refreshing; // No usar caché si el usuario está haciendo un "pull to refresh"

      if (useCache) {
        // Intentar cargar productos desde caché
        const cachedProducts = await CacheService.getFromCache(
          "products",
          userId
        );
        if (cachedProducts) {
          productsData = cachedProducts;
        }

        // Intentar cargar ventas desde caché
        const cachedSales = await CacheService.getFromCache("sales", userId);
        if (cachedSales) {
          salesData = cachedSales;
        }
      }

      // Si no tenemos datos en caché, cargar desde Firestore
      if (productsData.length === 0) {
        // Cargar productos
        const productsQuery = query(
          collection(db, "products"),
          where("userId", "==", userId)
        );
        const productsSnapshot = await getDocs(productsQuery);
        productsData = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Guardar en caché para uso futuro
        if (productsData.length > 0) {
          await CacheService.saveToCache("products", productsData, userId);
        }
      }

      if (salesData.length === 0) {
        // Cargar ventas
        const salesQuery = query(
          collection(db, "sales"),
          where("userId", "==", userId)
        );
        const salesSnapshot = await getDocs(salesQuery);
        salesData = salesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate ? data.date.toDate() : new Date(),
            total: data.total || 0,
          };
        });

        // Guardar en caché para uso futuro
        if (salesData.length > 0) {
          await CacheService.saveToCache("sales", salesData, userId);
        }
      }

      // Contar productos totales
      const totalProducts = productsData ? productsData.length : 0;

      // Calcular valor total del inventario
      const inventoryValue = productsData
        ? productsData.reduce((total, product) => {
            const price = product.price || 0;
            const stock = product.stock || 0;
            return total + price * stock;
          }, 0)
        : 0;

      // Filtrar productos con stock bajo
      const lowStockData = productsData
        ? productsData.filter((product) => {
            const threshold = product.lowStockThreshold || 5;
            const stock = product.stock || 0;
            return stock <= threshold;
          })
        : [];

      // Contar productos con stock bajo
      const lowStockCount = lowStockData ? lowStockData.length : 0;

      // Contar productos por categoría
      const categoryCountsData = {};
      if (productsData && productsData.length > 0) {
        productsData.forEach((product) => {
          const category = product.category || "sin-categoria";
          categoryCountsData[category] =
            (categoryCountsData[category] || 0) + 1;
        });
      }

      setCategoryCounts(categoryCountsData || {});
      setLowStockProducts(
        lowStockData && lowStockData.length > 0 ? lowStockData.slice(0, 5) : []
      );

      // Ordenar ventas por fecha para mostrar las más recientes
      const sortedSales =
        salesData && salesData.length > 0
          ? [...salesData].sort((a, b) => b.date - a.date)
          : [];

      // Contar ventas totales (todas, no solo las recientes)
      const totalSales = salesData ? salesData.length : 0;

      // Calcular ingresos totales
      const totalIncome = salesData
        ? salesData.reduce((sum, sale) => sum + (sale.total || 0), 0)
        : 0;

      setRecentSales(
        sortedSales && sortedSales.length > 0 ? sortedSales.slice(0, 5) : []
      );

      // Actualizar estadísticas
      setStats({
        totalProducts: totalProducts || 0,
        lowStockCount: lowStockCount || 0,
        totalSales: totalSales || 0,
        totalIncome: totalIncome || 0,
        inventoryValue: inventoryValue || 0,
      });
    } catch (error) {
      console.error("Error al cargar datos del dashboard:", error);
      Alert.alert("Error", "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkNotifications = async () => {
    if (!auth.currentUser) return;

    try {
      const userId = auth.currentUser.uid;

      // Intentar usar productos cacheados primero
      let productsToCheck = [];
      const cachedProducts = await CacheService.getFromCache(
        "products",
        userId
      );

      if (cachedProducts && !refreshing) {
        // No usar caché durante refresh
        console.log("Usando productos en caché para notificaciones");
        productsToCheck = cachedProducts;
      } else {
        // Si no hay productos en caché, cargar desde Firestore
        console.log("Cargando productos desde Firestore para notificaciones");
        const productsQuery = query(
          collection(db, "products"),
          where("userId", "==", userId)
        );
        const productsSnapshot = await getDocs(productsQuery);
        productsToCheck = productsSnapshot.docs.map((doc) => doc.data());
      }

      // 1. Obtener productos con stock bajo usando umbral personalizado
      const lowStockProducts = productsToCheck.filter((product) => {
        const threshold = product.lowStockThreshold || 5;
        const stock = product.stock || 0;
        return stock <= threshold;
      });

      // 2. Obtener notificaciones de vencimiento
      let expirationNotifications = [];

      // Intentar usar caché para notificaciones de vencimiento
      const cachedExpirationNotifications = await CacheService.getFromCache(
        "expiryNotifications",
        userId
      );

      if (cachedExpirationNotifications && !refreshing) {
        console.log("Usando notificaciones de vencimiento en caché");
        expirationNotifications = cachedExpirationNotifications;
      } else {
        console.log("Cargando notificaciones de vencimiento desde Firestore");
        const notificationsQuery = query(
          collection(db, "productNotifications"),
          where("userId", "==", userId)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);

        const currentDate = new Date();
        expirationNotifications = [];

        for (const doc of notificationsSnapshot.docs) {
          const notification = doc.data();
          if (!notification.expiryDate || notification.notifyExpiry === false) {
            continue;
          }

          try {
            // Convertir la fecha de vencimiento
            let expirationDate;
            if (notification.expiryDate.toDate) {
              expirationDate = notification.expiryDate.toDate();
            } else if (notification.expiryDate.seconds) {
              expirationDate = new Date(notification.expiryDate.seconds * 1000);
            } else if (typeof notification.expiryDate === "string") {
              expirationDate = new Date(notification.expiryDate);
            } else {
              continue;
            }

            // Verificar que la fecha sea válida
            if (isNaN(expirationDate.getTime())) {
              continue;
            }

            const daysUntilExpiration = Math.ceil(
              (expirationDate - currentDate) / (1000 * 60 * 60 * 24)
            );

            // Incluir solo las que vencen en menos de 15 días
            if (daysUntilExpiration <= 15) {
              expirationNotifications.push(notification);
            }
          } catch (error) {
            console.error(
              "Error al procesar notificación de vencimiento:",
              error
            );
          }
        }

        // Guardar en caché para uso futuro
        if (expirationNotifications.length > 0) {
          await CacheService.saveToCache(
            "expiryNotifications",
            expirationNotifications,
            userId
          );
        }
      }

      // Actualizar contador con la suma de ambos tipos de notificaciones
      const totalNotifications =
        lowStockProducts.length + expirationNotifications.length;
      console.log(
        `Total notificaciones: ${totalNotifications} (${lowStockProducts.length} stock bajo, ${expirationNotifications.length} vencimiento)`
      );
      setNotificationCount(totalNotifications);
    } catch (error) {
      console.error("Error verificando notificaciones:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    checkNotifications();
  };

  const goToNewSale = () => {
    navigation.navigate("ScanProduct");
  };

  const goToScanStock = () => {
    navigation.navigate("ScanForStock");
  };

  const navigateToCategory = (categoryId) => {
    navigation.navigate("ProductList", {
      filter: "category",
      category: categoryId,
    });
  };

  const viewAllSales = () => {
    navigation.navigate("SalesHistory");
  };

  const viewLowStockProducts = () => {
    navigation.navigate("ProductList", { filter: "lowStock" });
  };

  const viewInventoryValue = () => {
    navigation.navigate("Products", {
      screen: "ProductList",
      params: { filter: "inventoryValue" },
    });
  };

  const renderNotificationBell = () => {
    return (
      <TouchableOpacity
        style={styles.notificationBell}
        onPress={() => navigation.navigate("Notifications")}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color={colors.primary}
        />
        {notificationCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{notificationCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const loadCategories = async () => {
    try {
      // Intentar cargar desde caché primero
      const cachedCategories = await CacheService.getFromCache(
        "categories",
        auth.currentUser.uid
      );

      if (cachedCategories) {
        setCategories(cachedCategories);
        return;
      }

      // Si no hay caché, cargar desde Firestore
      const businessInfoRef = doc(db, "businessInfo", auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);

      let userIndustry = "general";
      if (businessInfoDoc.exists()) {
        userIndustry = businessInfoDoc.data().industry || "general";
      }

      const industryCategories = getCategoriesForIndustry(userIndustry);

      // Guardar en caché
      if (industryCategories) {
        await CacheService.saveToCache(
          "categories",
          industryCategories,
          auth.currentUser.uid
        );
      }

      setCategories(industryCategories || []);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      setCategories(getCategoriesForIndustry("general") || []);
    }
  };

  const getCategoryColor = (categoryId) => {
    // Colores para diferentes categorías
    const colors = {
      general: "#4CAF50",
      offers: "#FF9800",
      new: "#2196F3",
      popular: "#F44336",
      shirts: "#9C27B0",
      pants: "#3F51B5",
      shoes: "#795548",
      accessories: "#607D8B",
      medications: "#00BCD4",
      vitamins: "#8BC34A",
      dairy: "#CDDC39",
      meat: "#FF5722",
      fruits: "#4CAF50",
      beverages: "#03A9F4",
      smartphones: "#E91E63",
      computers: "#9E9E9E",
      starters: "#FFC107",
      desserts: "#E91E63",
      bread: "#FF9800",
      tools: "#607D8B",
      skincare: "#00BCD4",
      makeup: "#9C27B0",
      fiction: "#3F51B5",
      nonfiction: "#795548",
    };

    return colors[categoryId] || "#4CAF50"; // Color por defecto
  };

  const getCategoryIcon = (categoryId) => {
    // Iconos para diferentes categorías
    const icons = {
      general: "pricetag-outline",
      offers: "flash-outline",
      new: "star-outline",
      popular: "trending-up-outline",
      shirts: "shirt-outline",
      pants: "browsers-outline",
      shoes: "footsteps-outline",
      accessories: "watch-outline",
      medications: "medkit-outline",
      vitamins: "fitness-outline",
      dairy: "water-outline",
      meat: "restaurant-outline",
      fruits: "nutrition-outline",
      beverages: "beer-outline",
      smartphones: "phone-portrait-outline",
      computers: "laptop-outline",
      starters: "pizza-outline",
      desserts: "ice-cream-outline",
      bread: "fast-food-outline",
      tools: "construct-outline",
      skincare: "color-fill-outline",
      makeup: "brush-outline",
      fiction: "book-outline",
      nonfiction: "newspaper-outline",
    };

    return icons[categoryId] || "pricetag-outline";
  };

  const formatSaleDate = (date) => {
    try {
      if (!date) return "";

      // Asegúrate de que date sea un objeto Date válido
      let dateObj;
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === "object" && date.seconds) {
        // Es un timestamp de Firestore en formato objeto { seconds, nanoseconds }
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === "string") {
        // Es una cadena de texto, intentar convertir
        dateObj = new Date(date);
      } else {
        return "Fecha inválida";
      }

      // Verificar que la fecha sea válida antes de intentar formatearla
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return "Fecha inválida";
      }

      const day = dateObj.getDate().toString().padStart(2, "0");
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const year = dateObj.getFullYear().toString().slice(2);
      const hours = dateObj.getHours().toString().padStart(2, "0");
      const minutes = dateObj.getMinutes().toString().padStart(2, "0");
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formateando fecha:", error, date);
      return "Error en fecha";
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      await checkSubscription();
    } catch (error) {
      console.error("Error en checkSubscriptionStatus:", error);
    }
  };

  const navigateToPlans = () => {
    setShowSubscriptionModal(false);
    navigation.navigate("SubscriptionPlans");
  };

  const checkSubscription = async () => {
    try {
      if (!auth || !auth.currentUser) {
        console.log("No hay usuario autenticado para verificar suscripción");
        return;
      }

      // Obtener datos del usuario desde Firestore
      const userRef = doc(db, "businessInfo", auth.currentUser.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) return;

      const userData = userSnapshot.data();
      const result = await validateUserSubscription(auth.currentUser.uid);

      // Si el usuario está en el plan gratuito (free), no mostrar ninguna alerta
      if (result.planId === "free") {
        setUserPlan("free");
        return;
      }

      // Para otros planes, actualizar el plan del usuario en el estado
      setUserPlan(result.planId);

      // Si hay una fecha de expiración y está próxima a vencer, mostrar alerta
      if (result.expirationDate) {
        // Convertir la fecha de expiración a un objeto Date si es necesario
        let expirationDate;
        if (result.expirationDate instanceof Date) {
          expirationDate = result.expirationDate;
        } else if (result.expirationDate.seconds) {
          expirationDate = new Date(result.expirationDate.seconds * 1000);
        } else if (typeof result.expirationDate === "string") {
          expirationDate = new Date(result.expirationDate);
        }

        if (expirationDate && !isNaN(expirationDate.getTime())) {
          const now = new Date();
          const diffTime = expirationDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 5 && diffDays > 0) {
            setWarningModalVisible(true);
            setSubscriptionMessage(
              `Tu suscripción vence en ${diffDays} días. Renuévala para seguir utilizando la aplicación.`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error al verificar la suscripción:", error);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Modal de Suscripción Requerida */}
      <Modal
        visible={showSubscriptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          // No permitimos cerrar el modal si necesita suscripción
          if (!needsSubscription) {
            setShowSubscriptionModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="alert-circle-outline"
              size={60}
              color={colors.primary}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Suscripción Requerida</Text>
            <Text style={styles.modalText}>
              Necesitas seleccionar un plan para utilizar la aplicación. Los
              planes se diferencian por la cantidad de productos que puedes
              gestionar.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={navigateToPlans}
            >
              <Text style={styles.modalButtonText}>Ver Planes Disponibles</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Alerta de suscripción por expirar */}
        {subscriptionExpiring && (
          <TouchableOpacity
            style={styles.expirationAlert}
            onPress={() => navigation.navigate("SubscriptionPlans")}
          >
            <Ionicons name="alert-circle-outline" size={24} color="#fff" />
            <Text style={styles.expirationAlertText}>{expirationMessage}</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Valor de inventario */}
        <TouchableOpacity style={styles.valueCard} onPress={viewInventoryValue}>
          <Text style={styles.valueLabel}>Valor de Inventario</Text>
          <View style={styles.valueContent}>
            <Text style={styles.valueAmount}>
              {formatPrice(stats.inventoryValue)}
            </Text>
            <View style={styles.valueIconContainer}>
              <Ionicons name="cash-outline" size={20} color="#4CAF50" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Ingresos totales */}
        <TouchableOpacity style={styles.valueCard} onPress={viewAllSales}>
          <Text style={styles.valueLabel}>Ingresos Totales</Text>
          <View style={styles.valueContent}>
            <Text style={styles.valueAmount}>
              {formatPrice(stats.totalIncome)}
            </Text>
            <View style={styles.valueIconContainer}>
              <Ionicons name="trending-up-outline" size={20} color="#2196F3" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Categorías */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ProductList")}
            >
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesContainer}>
            {categories
              .filter((cat) => categoryCounts[cat.id] > 0)
              .sort(
                (a, b) =>
                  (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0)
              )
              .slice(0, 3)
              .map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => navigateToCategory(category.id)}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: getCategoryColor(category.id) },
                    ]}
                  >
                    <Text style={styles.categoryIconText}>
                      {categoryCounts[category.id] || 0}
                    </Text>
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Ventas Recientes */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ventas Recientes</Text>
            <TouchableOpacity onPress={viewAllSales}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {recentSales && recentSales.length > 0 ? (
            <View style={styles.salesContainer}>
              {recentSales.slice(0, 2).map((sale) => (
                <TouchableOpacity
                  key={sale.id}
                  style={styles.saleCard}
                  onPress={() =>
                    navigation.navigate("SaleDetails", { saleId: sale.id })
                  }
                >
                  <Text style={styles.saleDate}>
                    {formatSaleDate(sale.date)}
                  </Text>
                  <Text style={styles.saleItems}>
                    {sale.items
                      ? `${sale.items.length} productos`
                      : "1 productos"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay ventas recientes</Text>
            </View>
          )}
        </View>

        {/* Productos con Stock Bajo */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Productos con Stock Bajo</Text>
              {stats.lowStockCount > 0}
            </View>
            <TouchableOpacity onPress={viewLowStockProducts}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {lowStockProducts && lowStockProducts.length > 0 ? (
            <View style={styles.lowStockContainer}>
              {lowStockProducts.slice(0, 3).map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.lowStockCard}
                  onPress={() =>
                    navigation.navigate("EditProduct", {
                      productId: product.id,
                    })
                  }
                >
                  <View style={styles.lowStockInfo}>
                    <Text style={styles.lowStockName}>{product.name}</Text>
                    <View style={styles.stockIndicatorContainer}>
                      <View
                        style={[
                          styles.stockIndicator,
                          { backgroundColor: "#ffebee" },
                        ]}
                      />
                      <Text style={styles.lowStockText}>
                        Stock: {product.stock}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay productos con stock bajo
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.floatingButtonsContainer}>
        <TouchableOpacity
          style={[styles.floatingButton, styles.newSaleButton]}
          onPress={goToNewSale}
        >
          <Ionicons name="cart-outline" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Nueva Venta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatingButton, styles.scanStockButton]}
          onPress={goToScanStock}
        >
          <Ionicons name="barcode-outline" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Escanear Stock</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  notificationContainer: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  notificationButton: {
    position: "relative",
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: 10,
    color: colors.text.secondary,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100, // Espacio para los botones flotantes
  },
  valueCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  valueLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  valueContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  valueIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  seeAllText: {
    color: colors.primary,
    fontWeight: "500",
  },
  categoriesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryCard: {
    alignItems: "center",
    width: "31%",
  },
  categoryIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIconText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  salesContainer: {
    gap: 12,
  },
  saleCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 12,
  },
  saleDate: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
    marginBottom: 4,
  },
  saleItems: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyText: {
    textAlign: "center",
    color: colors.text.secondary,
    fontSize: 14,
  },
  lowStockContainer: {
    gap: 8,
  },
  lowStockCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 10,
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
    marginBottom: 4,
  },
  stockIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: "#f44336",
  },
  lowStockText: {
    fontSize: 13,
    color: "#f44336",
  },
  floatingButtonsContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  floatingButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  newSaleButton: {
    backgroundColor: colors.primary,
  },
  scanStockButton: {
    backgroundColor: "#2196f3",
  },
  floatingButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionBadge: {
    backgroundColor: "red",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sectionBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  expirationAlert: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expirationAlertText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "85%",
    alignItems: "center",
  },
  modalIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "100%",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  badgeContainer: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "red",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});
