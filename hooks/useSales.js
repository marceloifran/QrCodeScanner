import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import CacheService from "../utils/cacheService";

export const useSales = (filter) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;

      // Intentar cargar desde caché primero
      const cacheKey = `sales_${filter}`;
      const cachedSales = await CacheService.getFromCache(cacheKey, userId);

      if (cachedSales && cachedSales.length > 0) {
        setSales(cachedSales);
        setLoading(false);
        return;
      }

      // Si no hay caché, cargar desde Firestore
      let salesQuery;
      const now = new Date();

      if (filter === "today") {
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0
        );
        salesQuery = query(
          collection(db, "sales"),
          where("userId", "==", userId),
          where("date", ">=", Timestamp.fromDate(startOfDay)),
          orderBy("date", "desc")
        );
      } else if (filter === "week") {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        salesQuery = query(
          collection(db, "sales"),
          where("userId", "==", userId),
          where("date", ">=", Timestamp.fromDate(oneWeekAgo)),
          orderBy("date", "desc")
        );
      } else if (filter === "month") {
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        salesQuery = query(
          collection(db, "sales"),
          where("userId", "==", userId),
          where("date", ">=", Timestamp.fromDate(oneMonthAgo)),
          orderBy("date", "desc")
        );
      } else {
        salesQuery = query(
          collection(db, "sales"),
          where("userId", "==", userId),
          orderBy("date", "desc")
        );
      }

      const querySnapshot = await getDocs(salesQuery);
      const salesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
      }));

      // Guardar en caché para uso futuro
      if (salesData.length > 0) {
        await CacheService.saveToCache(cacheKey, salesData, userId);
      }

      setSales(salesData);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const refreshSales = useCallback(() => {
    // Al refrescar, invalidar la caché primero para forzar carga desde Firestore
    if (auth.currentUser) {
      const cacheKey = `sales_${filter}`;
      CacheService.invalidateCache(cacheKey, auth.currentUser.uid);
    }
    return loadSales();
  }, [loadSales, filter]);

  return { sales, loading, refreshSales };
};
