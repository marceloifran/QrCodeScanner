import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export const useSales = (filter) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSales = async () => {
      setLoading(true);
      try {
        let salesQuery;
        const now = new Date();

        if (filter === 'today') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          salesQuery = query(
            collection(db, 'sales'),
            where('userId', '==', auth.currentUser.uid),
            where('date', '>=', Timestamp.fromDate(startOfDay)),
            orderBy('date', 'desc')
          );
        } else if (filter === 'week') {
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          salesQuery = query(
            collection(db, 'sales'),
            where('userId', '==', auth.currentUser.uid),
            where('date', '>=', Timestamp.fromDate(oneWeekAgo)),
            orderBy('date', 'desc')
          );
        } else if (filter === 'month') {
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          salesQuery = query(
            collection(db, 'sales'),
            where('userId', '==', auth.currentUser.uid),
            where('date', '>=', Timestamp.fromDate(oneMonthAgo)),
            orderBy('date', 'desc')
          );
        } else {
          salesQuery = query(
            collection(db, 'sales'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('date', 'desc')
          );
        }

        const querySnapshot = await getDocs(salesQuery);
        const salesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date(),
        }));

        setSales(salesData);
      } catch (error) {
        console.error('Error al cargar ventas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSales();
  }, [filter]);

  return { sales, loading };
};
