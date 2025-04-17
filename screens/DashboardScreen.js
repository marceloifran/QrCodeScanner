import React, { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { formatPrice } from "../utils/formatters";
import { getCategoriesForIndustry } from "../utils/categoryUtils";
import Svg, { Circle } from "react-native-svg";

// Componente para gráfico circular simple
const PieChart = ({ data, size = 150, strokeWidth = 25, chartColors }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  let currentAngle = 0;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {data.map((item, index) => {
          if (item.value === 0) return null;

          const percentage = item.value / total;
          const strokeDasharray = `${circumference * percentage} ${
            circumference * (1 - percentage)
          }`;
          const rotateAngle = currentAngle;
          currentAngle += percentage * 360;

          return (
            <View
              key={index}
              style={{
                position: "absolute",
                width: size,
                height: size,
                transform: [{ rotate: `${rotateAngle}deg` }],
              }}
            >
              <Svg width={size} height={size}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={
                    item.color ||
                    (chartColors
                      ? chartColors[index % chartColors.length]
                      : `hsl(${index * 45}, 70%, 60%)`)
                  }
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={circumference * 0.25}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </Svg>
            </View>
          );
        })}
        <View
          style={{
            position: "absolute",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: colors.text.primary,
            }}
          >
            {total}
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.secondary }}>
            Total
          </Text>
        </View>
      </View>
    </View>
  );
};

