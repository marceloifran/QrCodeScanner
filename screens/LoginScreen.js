import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from "react-native";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { colors } from "../theme/colors";
// Comentar esta importación si sigue dando problemas
// import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Svg, Path } from "react-native-svg";

// Componente para el ícono de Google
const GoogleIcon = () => (
  <View style={styles.googleIconContainer}>
    <Svg width="18" height="18" viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  </View>
);

// Registrar el navegador web para manejar la redirección de autenticación
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Configuración de autenticación con Google
  // IMPORTANTE: Reemplaza estos valores con tus propios IDs de Google
  // Para obtenerlos:
  // 1. Ve a https://console.firebase.google.com/ y abre tu proyecto
  // 2. Ve a Authentication > Sign-in method > Google y habilita Google Sign-In
  // 3. Para los IDs de cliente, ve a Project Settings > General > Your apps
  // 4. Si no tienes apps configuradas, agrega una app para Android y otra para iOS
  // 5. Para Android, necesitas el SHA-1 de tu aplicación
  // 6. Para iOS, necesitas el Bundle ID
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "798991172649-hpgvfp0o2g6g4dqihn3u8a1bpnpq7kri.apps.googleusercontent.com", // ID para Android
    iosClientId:
      "798991172649-hpgvfp0o2g6g4dqihn3u8a1bpnpq7kri.apps.googleusercontent.com", // ID para iOS
    expoClientId:
      "798991172649-hpgvfp0o2g6g4dqihn3u8a1bpnpq7kri.apps.googleusercontent.com", // ID para Expo (opcional)
    responseType: "id_token",
    scopes: ["profile", "email"],
    usePKCE: false,
  });

  // Manejar la respuesta de Google Auth
  React.useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    } else if (response?.type === "error") {
      console.error("Error de autenticación con Google:", response.error);
      const errorMsg = handleGoogleAuthError(response.error);
      Alert.alert("Error de autenticación", errorMsg);
      setGoogleLoading(false);
    }
  }, [response]);

  // Manejar errores específicos de Google Auth
  const handleGoogleAuthError = (error) => {
    if (error?.error === "idpiframe_initialization_failed") {
      return "Error de inicialización. Verifica la configuración de Firebase y los IDs de cliente.";
    }
    if (error?.error === "popup_closed_by_user") {
      return "Autenticación cancelada por el usuario.";
    }
    if (error?.error === "access_denied") {
      return "Acceso denegado. Verifica los permisos de tu aplicación en la consola de Google.";
    }
    if (error?.error === "immediate_failed") {
      return "Error de autenticación silenciosa. Intenta iniciar sesión nuevamente.";
    }
    if (error?.error === "invalid_client") {
      return "ID de cliente inválido. Verifica la configuración en Firebase.";
    }

    return "Hubo un problema al iniciar sesión con Google. Por favor intenta de nuevo.";
  };

  // Iniciar sesión con correo y contraseña
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa tu email y contraseña");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      let errorMessage = "Error al iniciar sesión";

      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "El email ingresado no es válido";
          break;
        case "auth/user-disabled":
          errorMessage = "Esta cuenta ha sido deshabilitada";
          break;
        case "auth/user-not-found":
          errorMessage = "No existe una cuenta con este email";
          break;
        case "auth/wrong-password":
          errorMessage = "Contraseña incorrecta";
          break;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar sesión con Google
  const handleGoogleLogin = async (idToken) => {
    try {
      setGoogleLoading(true);

      // Crear credencial para Firebase
      const credential = GoogleAuthProvider.credential(idToken);

      // Iniciar sesión con credencial
      await signInWithCredential(auth, credential);

      // Guardar información de que el usuario inició sesión con Google
      await AsyncStorage.setItem("loginMethod", "google");
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      Alert.alert(
        "Error",
        "No se pudo iniciar sesión con Google. Inténtalo de nuevo."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // Iniciar flujo de autenticación con Google
  const signInWithGoogle = async () => {
    if (!request) {
      Alert.alert(
        "Error de configuración",
        "No se pudo iniciar la autenticación con Google. Verifica que los IDs de cliente estén correctamente configurados en Firebase.",
        [
          {
            text: "Más información",
            onPress: () => checkGoogleConfig(),
          },
          { text: "OK" },
        ]
      );
      return;
    }

    try {
      setGoogleLoading(true);
      await promptAsync();
    } catch (error) {
      console.error("Error al abrir autenticación de Google:", error);
      Alert.alert("Error", "No se pudo iniciar la autenticación con Google");
      setGoogleLoading(false);
    }
  };

  // Verificar la configuración de Google
  const checkGoogleConfig = () => {
    Alert.alert(
      "Configuración de Google",
      "Para solucionar el problema:\n\n" +
        "1. Verifica que hayas habilitado Google como proveedor en Firebase Console.\n" +
        "2. Asegúrate de que los IDs de cliente en el código coincidan con los de tu proyecto en Firebase.\n" +
        "3. Para Android, verifica que hayas agregado la huella SHA-1 correcta.\n" +
        "4. Para iOS, confirma que el Bundle ID sea correcto.\n" +
        "5. Asegúrate de que tu aplicación esté registrada en la consola de Google Cloud."
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <Image
              source={require("../assets/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.titleText}>Ifsin Negocios</Text>
            <Text style={styles.subtitleText}>
              Gestión de inventario simple y eficiente
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
              {email ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setEmail("")}
                >
                  <Ionicons name="close-circle" size={18} color="#ccc" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#ccc"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.continueButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotPasswordText}>
                Olvidé mi contraseña
              </Text>
            </TouchableOpacity>

            <View style={styles.orContainer}>
              <View style={styles.divider} />
              <Text style={styles.orText}>o</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={signInWithGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="black" size="small" />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.googleButtonText}>
                    Continuar con Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.registerText}>¿No tienes una cuenta?</Text>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.registerButtonText}>Regístrate</Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && (
            <TouchableOpacity
              style={styles.devHelp}
              onPress={checkGoogleConfig}
            >
              <Text style={styles.devHelpText}>Ayuda para desarrolladores</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  logoSection: {
    alignItems: "center",
    marginVertical: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: colors.primary,
  },
  subtitleText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  formSection: {
    marginBottom: 30,
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  clearButton: {
    position: "absolute",
    right: 15,
    top: 15,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 15,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#eee",
  },
  orText: {
    marginHorizontal: 10,
    color: "#999",
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  googleIconContainer: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    marginTop: "auto",
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: "#666",
    marginRight: 5,
  },
  registerButton: {
    padding: 5,
  },
  registerButtonText: {
    color: colors.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  devHelp: {
    alignItems: "center",
    paddingVertical: 10,
  },
  devHelpText: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "underline",
  },
});
