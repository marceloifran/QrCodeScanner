import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { auth, db } from "../firebase/config";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { colors } from "../theme/colors";

// Importar pantallas
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProductListScreen from "../screens/ProductListScreen";
import ScanForStockScreen from "../screens/ScanForStockScreen";
import AddProductScreen from "../screens/AddProductScreen";
import EditProductScreen from "../screens/EditProductScreen";
import ScanProductScreen from "../screens/ScanProductScreen";
import SalesHistoryScreen from "../screens/SalesHistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import RegisterScreen from "../screens/RegisterScreen";
import BusinessSettingsScreen from "../screens/BusinessSettingsScreen";
import TabNavigator from "./TabNavigator"; // Asegurate de que el path sea correcto
import NewCartScreen from "../screens/NewCartScreen";
// Importar nuevas pantallas de suscripción
import SubscriptionPlansScreen from "../screens/SubscriptionPlansScreen";
import PaymentScreen from "../screens/PaymentScreen";
import SubscriptionInfoScreen from "../screens/SubscriptionInfoScreen";
// Importar pantalla de configuración de pruebas
import TestingConfigScreen from "../screens/TestingConfigScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Componente para el botón de notificaciones
const NotificationBell = ({ navigation }) => {
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    checkNotifications();
  }, []);

  const checkNotifications = async () => {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, "products"),
        where("userId", "==", auth.currentUser.uid),
        where("stock", "<=", 5)
      );
      const querySnapshot = await getDocs(q);
      setNotificationCount(querySnapshot.size);
    } catch (error) {
      console.error("Error al verificar notificaciones:", error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.notificationButton}
      onPress={() => navigation.navigate("Notifications")}
    >
      <Ionicons name="notifications-outline" size={24} color="#fff" />
      {notificationCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{notificationCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Navegador principal de la aplicación
const AppNavigator = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="AddProduct" 
              component={AddProductScreen}
              options={{
                headerShown: true,
                title: "Agregar Producto",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen 
              name="EditProduct" 
              component={EditProductScreen}
              options={{
                headerShown: true,
                title: "Editar Producto",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen 
              name="ScanForStock" 
              component={ScanForStockScreen}
              options={{
                headerShown: true,
                title: "Escanear para Stock",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen 
              name="NewCart" 
              component={NewCartScreen}
              options={{
                headerShown: true,
                title: "Nueva Venta",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: "Notificaciones",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen
              name="SubscriptionPlans"
              component={SubscriptionPlansScreen}
              options={{
                headerShown: true,
                title: "Planes de Suscripción",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen
              name="Payment"
              component={PaymentScreen}
              options={{
                headerShown: true,
                title: "Pago",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen
              name="SubscriptionInfo"
              component={SubscriptionInfoScreen}
              options={{
                headerShown: true,
                title: "Información de Suscripción",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen
              name="BusinessSettings"
              component={BusinessSettingsScreen}
              options={{
                headerShown: true,
                title: "Configuración del Negocio",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: "#fff",
              }}
            />
            {__DEV__ && (
              <Stack.Screen
                name="TestingConfig"
                component={TestingConfigScreen}
                options={{
                  headerShown: true,
                  title: "Configuración de Pruebas",
                  headerStyle: {
                    backgroundColor: colors.primary,
                  },
                  headerTintColor: "#fff",
                }}
              />
            )}
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  notificationButton: {
    position: "relative",
    marginRight: 15,
  },
  badge: {
    position: "absolute",
    right: -6,
    top: -3,
    backgroundColor: "red",
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});
