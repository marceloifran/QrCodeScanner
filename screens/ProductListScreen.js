import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { formatPrice } from "../utils/formatters";
import { useProducts } from "../hooks/useProducts";
import { getCategoriesForIndustry } from "../utils/categoryUtils";
import CacheService from "../utils/cacheService";
import { Feather } from "@expo/vector-icons";

// Función para obtener el nombre de la categoría a partir del ID
const getCategoryName = (categoryId, categories) => {
  const category = categories.find((cat) => cat.id === categoryId);
  return category ? category.name : "Sin categoría";
};

export default function ProductListScreen({ navigation, route }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [zeroStockFilter, setZeroStockFilter] = useState(false);
  const [expiryFilter, setExpiryFilter] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [categories, setCategories] = useState([]);
  const [industryType, setIndustryType] = useState("general");
  const [loadError, setLoadError] = useState(false);

  const { products, loading, loadProducts, refreshProducts, refreshing } =
    useProducts();

  const isSelecting = route.params?.isSelecting || false;
  const { filter, category } = route.params || {};

  // Definir la función loadCategories dentro del componente
  const loadCategories = async () => {
    try {
      setLoadError(false);
      // Primero intentamos cargar la industria del usuario
      const businessInfoRef = doc(db, "businessInfo", auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);

      let userIndustry = "general";
      if (businessInfoDoc.exists()) {
        userIndustry = businessInfoDoc.data().industry || "general";
        setIndustryType(userIndustry);
      }

      // Obtenemos las categorías directamente de categoryUtils
      const industryCategories = getCategoriesForIndustry(userIndustry);
      setCategories(industryCategories || []);

      // Resetear el filtro de categoría si la categoría seleccionada ya no existe
      if (selectedCategory) {
        const categoryExists =
          industryCategories &&
          industryCategories.some((cat) => cat.id === selectedCategory);
        if (!categoryExists) {
          setSelectedCategory(null);
        }
      }
    } catch (error) {
      console.error("Error al cargar la industria:", error);
      setLoadError(true);
      // En caso de error, usar categorías generales
      const defaultCategories = getCategoriesForIndustry("general");
      setCategories(defaultCategories || []);
    }
  };

  useEffect(() => {
    loadCategories();

    // Añadir un listener para cuando la pantalla recibe el foco
    const unsubscribe = navigation.addListener("focus", () => {
      loadCategories();
      refreshProducts(); // Refrescar los productos al volver a la pantalla
    });

    // Limpiar el listener cuando el componente se desmonta
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Verificar si hay parámetros de navegación para filtros
    if (route.params) {
      // Filtro de stock bajo
      if (route.params.filter === "lowStock") {
        setLowStockFilter(true);
        setSelectedCategory(null);
      }
      //Filtro de stock 0
      if (route.params.filter === "zeroStock") {
        setZeroStockFilter(true);
        setSelectedCategory(null);
      }

      // Filtro por categoría
      if (route.params.filter === "category" && route.params.category) {
        setSelectedCategory(route.params.category);
        setLowStockFilter(false);
      }
    }

    loadProducts();
  }, [route.params]);

  useEffect(() => {
    if (products.length > 0) {
    }
  }, [products]);

  useEffect(() => {
    // Verificar qué categorías tienen productos
    if (products.length > 0) {
      // Agrupar productos por categoría
      const productsByCategory = {};
      products.forEach((p) => {
        if (p.category) {
          if (!productsByCategory[p.category]) {
            productsByCategory[p.category] = [];
          }
          productsByCategory[p.category].push(p.name);
        }
      });
    }
  }, [products]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoadError(true);
      }
    }, 10000); // 10 segundos de timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products
      .filter((product) => {
        // Buscar por nombre
        if (
          searchQuery &&
          !product.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Filtro de stock bajo
        if (lowStockFilter) {
          const threshold = product.lowStockThreshold || 5;
          if (product.stock > threshold) {
            return false;
          }
        }

        // Filtro de stock cero
        if (zeroStockFilter && product.stock > 0) {
          return false;
        }

        // Filtro de productos por vencer (dentro de 15 días)
        if (expiryFilter) {
          if (!product.expiryDate) {
            return false;
          }
          
          const expiryDate = new Date(
            product.expiryDate.seconds ? product.expiryDate.seconds * 1000 :
            product.expiryDate.toDate ? product.expiryDate.toDate() : product.expiryDate
          );
          
          const today = new Date();
          const diffTime = expiryDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 15 || diffDays < 0) {
            return false;
          }

          // Si hay una categoría seleccionada, también filtramos por esa categoría
          if (selectedCategory && product.category !== selectedCategory) {
            return false;
          }
          
          return true; // Si pasa el filtro de vencimiento, mostramos el producto
        }

        // Filtro por categoría (solo si no estamos filtrando por vencimiento)
        if (selectedCategory) {
          return product.category === selectedCategory;
        }

        return true;
      })
      .sort((a, b) => {
        // Ordenamiento
        let result = 0;

        if (sortBy === "name") {
          result = a.name.localeCompare(b.name);
        } else if (sortBy === "price") {
          result = parseFloat(a.price) - parseFloat(b.price);
        } else if (sortBy === "stock") {
          result = parseInt(a.stock) - parseInt(b.stock);
        } else if (sortBy === "expiryDate") {
          // Ordenar por fecha de vencimiento (más próximos primero)
          const dateA = a.expiryDate ? new Date(
            a.expiryDate.seconds ? a.expiryDate.seconds * 1000 :
            a.expiryDate.toDate ? a.expiryDate.toDate() : a.expiryDate
          ) : new Date(9999, 11, 31); // Fecha muy lejana para productos sin vencimiento

          const dateB = b.expiryDate ? new Date(
            b.expiryDate.seconds ? b.expiryDate.seconds * 1000 :
            b.expiryDate.toDate ? b.expiryDate.toDate() : b.expiryDate
          ) : new Date(9999, 11, 31);

          result = dateA - dateB;
        } else if (sortBy === "lowStock") {
          // Ordenar por relación con umbral de stock bajo
          const thresholdA = a.lowStockThreshold || 5;
          const thresholdB = b.lowStockThreshold || 5;
          
          // Calcular proporción de stock respecto al umbral (menor es más crítico)
          const ratioA = a.stock / thresholdA;
          const ratioB = b.stock / thresholdB;
          
          result = ratioA - ratioB;
        } else if (sortBy === "zeroStock") {
          // Ordenar por cantidad de stock (menor stock primero)
          result = a.stock - b.stock;
        }

        return sortOrder === "asc" ? result : -result;
      });
  }, [
    products,
    selectedCategory,
    lowStockFilter,
    zeroStockFilter,
    searchQuery,
    sortBy,
    sortOrder,
    expiryFilter,
  ]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    if (products) {
      products.forEach((product) => {
        const category = product.category || "sin-categoria";
        counts[category] = (counts[category] || 0) + 1;
      });
    }
    return counts;
  }, [products]);

  const categoryValues = useMemo(() => {
    const values = {};

    // Inicializar todas las categorías con 0
    categories.forEach((cat) => {
      values[cat.id] = 0;
    });

    // Calcular valor monetario por categoría
    products.forEach((product) => {
      if (product.category) {
        // Verificar si la categoría existe en las categorías cargadas
        const categoryExists = categories.some(
          (cat) => cat.id === product.category
        );

        if (categoryExists) {
          // Sumar el valor del producto (precio * stock)
          const productValue = (product.price || 0) * (product.stock || 0);
          values[product.category] =
            (values[product.category] || 0) + productValue;
        }
      }
    });

    return values;
  }, [products, categories]);

  const toggleSort = useCallback(
    (field) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
    },
    [sortBy, sortOrder]
  );

  const clearFilters = useCallback(() => {
    setSelectedCategory(null);
    setLowStockFilter(false);
    setZeroStockFilter(false);
    setExpiryFilter(false);
    setSearchQuery("");
  }, []);

  const handleRefresh = () => {
    refreshProducts(); // Usar la nueva función de refresh que invalida el caché
  };

  const handleProductPress = (product) => {
    if (isSelecting) {
      navigation.navigate("NewCart", { selectedProduct: product });
    } else {
      navigation.navigate("EditProduct", { productId: product.id });
    }
  };

  const handleDeleteProduct = useCallback(
    (productId, productName) => {
      Alert.alert(
        "Eliminar Producto",
        `¿Estás seguro de que deseas eliminar "${productName}"?`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDoc(doc(db, "products", productId));

                // Invalidar el caché de productos después de eliminar
                if (auth.currentUser) {
                  await CacheService.invalidateCache(
                    "products",
                    auth.currentUser.uid
                  );
                }

                // Recargar productos después de eliminar
                loadProducts(true); // Forzar recarga desde Firestore
                Alert.alert("Éxito", "Producto eliminado correctamente");
              } catch (error) {
                console.error("Error al eliminar producto:", error);
                Alert.alert("Error", "No se pudo eliminar el producto");
              }
            },
          },
        ]
      );
    },
    [loadProducts]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const categoryName = getCategoryName(item.category, categories);

      let stockColor = colors.success;
      let stockBgColor = "rgba(46, 204, 113, 0.1)";
      if (item.stock <= 0) {
        stockColor = colors.error;
        stockBgColor = "rgba(231, 76, 60, 0.1)";
      } else if (item.stock <= 5) {
        stockColor = colors.warning;
        stockBgColor = "rgba(241, 196, 15, 0.1)";
      }

      return (
        <View style={styles.productCard}>
          <TouchableOpacity
            style={styles.productContent}
            onPress={() => handleProductPress(item)}
          >
            <View style={styles.productHeader}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>

            <View style={styles.productDetails}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Precio</Text>
                <Text style={styles.productPrice}>
                  {formatPrice(item.price)}
                </Text>
              </View>

              <View style={styles.stockContainer}>
                <Text style={styles.stockLabel}>Stock</Text>
                <View
                  style={[styles.stockBadge, { backgroundColor: stockBgColor }]}
                >
                  <Text style={[styles.productStock, { color: stockColor }]}>
                    {item.stock} unid.
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {!isSelecting && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteProduct(item.id, item.name)}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [handleDeleteProduct, handleProductPress, isSelecting, categories]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const renderCategoryFilters = () => {
    return (
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory ? styles.selectedCategoryChip : null,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <View style={styles.categoryChipContent}>
              <Ionicons
                name="apps-outline"
                size={16}
                color={!selectedCategory ? "#fff" : "#666"}
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  !selectedCategory ? styles.selectedCategoryText : null,
                ]}
              >
                Todos
              </Text>
            </View>
          </TouchableOpacity>

          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id
                  ? styles.selectedCategoryChip
                  : null,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <View style={styles.categoryChipContent}>
                <Ionicons
                  name="folder-outline"
                  size={16}
                  color={selectedCategory === category.id ? "#fff" : "#666"}
                  style={styles.categoryIcon}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category.id
                      ? styles.selectedCategoryText
                      : null,
                  ]}
                >
                  {category.name} ({categoryCounts[category.id] || 0})
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const navigateToCategory = (categoryId) => {
    setSelectedCategory(categoryId);
    setLowStockFilter(false);
    setZeroStockFilter(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color="#666"
              style={styles.searchClearIcon}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filtersRow}>
        {renderCategoryFilters()}

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, lowStockFilter && styles.filterButtonActive]}
            onPress={() => {
              setLowStockFilter(!lowStockFilter);
              setZeroStockFilter(false);
              setExpiryFilter(false);
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                lowStockFilter && styles.filterButtonTextActive,
              ]}
            >
              Stock Bajo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, zeroStockFilter && styles.filterButtonActive]}
            onPress={() => {
              setZeroStockFilter(!zeroStockFilter);
              setLowStockFilter(false);
              setExpiryFilter(false);
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                zeroStockFilter && styles.filterButtonTextActive,
              ]}
            >
              Stock Cero
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, expiryFilter && styles.filterButtonActive]}
            onPress={() => {
              setExpiryFilter(!expiryFilter);
              setLowStockFilter(false);
              setZeroStockFilter(false);
              // Si activamos el filtro de vencimiento, cambiamos automáticamente el orden
              if (!expiryFilter) {
                setSortBy("expiryDate");
                setSortOrder("asc");
              }
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                expiryFilter && styles.filterButtonTextActive,
              ]}
            >
              Próximos a caducar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, sortBy === "expiryDate" && styles.filterButtonActive]}
            onPress={() => {
              if (sortBy === "expiryDate") {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              } else {
                setSortBy("expiryDate");
                setSortOrder("asc");
                setLowStockFilter(false);
                setZeroStockFilter(false);
                setExpiryFilter(false);
              }
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                sortBy === "expiryDate" && styles.filterButtonTextActive,
              ]}
            >
              Vencimiento {sortBy === "expiryDate" && (sortOrder === "asc" ? "↑" : "↓")}
            </Text>
          </TouchableOpacity>

          {selectedCategory && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={clearFilters}
            >
              <Feather name="x" size={16} color="#000" />
              <Text style={styles.clearFilterText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.productsList}
        ListEmptyComponent={
          loadError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                No se pudieron cargar los productos
              </Text>
              <TouchableOpacity
                style={styles.errorButton}
                onPress={() => {
                  setLoadError(false);
                  refreshProducts();
                }}
              >
                <Text style={styles.errorButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="archive-outline" size={50} color="#ddd" />
              <Text style={styles.emptyText}>No hay productos</Text>
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => navigation.navigate("AddProduct")}
              >
                <Text style={styles.addProductButtonText}>
                  Agregar Producto
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      />

      {!isSelecting && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddProduct")}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  searchClearIcon: {
    padding: 5,
  },
  filtersRow: {
    marginBottom: 10,
  },
  categoriesWrapper: {
    marginHorizontal: 10,
    marginBottom: 5,
  },
  categoriesContainer: {
    flexDirection: "row",
  },
  categoriesContent: {
    paddingRight: 10,
  },
  categoryChip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
  },
  categoryChipContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    marginRight: 5,
  },
  categoryChipText: {
    fontSize: 14,
    color: "#666",
  },
  selectedCategoryText: {
    color: "#fff",
    fontWeight: "500",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 10,
    marginTop: 5,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    overflow: "hidden",
  },
  productContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  productHeader: {
    marginBottom: 10,
  },
  productName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  productDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceContainer: {
    marginRight: 20,
    marginBottom: 0,
  },
  priceLabel: {
    fontSize: 15,
    color: "#888",
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },
  stockContainer: {
    marginRight: 20,
    marginBottom: 0,
  },
  stockLabel: {
    fontSize: 15,
    color: "#888",
    marginBottom: 2,
  },
  stockBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  productStock: {
    fontSize: 18,
    fontWeight: "600",
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    marginBottom: 10,
  },
  loaderText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIcon: {
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  addProductButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addProductButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  clearFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  clearFilterText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
});