// Componente para la leyenda del gráfico
const ChartLegend = ({ data, chartColors }) => {
  return (
    <View style={{ marginTop: 15 }}>
      {data.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor:
                item.color ||
                (chartColors
                  ? chartColors[index % chartColors.length]
                  : `hsl(${index * 45}, 70%, 60%)`),
              marginRight: 8,
            }}
          />
          <Text style={{ flex: 1, fontSize: 12, color: colors.text.primary }}>
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.text.primary,
            }}
          >
            {item.value} (
            {(
              (item.value / data.reduce((sum, d) => sum + d.value, 0)) *
              100
            ).toFixed(0)}
            %)
          </Text>
        </View>
      ))}
    </View>
  );
};

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

  useEffect(() => {
    loadDashboardData();
    checkNotifications();
    loadCategories();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadDashboardData();
      checkNotifications();
      loadCategories();
    });

    return unsubscribe;
  }, [navigation]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Verificar que el usuario esté autenticado
      if (!auth.currentUser || !auth.currentUser.uid) {
        console.log("Usuario no autenticado");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Cargar productos
      const productsQuery = query(
        collection(db, "products"),
        where("userId", "==", auth.currentUser.uid)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

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

      // Cargar ventas
      const salesQuery = query(
        collection(db, "sales"),
        where("userId", "==", auth.currentUser.uid)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const allSalesData = salesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(),
          total: data.total || 0,
        };
      });

      // Ordenar ventas por fecha para mostrar las más recientes
      const sortedSales =
        allSalesData && allSalesData.length > 0
          ? [...allSalesData].sort((a, b) => b.date - a.date)
          : [];

      // Contar ventas totales (todas, no solo las recientes)
      const totalSales = allSalesData ? allSalesData.length : 0;

      // Calcular ingresos totales
      const totalIncome = allSalesData
        ? allSalesData.reduce((sum, sale) => sum + (sale.total || 0), 0)
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
      // Obtener productos con stock bajo usando umbral personalizado
      const q = query(
        collection(db, "products"),
        where("userId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);

      // Filtrar usando el umbral personalizado de cada producto
      const lowStockProducts = querySnapshot.docs.filter((doc) => {
        const product = doc.data();
        const threshold = product.lowStockThreshold || 5;
        const stock = product.stock || 0;
        return stock <= threshold;
      });

      setNotificationCount(lowStockProducts.length);
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
      // Cargar la industria del usuario
      const businessInfoRef = doc(db, "businessInfo", auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);

      let userIndustry = "general";
      if (businessInfoDoc.exists()) {
        const data = businessInfoDoc.data();
        if (data && "industry" in data && data.industry) {
          userIndustry = data.industry;
        }
      }

      // Obtener categorías directamente de categoryUtils
      const industryCategories = getCategoriesForIndustry(userIndustry);
      setCategories(industryCategories);
    } catch (error) {
      console.error("Error al cargar la industria:", error);
      // En caso de error, usar categorías generales
      const defaultCategories = getCategoriesForIndustry("general");
      setCategories(defaultCategories);
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
        {/* Tarjetas de valor de inventario e ingresos totales */}
        <View style={styles.valueCardsContainer}>
          <TouchableOpacity
            style={styles.valueCard}
            onPress={viewInventoryValue}
          >
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueLabel}>Valor de Inventario</Text>
              <Text style={styles.valueNumber}>
                {formatPrice(stats.inventoryValue)}
              </Text>
            </View>
            <View
              style={[
                styles.valueIconContainer,
                { backgroundColor: "#e8f5e9" },
              ]}
            >
              <Ionicons name="cash-outline" size={24} color="#28a745" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.valueCard} onPress={viewAllSales}>
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueLabel}>Ingresos Totales</Text>
              <Text style={styles.valueNumber}>
                {formatPrice(stats.totalIncome)}
              </Text>
            </View>
            <View
              style={[
                styles.valueIconContainer,
                { backgroundColor: "#e3f2fd" },
              ]}
            >
              <Ionicons name="trending-up-outline" size={24} color="#2196f3" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sección de categorías con gráfico circular */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons
                name="pie-chart-outline"
                size={20}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>
                Distribución por Categorías
              </Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {categories &&
            categories.length > 0 &&
            Object.keys(categoryCounts).length > 0 ? (
              <>
                <View style={styles.chartRow}>
                  <PieChart
                    data={categories
                      .filter((cat) => categoryCounts[cat.id] > 0)
                      .map((category, index) => ({
                        name: category.name,
                        value: categoryCounts[category.id] || 0,
                        color: getCategoryColor(category.id),
                      }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 5)}
                    chartColors={[
                      "#4CAF50",
                      "#2196F3",
                      "#FFC107",
                      "#9C27B0",
                      "#F44336",
                    ]}
                    size={150}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.chartTitle}>Top 5 Categorías</Text>
                    <ChartLegend
                      data={categories
                        .filter((cat) => categoryCounts[cat.id] > 0)
                        .map((category) => ({
                          name: category.name,
                          value: categoryCounts[category.id] || 0,
                          color: getCategoryColor(category.id),
                        }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 5)}
                      chartColors={[
                        "#4CAF50",
                        "#2196F3",
                        "#FFC107",
                        "#9C27B0",
                        "#F44336",
                      ]}
                    />
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="pie-chart-outline" size={40} color="#e0e0e0" />
                <Text style={styles.emptyText}>No hay datos suficientes</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sección de estado de inventario */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Estado del Inventario</Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {stats.totalProducts > 0 ? (
              <View style={styles.chartRow}>
                <PieChart
                  data={[
                    {
                      name: "Stock Normal",
                      value: stats.totalProducts - stats.lowStockCount,
                      color: "#4CAF50",
                    },
                    {
                      name: "Stock Bajo",
                      value: stats.lowStockCount,
                      color: "#FF9800",
                    },
                  ]}
                  size={150}
                  chartColors={["#4CAF50", "#FF9800"]}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.chartTitle}>Estado de Productos</Text>
                  <ChartLegend
                    data={[
                      {
                        name: "Stock Normal",
                        value: stats.totalProducts - stats.lowStockCount,
                        color: "#4CAF50",
                      },
                      {
                        name: "Stock Bajo",
                        value: stats.lowStockCount,
                        color: "#FF9800",
                      },
                    ]}
                    chartColors={["#4CAF50", "#FF9800"]}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="stats-chart-outline"
                  size={40}
                  color="#e0e0e0"
                />
                <Text style={styles.emptyText}>No hay datos suficientes</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sección de productos con stock bajo */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Productos con Stock Bajo</Text>
            </View>
            <TouchableOpacity onPress={viewLowStockProducts}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {lowStockProducts && lowStockProducts.length > 0 ? (
            lowStockProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.lowStockItem}
                onPress={() =>
                  navigation.navigate("EditProduct", { productId: product.id })
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
                    <Text style={styles.lowStockStock}>
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
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={40}
                color="#e0e0e0"
              />
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
    paddingTop: 16,
    paddingBottom: 100, // Espacio para los botones flotantes
  },
  valueCardsContainer: {
    flexDirection: "column",
    marginBottom: 16,
    gap: 12,
  },
  valueCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueTextContainer: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  valueNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  valueIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  sectionCard: {
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
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  seeAllText: {
    color: colors.primary,
    fontWeight: "500",
    fontSize: 14,
  },
  chartContainer: {
    marginTop: 10,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 10,
  },
  saleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  saleInfo: {
    flex: 1,
  },
  saleDate: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
    fontWeight: "500",
  },
  saleItems: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  saleTotalContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginRight: 8,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyText: {
    textAlign: "center",
    color: colors.text.secondary,
    marginTop: 12,
    fontSize: 14,
  },
  lowStockItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 12,
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
    marginBottom: 6,
  },
  stockIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  lowStockStock: {
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
});
