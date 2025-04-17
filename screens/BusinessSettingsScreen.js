import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { getCustomFieldsForIndustry } from "../utils/categoryUtils";

export default function BusinessSettingsScreen({ navigation }) {
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Tipo de negocio fijo: supermercado/almacén
  const industry = "grocery";

  useEffect(() => {
    loadBusinessInfo();
  }, []);

  const loadBusinessInfo = async () => {
    setLoading(true);
    try {
      const businessInfoRef = doc(db, "businessInfo", auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);

      if (businessInfoDoc.exists()) {
        const data = businessInfoDoc.data();
        setBusinessName(data.name || "");
      } else {
        setBusinessName(auth.currentUser.displayName || "");
      }
    } catch (error) {
      console.error("Error al cargar información del negocio:", error);
      Alert.alert("Error", "No se pudo cargar la información del negocio");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessName) {
      Alert.alert("Error", "Por favor ingresa el nombre del negocio");
      return;
    }

    setSaving(true);
    try {
      const businessInfoRef = doc(db, "businessInfo", auth.currentUser.uid);

      await setDoc(
        businessInfoRef,
        {
          name: businessName,
          industry: industry,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      Alert.alert("Éxito", "Información del negocio actualizada correctamente");
      navigation.goBack();
    } catch (error) {
      console.error("Error al guardar información del negocio:", error);
      Alert.alert("Error", "No se pudo guardar la información del negocio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre del Negocio</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="storefront-outline"
              size={22}
              color={colors.text.secondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Nombre de tu negocio"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de Negocio</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="cart-outline"
              size={22}
              color={colors.text.secondary}
              style={styles.inputIcon}
            />
            <Text style={styles.industryText}>Supermercado/Almacén</Text>
          </View>
          <Text style={styles.industryInfo}>
            Esta aplicación está optimizada para negocios tipo supermercado o
            almacén.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text.secondary,
  },
  content: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: colors.text.primary,
  },
  industryText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  industryInfo: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
