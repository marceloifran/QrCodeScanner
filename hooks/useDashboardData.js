import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const useDashboardData = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    inventoryValue: 0,
    categoryCounts: {},
    recentSales: [],
    userName: '',
    userEmail: '',
    businessName: '',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;

      const [userDoc, productsSnapshot, salesSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDocs(query(collection(db, 'products'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'sales'), where('userId', '==', userId), orderBy('date', 'desc'), limit(5)))
      ]);

      const userData = userDoc.data() || {};

      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date?.toDate() || new Date() }));

      const totalProducts = products.length;
      const lowStockProducts = products.filter(p => p.stock <= 5).length;
      const inventoryValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);

      const categoryCounts = {};
      products.forEach(product => {
        const category = product.category || 'Sin categoría';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const recentSales = sales.map(sale => ({
        ...sale,
        date: sale.date instanceof Date ? sale.date : sale.date.toDate()
      }));
      

      setStats({
        totalProducts: products.length,
        totalSales,
        totalRevenue,
        lowStockProducts: products.filter(p => p.stock <= 5).length,
        inventoryValue,
        categoryCounts,
        recentSales,
        userName: userData.name || 'Usuario',
        userEmail: auth.currentUser.email,
        businessName: userData.businessName || 'Mi Negocio',
      });
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  return { stats, loading, refreshDashboardData: loadDashboardData, refreshing, onRefresh };
};
