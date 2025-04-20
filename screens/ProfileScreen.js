import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { colors } from "../theme/colors";
import { doc, getDoc } from "firebase/firestore";
import {
  checkSubscriptionStatus,
  cancelSubscription,
} from "../services/PaymentService";
import {
  getPlanById,
  isSubscriptionExpiringSoon,
  getRemainingDaysMessage,
} from "../constants/plans";
import { checkProductLimit } from "../utils/subscriptionUtils";

export default function ProfileScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Cargar la información del usuario y su suscripción
    loadUserSubscription();

    // Actualizar cuando se vuelve a esta pantalla
    const unsubscribe = navigation.addListener("focus", () => {
      setRefreshKey((prevKey) => prevKey + 1);
    });

    return unsubscribe;
  }, [navigation, refreshKey]);

  const loadUserSubscription = async () => {
    try {
      setLoading(true);

      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const userId = auth.currentUser.uid;

      // Obtener información de suscripción
      const userRef = doc(db, "businessInfo", userId);
      const userDoc = await getDoc(userRef);

      // Verificar también el límite de productos para asegurar la consistencia
      const productLimitResult = await checkProductLimit(userId);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.subscription) {
          // Configurar fecha de expiración predeterminada si no existe
          let expirationDate = userData.subscription.expirationDate;
          if (!expirationDate) {
            // Si no hay fecha de expiración, configuramos una (30 días desde hoy)
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            expirationDate = nextMonth;

            // Actualizar en Firestore también sería lo ideal, pero no lo hacemos aquí
            // para mantener la función simple
          }

          // Actualizar la información del plan con los datos actuales
          const subscriptionData = {
            ...userData.subscription,
            planId:
              productLimitResult?.planId ||
              userData.subscription.planId ||
              "base",
            planName: getPlanById(
              productLimitResult?.planId ||
                userData.subscription.planId ||
                "base"
            ).name,
            expirationDate: expirationDate,
            status: "active", // Aseguramos que tenga un estado
          };

          setSubscriptionInfo(subscriptionData);
        } else if (productLimitResult && productLimitResult.planId) {
          // Si no hay datos de suscripción pero hay información de límite de productos
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);

          setSubscriptionInfo({
            planId: productLimitResult.planId,
            planName: getPlanById(productLimitResult.planId).name,
            status: "active",
            currentCount: productLimitResult.currentCount,
            limit: productLimitResult.limit,
            expirationDate: nextMonth,
          });
        } else {
          // Plan gratuito por defecto
          setSubscriptionInfo({
            planId: "base",
            planName: "Plan Base",
            status: "inactive",
            expirationDate: null,
          });
        }
      } else {
        // Usuario sin información de negocio, plan base inactivo
        setSubscriptionInfo({
          planId: "base",
          planName: "Plan Base",
          status: "inactive",
          expirationDate: null,
        });
      }
    } catch (error) {
      console.error("Error al cargar suscripción:", error);
      Alert.alert(
        "Error",
        "No se pudo cargar la información de tu suscripción"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // La redirección a la pantalla de login se maneja automáticamente por el AuthContext
    } catch (error) {
      Alert.alert("Error", "No se pudo cerrar sesión. Inténtalo de nuevo.");
    }
  };

  const handleDisablePlan = async () => {
    Alert.alert(
      "Deshabilitar Plan",
      "¿Estás seguro que deseas deshabilitar tu plan actual? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Deshabilitar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const userId = auth.currentUser?.uid;
              if (userId) {
                await cancelSubscription(userId);
                await loadUserSubscription(); // Recargar la información
                Alert.alert(
                  "Éxito",
                  "Tu plan ha sido deshabilitado correctamente"
                );
              }
            } catch (error) {
              console.error("Error al deshabilitar plan:", error);
              Alert.alert("Error", "No se pudo deshabilitar el plan");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return "No disponible";

    // Si date es un timestamp de Firestore
    if (date && date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    // Si es una fecha normal
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderSubscriptionInfo = () => {
    if (loading) {
      return (
        <View style={styles.subscriptionContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      );
    }

    // Verificar si el usuario no tiene suscripción activa
    if (!subscriptionInfo || subscriptionInfo.status === "inactive") {
      return (
        <View style={styles.subscriptionContainer}>
          <Text style={styles.planName}>Sin Plan Activo</Text>
          <Text style={styles.planDetails}>
            Debes elegir un plan para usar las funcionalidades de la aplicación
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate("SubscriptionPlans")}
          >
            <Text style={styles.upgradeButtonText}>Elegir Plan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const plan = getPlanById(subscriptionInfo.planId);
    const nextPaymentDate = formatDate(subscriptionInfo.expirationDate);
    const isExpiring = isSubscriptionExpiringSoon(
      subscriptionInfo.expirationDate
    );
    const expirationMessage = isExpiring
      ? getRemainingDaysMessage(subscriptionInfo.expirationDate)
      : "";

    // Verificar si ya tiene el plan premium
    const hasPremiumPlan = subscriptionInfo.planId === "premium";

    return (
      <View style={styles.subscriptionContainer}>
        <View style={styles.subscriptionHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View
            style={[
              styles.statusBadge,
              isExpiring ? styles.warningBadge : styles.activeBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {isExpiring ? "Por expirar" : "Activo"}
            </Text>
          </View>
        </View>

        <Text style={styles.planDetails}>
          {plan.productLimit === Infinity
            ? "Productos ilimitados"
            : `Hasta ${plan.productLimit} productos`}
        </Text>

        {isExpiring && (
          <Text style={styles.expirationWarning}>{expirationMessage}</Text>
        )}

        <Text style={styles.nextPaymentLabel}>Próxima renovación:</Text>
        <Text style={styles.nextPaymentDate}>
          {nextPaymentDate !== "No disponible"
            ? nextPaymentDate
            : "30 días desde la activación"}{" "}
          {/* Siempre mensual */}
        </Text>
        <Text style={styles.paymentPeriod}>Facturación: Mensual</Text>

        <View style={styles.subscriptionButtonsContainer}>
          {isExpiring ? (
            <TouchableOpacity
              style={styles.renewButton}
              onPress={() =>
                navigation.navigate("SubscriptionPlans", { renew: true })
              }
            >
              <Text style={styles.renewButtonText}>Renovar ahora</Text>
            </TouchableOpacity>
          ) : (
            !hasPremiumPlan && (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() =>
                  navigation.navigate("SubscriptionPlans", { upgrade: true })
                }
              >
                <Text style={styles.upgradeButtonText}>Mejorar Plan</Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[
              styles.subscriptionInfoButton,
              hasPremiumPlan && !isExpiring ? { flex: 2 } : { flex: 1 },
            ]}
            onPress={() => navigation.navigate("SubscriptionInfo")}
          >
            <Text style={styles.subscriptionInfoButtonText}>Ver detalles</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.userInfoContainer}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {auth.currentUser?.displayName || "Usuario"}
            </Text>
            <Text style={styles.userEmail}>{auth.currentUser?.email}</Text>
          </View>
        </View>

        {renderSubscriptionInfo()}

        <View style={styles.optionsContainer}>
          {/* Sección de Configuración del Negocio */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => navigation.navigate("BusinessSettings")}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: "#e8f5e9" }]}
            >
              <Ionicons
                name="business-outline"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text style={styles.optionText}>Configuración del Negocio</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Sección de Cerrar Sesión */}
          <TouchableOpacity
            style={[styles.optionItem, styles.signOutOption]}
            onPress={handleSignOut}
          >
            <View
              style={[styles.optionIconContainer, styles.signOutIconContainer]}
            >
              <Ionicons name="log-out-outline" size={24} color="#e53935" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, styles.signOutText]}>
                Cerrar Sesión
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e0f2f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  subscriptionContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  premiumPlanName: {
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "#e8f5e9",
  },
  inactiveBadge: {
    backgroundColor: "#ffebee",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
  },
  planDetailsContainer: {
    marginVertical: 8,
  },
  planDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  changePlanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  changePlanButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  optionsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  signOutOption: {
    borderBottomWidth: 0,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  signOutIconContainer: {
    backgroundColor: "#ffebee",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: "#333",
  },
  signOutText: {
    color: "#e53935",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: "#666",
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  disableButton: {
    backgroundColor: colors.error,
  },
  changeButton: {
    backgroundColor: colors.primary,
  },
  subscriptionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 10,
  },
  upgradeButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  renewButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  renewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  subscriptionInfoButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  subscriptionInfoButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  expirationWarning: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 4,
  },
  nextPaymentLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  nextPaymentDate: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  warningBadge: {
    backgroundColor: "#fff9c4",
  },
  paymentPeriod: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
