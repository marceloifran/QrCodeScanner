import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { colors } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function EditExpiryDateScreen({ navigation, route }) {
  const { productId, productName } = route.params;

  const [expiryDate, setExpiryDate] = useState(
    route.params.expiryDate ? new Date(route.params.expiryDate) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifyExpiry, setNotifyExpiry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState(null);

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    try {
      const productDoc = await getDoc(doc(db, "products", productId));
      if (!productDoc.exists()) {
        Alert.alert("Error", "El producto no existe");
        navigation.goBack();
        return;
      }

      const data = productDoc.data();
      setProductData(data);

      // Si no recibimos expiryDate en route.params, la tomamos del producto
      if (!route.params.expiryDate && data.expiryDate) {
        setExpiryDate(new Date(data.expiryDate.seconds * 1000));
      }

      setNotifyExpiry(data.notifyExpiry || true);
    } catch (error) {
      console.error("Error al cargar producto:", error);
      Alert.alert("Error", "No se pudo cargar la información del producto");
    }
  };

  const handleDateSelection = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    // Cerrar el selector de fecha en Android
    setShowDatePicker(false);

    // Si se seleccionó una fecha, actualizar el estado
    if (selectedDate) {
      // Asegurarse de que sea una fecha válida
      if (!isNaN(selectedDate.getTime())) {
        console.log(
          "Fecha seleccionada correctamente:",
          selectedDate.toISOString()
        );
        setExpiryDate(selectedDate);
      } else {
        console.error("Fecha inválida seleccionada");
        Alert.alert(
          "Error",
          "La fecha seleccionada no es válida. Por favor, intenta nuevamente."
        );
      }
    }
  };

  const updateExpiryDate = async () => {
    if (loading) return;

    // Verificar que expiryDate sea válido
    if (!expiryDate || isNaN(expiryDate.getTime())) {
      Alert.alert("Error", "Por favor selecciona una fecha válida");
      return;
    }

    setLoading(true);
    try {
      const productRef = doc(db, "products", productId);

      // Convertir la fecha de vencimiento a Timestamp para Firestore
      let expiryDateTimestamp = null;
      try {
        // Crear una nueva fecha para evitar problemas de referencia
        const validDate = new Date(expiryDate.getTime());

        // Verificar que la fecha sea válida
        if (!isNaN(validDate.getTime())) {
          console.log("Guardando fecha:", validDate.toISOString());
          expiryDateTimestamp = {
            seconds: Math.floor(validDate.getTime() / 1000),
            nanoseconds: 0,
          };
        } else {
          throw new Error("Fecha inválida");
        }
      } catch (error) {
        console.error("Error al convertir fecha:", error);
        Alert.alert(
          "Error",
          "Ha ocurrido un error al procesar la fecha seleccionada"
        );
        setLoading(false);
        return;
      }

      // Solo actualizar los campos de fecha y notificación
      await updateDoc(productRef, {
        expiryDate: expiryDateTimestamp,
        notifyExpiry: notifyExpiry,
        updatedAt: serverTimestamp(),
      });

      // Verificar si el producto necesita notificación por fecha de vencimiento
      const currentDate = new Date();
      const daysUntilExpiration = Math.ceil(
        (expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log("Días hasta vencimiento:", daysUntilExpiration);

      // ID de la notificación para referencia
      const notificationId = `expiry_${productId}`;
      const notificationRef = doc(db, "productNotifications", notificationId);

      // Si está por vencer en los próximos 15 días y el usuario quiere notificaciones
      if (notifyExpiry && daysUntilExpiration <= 15) {
        // Actualizar o crear la notificación
        const notificationData = {
          productId,
          productName:
            productName || (productData && productData.name) || "Producto",
          expiryDate: expiryDateTimestamp,
          notifyExpiry: true,
          notificationCreated: new Date(),
          userId: auth.currentUser.uid,
        };

        console.log(
          "Creando notificación de vencimiento para:",
          notificationData.productName
        );

        // Guardar en la colección de notificaciones
        await setDoc(notificationRef, notificationData);

        Alert.alert(
          "Fecha actualizada",
          `La fecha de vencimiento ha sido actualizada al ${expiryDate.toLocaleDateString()}. ` +
            `El producto vencerá en ${daysUntilExpiration} días y se mostrará en las notificaciones.`,
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Si la fecha ya no está dentro de los próximos 15 días o el usuario desactivó las notificaciones,
        // intentamos eliminar la notificación existente si existe
        try {
          // Verificar si existe la notificación
          const notificationDoc = await getDoc(notificationRef);
          if (notificationDoc.exists()) {
            // Si existe, la eliminamos
            await deleteDoc(notificationRef);
            console.log(
              "Notificación eliminada porque el producto ya no está próximo a vencer"
            );
          }
        } catch (error) {
          console.error("Error al intentar eliminar la notificación:", error);
        }

        Alert.alert(
          "Fecha actualizada",
          `La fecha de vencimiento ha sido actualizada al ${expiryDate.toLocaleDateString()}. ` +
            (daysUntilExpiration > 15
              ? `El producto vencerá en ${daysUntilExpiration} días (más de 15 días), por lo que no se mostrará en notificaciones.`
              : `Has desactivado las notificaciones para este producto.`),
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error al actualizar fecha de vencimiento:", error);
      Alert.alert("Error", "No se pudo actualizar la fecha de vencimiento");
    } finally {
      setLoading(false);
    }
  };

  const renderDatePicker = () => {
    return (
      <View style={styles.datePickerContainer}>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={handleDateSelection}
        >
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.datePickerText}>
            {expiryDate && !isNaN(expiryDate.getTime())
              ? expiryDate.toLocaleDateString()
              : "Seleccionar fecha"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && Platform.OS !== "web" && (
          <DateTimePicker
            testID="dateTimePicker"
            value={
              expiryDate && !isNaN(expiryDate.getTime())
                ? expiryDate
                : new Date()
            }
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="time-outline" size={40} color={colors.primary} />
          <Text style={styles.title}>Actualizar fecha de vencimiento</Text>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>
            {productName || (productData && productData.name) || "Producto"}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Fecha de vencimiento</Text>
          {renderDatePicker()}

          <View style={styles.notificationOption}>
            <Text style={styles.notificationText}>
              Notificar cuando se acerque la fecha de vencimiento
            </Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                notifyExpiry
                  ? styles.toggleButtonActive
                  : styles.toggleButtonInactive,
              ]}
              onPress={() => setNotifyExpiry(!notifyExpiry)}
            >
              <View
                style={[
                  styles.toggleIndicator,
                  notifyExpiry
                    ? styles.toggleIndicatorActive
                    : styles.toggleIndicatorInactive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, loading && styles.disabledButton]}
          onPress={updateExpiryDate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.updateButtonText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.infoText}>
          Las notificaciones se mostrarán solo si la fecha de vencimiento es
          dentro de los próximos 15 días.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.text.primary,
    marginTop: 10,
  },
  productInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: colors.text.primary,
  },
  datePickerContainer: {
    marginBottom: 15,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: 16,
    color: colors.text.primary,
  },
  notificationOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  notificationText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
    marginRight: 10,
  },
  toggleButton: {
    width: 50,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    justifyContent: "flex-end",
  },
  toggleButtonInactive: {
    backgroundColor: "#e0e0e0",
    justifyContent: "flex-start",
  },
  toggleIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  toggleIndicatorActive: {
    backgroundColor: "white",
  },
  toggleIndicatorInactive: {
    backgroundColor: colors.text.tertiary,
  },
  updateButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  updateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  infoText: {
    marginTop: 15,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
  },
});
