// cacheService.js - Servicio para gestionar el caché local de datos
import AsyncStorage from "@react-native-async-storage/async-storage";

// Tiempos de expiración (en minutos)
const EXPIRATION_TIMES = {
  products: 15, // 15 minutos para productos
  sales: 30, // 30 minutos para ventas
  categories: 60, // 60 minutos para categorías
};

// Estructura del caché: { data: [], timestamp: Date, userId: string }
class CacheService {
  // Guardar datos en caché
  static async saveToCache(key, data, userId) {
    try {
      const cacheData = {
        data,
        timestamp: new Date().getTime(),
        userId,
      };

      await AsyncStorage.setItem(
        `cache_${key}_${userId}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error(`Error al guardar en caché ${key}:`, error);
    }
  }

  // Obtener datos del caché
  static async getFromCache(key, userId) {
    try {
      const cachedData = await AsyncStorage.getItem(`cache_${key}_${userId}`);

      if (!cachedData) {
        return null;
      }

      const parsedData = JSON.parse(cachedData);

      // Verificar que los datos sean del mismo usuario
      if (parsedData.userId !== userId) {
        return null;
      }

      // Verificar si los datos han expirado
      const expirationMinutes = EXPIRATION_TIMES[key] || 15; // Default 15 minutos
      const expirationTime = expirationMinutes * 60 * 1000; // Convertir a milisegundos
      const now = new Date().getTime();

      if (now - parsedData.timestamp > expirationTime) {
        return null;
      }

      return parsedData.data;
    } catch (error) {
      console.error(`Error al obtener del caché ${key}:`, error);
      return null;
    }
  }

  // Invalidar caché (cuando se sabe que hay cambios)
  static async invalidateCache(key, userId) {
    try {
      await AsyncStorage.removeItem(`cache_${key}_${userId}`);
    } catch (error) {
      console.error(`Error al invalidar caché ${key}:`, error);
    }
  }

  // Invalidar todos los cachés de un usuario
  static async invalidateAllCache(userId) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userCacheKeys = keys.filter((k) => k.includes(`_${userId}`));

      if (userCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(userCacheKeys);
      }
    } catch (error) {
      console.error("Error al invalidar todo el caché:", error);
    }
  }
}

export default CacheService;
