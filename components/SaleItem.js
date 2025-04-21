import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { formatPrice } from "../utils/formatters";

const SaleItem = ({ item }) => {
  const formatDate = (date) => {
    try {
      if (!date) return "Fecha no disponible";

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

      // Verificar que la fecha sea válida
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        console.log("Fecha inválida en SaleItem:", date);
        return "Fecha inválida";
      }

      return dateObj.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formateando fecha en SaleItem:", error, date);
      return "Error en fecha";
    }
  };

  return (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
        <Text style={styles.saleTotal}>{formatPrice(item.total)}</Text>
      </View>
      <View style={styles.itemsList}>
        {item.items &&
          item.items.map((product, index) => (
            <Text key={index} style={styles.itemText}>
              {product.quantity}x {product.name} - {formatPrice(product.price)}
            </Text>
          ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  saleCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  saleDate: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  saleTotal: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  itemText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 5,
  },
});

export default memo(SaleItem);
