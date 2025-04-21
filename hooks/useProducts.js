import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import CacheService from "../utils/cacheService";

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;

      // Si no es un refresh forzado, intentar cargar desde caché primero
      if (!forceRefresh) {
        const cachedProducts = await CacheService.getFromCache(
          "products",
          userId
        );

        if (cachedProducts && cachedProducts.length > 0) {
          setProducts(cachedProducts);
          setLoading(false);
          return;
        }
      }

      // Si no hay caché o es refresh forzado, cargar desde Firestore
      const q = query(
        collection(db, "products"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Guardar en caché para uso futuro
      if (productsData.length > 0) {
        await CacheService.saveToCache("products", productsData, userId);
      }

      setProducts(productsData);
    } catch (e) {
      console.error("Error al cargar productos:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshProducts = () => {
    setRefreshing(true);
    // Invalidar el caché primero
    if (auth.currentUser) {
      CacheService.invalidateCache("products", auth.currentUser.uid).then(() =>
        loadProducts(true)
      );
    } else {
      loadProducts(true);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return { products, loadProducts, refreshProducts, loading, refreshing };
};
