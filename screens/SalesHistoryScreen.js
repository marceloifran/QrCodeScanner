import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { formatPrice } from "../utils/formatters";
import { useSales } from "../hooks/useSales";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function SalesHistoryScreen({ navigation }) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);

  const { sales, loading, refreshSales } = useSales(filter);

  // Calcular productos más vendidos cuando cambian las ventas o el filtro
  useEffect(() => {
    if (sales && sales.length > 0) {
      setLoadingStats(true);

      // Agrupar por productos
      const productMap = new Map();

      // Iterar sobre cada venta y sus productos
      sales.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item) => {
            // Acumular por producto usando un ID único seguro
            const productId =
              item.id ||
              `product_${item.name}_${Math.random().toString(36).substr(2, 9)}`;
            const currentProduct = productMap.get(productId) || {
              id: productId,
              name: item.name,
              quantity: 0,
            };
            currentProduct.quantity += item.quantity || 1;
            productMap.set(productId, currentProduct);
          });
        }
      });

      // Convertir a arrays y ordenar
      const productArray = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3); // Top 3

      setTopProducts(productArray);
      setLoadingStats(false);
    } else {
      setTopProducts([]);
      setLoadingStats(false);
    }
  }, [sales, filter]);

  // Filtrar ventas por búsqueda
  const filteredSales = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    return sales.filter((sale) => {
      // Filtro de búsqueda
      if (searchQuery) {
        const normalizedSearchText = searchQuery
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        // Normalizar el nombre del cliente (eliminar acentos)
        const normalizedCustomerName = (sale.customerName || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        // Buscar coincidencia en nombre del cliente
        const customerMatch =
          normalizedCustomerName.includes(normalizedSearchText);

        // Buscar coincidencia en productos vendidos
        const productsMatch = sale.products.some((product) => {
          const normalizedProductName = (product.name || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          return normalizedProductName.includes(normalizedSearchText);
        });

        if (!customerMatch && !productsMatch) {
          return false;
        }
      }

      // Filtros por fecha
      if (selectedStartDate && selectedEndDate) {
        const saleDate = new Date(sale.date);
        return saleDate >= selectedStartDate && saleDate <= selectedEndDate;
      }

      return true;
    });
  }, [sales, searchQuery, selectedStartDate, selectedEndDate]);

  // Abrir modal de edición
  const handleEditSale = (sale) => {
    setSelectedSale(sale);
    setEditedItems([...sale.items]); // Copia de los items para editar
    setEditModalVisible(true);
  };

  // Eliminar una venta
  const handleDeleteSale = async (saleId) => {
    Alert.alert(
      "Eliminar venta",
      "¿Estás seguro de que deseas eliminar esta venta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "sales", saleId));
              // Recargar las ventas
              refreshSales();
              Alert.alert("Éxito", "Venta eliminada correctamente");
            } catch (error) {
              console.error("Error al eliminar venta:", error);
              Alert.alert("Error", "No se pudo eliminar la venta");
            }
          },
        },
      ]
    );
  };

  // Guardar cambios de edición
  const handleSaveEdit = async () => {
    try {
      if (!selectedSale) return;

      // Calcular nuevo total
      const newTotal = editedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Actualizar en Firestore
      await updateDoc(doc(db, "sales", selectedSale.id), {
        items: editedItems,
        total: newTotal,
        updatedAt: new Date(),
      });

      // Cerrar modal y recargar
      setEditModalVisible(false);
      refreshSales();
      Alert.alert("Éxito", "Venta actualizada correctamente");
    } catch (error) {
      console.error("Error al actualizar venta:", error);
      Alert.alert("Error", "No se pudo actualizar la venta");
    }
  };

  // Actualizar cantidad de un item
  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return; // No permitir cantidades menores a 1

    const updatedItems = [...editedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity,
    };
    setEditedItems(updatedItems);
  };

  // Renderizar una venta
  const renderSaleItem = useCallback(({ item }) => {
    // Formatear fecha con manejo de errores
    let formattedDate = "Fecha no disponible";
    try {
      if (item.date) {
        formattedDate =
          item.date.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          }) +
          " " +
          item.date.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          });
      }
    } catch (error) {
      console.error("Error al formatear fecha:", error);
    }

    // Obtener el primer producto para mostrar como ejemplo
    const firstProduct =
      item.items && item.items.length > 0
        ? item.items[0]
        : { name: "Producto" };
    const additionalItems =
      item.items && item.items.length > 1
        ? `y ${item.items.length - 1} producto${
            item.items.length > 2 ? "s" : ""
          } más`
        : "";

    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => handleEditSale(item)}
      >
        <View style={styles.saleHeader}>
          <Text style={styles.saleDate}>{formattedDate}</Text>
          <Text style={styles.saleTotal}>{formatPrice(item.total)}</Text>
        </View>

        <View style={styles.saleContent}>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {firstProduct.name} {additionalItems && `(${additionalItems})`}
            </Text>
            <Text style={styles.itemCount}>
              {item.items && item.items.length > 0
                ? item.items.reduce(
                    (sum, product) => sum + (product.quantity || 0),
                    0
                  )
                : 0}{" "}
              artículos
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSale(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, []);

  // Renderizar componente de productos más vendidos
  const renderTopProducts = () => {
    if (topProducts.length === 0 && !loadingStats) {
      return (
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>
            Top 3 Productos Más Vendidos
          </Text>
          <Text style={styles.noStatsText}>
            No hay suficientes datos para mostrar
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>
          Top 3 Productos Más Vendidos
        </Text>
        {topProducts.map((product, index) => (
          <View key={`product-${product.id}-${index}`} style={styles.statItem}>
            <Text style={styles.statItemRank}>{index + 1}</Text>
            <Text style={styles.statItemName} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={styles.statItemValue}>
              {product.quantity} {product.quantity === 1 ? "un." : "uns."}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#aaa" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ventas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#aaa" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtros de período */}
      <View style={styles.filterContainer}>
        {["today", "week", "month", "all"].map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterButton,
              filter === item && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(item)}
          >
            <Text
              style={
                filter === item
                  ? styles.filterButtonTextActive
                  : styles.filterButtonText
              }
            >
              {item === "today"
                ? "Hoy"
                : item === "week"
                ? "Semana"
                : item === "month"
                ? "Mes"
                : "Todas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContainer}>
        {/* Sumatoria total de ventas según el filtro */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>
            Total de Ventas (
            {filter === "today"
              ? "Hoy"
              : filter === "week"
              ? "Semana"
              : filter === "month"
              ? "Mes"
              : "Todas"}
            )
          </Text>
          <View style={styles.salesTotalContainer}>
            <Text style={styles.salesTotalAmount}>
              {formatPrice(
                filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
              )}
            </Text>
          </View>
        </View>
        {renderTopProducts()}
      </View>

      {/* Lista de ventas */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          renderItem={renderSaleItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={50} color="#ddd" />
              <Text style={styles.emptyText}>No hay ventas para mostrar</Text>
            </View>
          }
        />
      )}

      {/* Modal de edición */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Venta</Text>

            {editedItems.map((item, index) => (
              <View key={`item-${index}`} style={styles.editItemRow}>
                <Text style={styles.editItemName}>{item.name}</Text>
                <Text style={styles.editItemPrice}>${item.price} c/u</Text>

                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateItemQuantity(index, item.quantity - 1)}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.quantityText}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateItemQuantity(index, item.quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>

                  <Text style={styles.itemTotal}>
                    +${item.price * item.quantity}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                $
                {editedItems.reduce(
                  (sum, item) => sum + item.price * item.quantity,
                  0
                )}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    margin: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterButtonActive: {
    borderBottomColor: colors.primary,
  },
  filterButtonText: {
    color: "#666",
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  listContainer: {
    padding: 10,
  },
  saleCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  saleDate: {
    fontSize: 14,
    color: "#666",
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  saleContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: "#888",
  },
  deleteButton: {
    padding: 8,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    marginTop: 10,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  editItemRow: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 10,
  },
  editItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
  },
  editItemPrice: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 30,
    height: 30,
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  quantityText: {
    marginHorizontal: 15,
    fontSize: 16,
  },
  itemTotal: {
    marginLeft: "auto",
    fontSize: 16,
    fontWeight: "500",
    color: "#28a745",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#28a745",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    width: "48%",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f44336",
  },
  saveButton: {
    backgroundColor: "#28a745",
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  statsContainer: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  statsSection: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: colors.primary,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statItemRank: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  statItemName: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    color: "#333",
  },
  statItemValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  noStatsText: {
    color: "#888",
    textAlign: "center",
  },
  salesTotalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salesTotalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
});
