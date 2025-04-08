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

// Función para obtener el nombre de la categoría a partir del ID
const getCategoryName = (categoryId, categories) => {
  const category = categories.find((cat) => cat.id === categoryId);
  return category ? category.name : "Sin categoría";
};

// Función para obtener un icono para la categoría
const getCategoryIcon = (categoryId) => {
  // Iconos por defecto según el tipo de categoría
  const defaultIcons = {
    general: "cube-outline",
    offers: "pricetag-outline",
    new: "star-outline",
    popular: "flame-outline",
    shirts: "shirt-outline",
    pants: "cut-outline",
    shoes: "footsteps-outline",
    accessories: "watch-outline",
    medications: "medical-outline",
    vitamins: "fitness-outline",
    dairy: "nutrition-outline",
    meat: "restaurant-outline",
    fruits: "leaf-outline",
    beverages: "wine-outline",
    smartphones: "phone-portrait-outline",
    computers: "laptop-outline",
    starters: "restaurant-outline",
    desserts: "ice-cream-outline",
    bread: "fast-food-outline",
    tools: "construct-outline",
    skincare: "water-outline",
    makeup: "color-palette-outline",
    fiction: "book-outline",
    nonfiction: "document-text-outline",
    // Añadir más iconos según sea necesario
  };

  return defaultIcons[categoryId] || "cube-outline"; // Icono por defecto
};

export default function ProductListScreen({ navigation, route }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [zeroStockFilter, setZeroStockFilter] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [categories, setCategories] = useState([]);
  const [industryType, setIndustryType] = useState("general");

  const { products, loading, loadProducts } = useProducts();

  const isSelecting = route.params?.isSelecting || false;
  const { filter, category } = route.params || {};

  // Definir la función loadCategories dentro del componente
  const loadCategories = async () => {
    try {
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
      console.log(
        "ProductListScreen - Cargando categorías para industria:",
        userIndustry
      );
      setCategories(industryCategories);

      // Resetear el filtro de categoría si la categoría seleccionada ya no existe
      if (selectedCategory) {
        const categoryExists = industryCategories.some(
          (cat) => cat.id === selectedCategory
        );
        if (!categoryExists) {
          console.log(
            "La categoría seleccionada ya no existe, reseteando filtro"
          );
          setSelectedCategory(null);
        }
      }
    } catch (error) {
      console.error("Error al cargar la industria:", error);
      // En caso de error, usar categorías generales
      const defaultCategories = getCategoriesForIndustry("general");
      setCategories(defaultCategories);
    }
  };

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
    loadCategories();

    // Añadir un listener para cuando la pantalla recibe el foco
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("ProductListScreen recibió el foco - recargando categorías");
      loadCategories();
      loadProducts(); // También recargamos los productos
    });

    // Limpiar el listener cuando el componente se desmonta
    return unsubscribe;
  }, [navigation]);

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

      // Ya no necesitamos verificar categorías predefinidas
      // Simplemente podemos usar las categorías que tenemos
    }
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    return products
      .filter((product) => {
        // Filtro de búsqueda
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

        // Filtro por categoría
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
  ]);

  const categoryCounts = useMemo(() => {
    const counts = {};

    // Inicializar todas las categorías con 0
    categories.forEach((cat) => {
      counts[cat.id] = 0;
    });

    // Contar productos por categoría
    products.forEach((product) => {
      if (product.category) {
        // Verificar si la categoría existe en las categorías cargadas
        const categoryExists = categories.some(
          (cat) => cat.id === product.category
        );

        if (categoryExists) {
          // Si existe, incrementar el contador
          counts[product.category] = (counts[product.category] || 0) + 1;
        }
      }
    });

    return counts;
  }, [products, categories]);

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
    setSearchQuery("");
  }, []);

  const handleRefresh = () => {
    loadProducts();
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
                // Recargar productos después de eliminar
                loadProducts();
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
      if (item.stock <= 0) {
        stockColor = colors.error;
      } else if (item.stock <= 5) {
        stockColor = colors.warning;
      }

      return (
        <View style={styles.productCard}>
          <TouchableOpacity
            style={styles.productContent}
            onPress={() => handleProductPress(item)}
          >
            <View style={styles.productHeader}>
              <View
                style={[
                  styles.categoryIconContainer,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Ionicons
                  name={getCategoryIcon(item.category)}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>

            <View style={styles.productDetails}>
              <View style={styles.priceContainer}>
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color="#666"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.productPrice}>
                  {formatPrice(item.price)}
                </Text>
              </View>

              <View style={styles.stockContainer}>
                <Ionicons
                  name="cube-outline"
                  size={18}
                  color="#666"
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.productStock, { color: stockColor }]}>
                  {item.stock} unid.
                </Text>
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

  const renderSortHeader = () => {
    return (
      <View style={styles.sortHeader}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            if (sortBy === "name") {
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            } else {
              setSortBy("name");
              setSortOrder("asc");
            }
          }}
        >
          <Text style={styles.sortButtonText}>Nombre</Text>
          {sortBy === "name" && (
            <Ionicons
              name={sortOrder === "asc" ? "chevron-up" : "chevron-down"}
              size={18}
              color="#333"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            if (sortBy === "price") {
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            } else {
              setSortBy("price");
              setSortOrder("asc");
            }
          }}
        >
          <Text style={styles.sortButtonText}>Precio</Text>
          {sortBy === "price" && (
            <Ionicons
              name={sortOrder === "asc" ? "chevron-up" : "chevron-down"}
              size={18}
              color="#333"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            if (sortBy === "stock") {
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            } else {
              setSortBy("stock");
              setSortOrder("asc");
            }
          }}
        >
          <Text style={styles.sortButtonText}>Stock</Text>
          {sortBy === "stock" && (
            <Ionicons
              name={sortOrder === "asc" ? "chevron-up" : "chevron-down"}
              size={18}
              color="#333"
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

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
                size={18}
                color={!selectedCategory ? "white" : colors.primary}
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryText,
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
                  name={getCategoryIcon(category.id)}
                  size={18}
                  color={
                    selectedCategory === category.id ? "white" : colors.primary
                  }
                  style={styles.categoryIcon}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id
                      ? styles.selectedCategoryText
                      : null,
                  ]}
                >
                  {category.name}
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
        <Ionicons name="search" size={20} color="#aaa" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={24} color="#aaa" />
          </TouchableOpacity>
        ) : null}
      </View>

      {renderCategoryFilters()}

      {renderSortHeader()}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.productList}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay productos para mostrar
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddProduct")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
    backgroundColor: "white",
    margin: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  filtersWrapper: {
    backgroundColor: "white",
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filtersContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minWidth: 120,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterIcon: {
    marginRight: 8,
    marginTop: -8,
  },
  filterChipText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  filterChipTextSelected: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  filterValueText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  filterValueTextSelected: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  sortHeader: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortButtonActive: {
    backgroundColor: "#e8f5e9",
  },
  sortButtonText: {
    fontSize: 15,
    marginRight: 6,
    fontWeight: "500",
    color: "#333",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  productList: {
    padding: 10,
  },
  productCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flexDirection: "row",
  },
  productContent: {
    flex: 1,
    paddingRight: 10,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  productDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  productStock: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 15,
    width: 50,
  },
  categoriesWrapper: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingVertical: 14,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "#f5f5f5",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  categoryChipContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryText: {
    color: "#555",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  selectedCategoryText: {
    color: "white",
    fontWeight: "600",
  },
});
