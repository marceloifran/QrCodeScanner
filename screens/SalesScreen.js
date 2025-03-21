import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { getCategoriesForIndustry } from '../utils/categories';

const SalesScreen = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadCategoriesAndIndustry = async () => {
      try {
        // Cargar la industria del usuario
        const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
        const businessInfoDoc = await getDoc(businessInfoRef);
        
        let userIndustry = 'general';
        if (businessInfoDoc.exists()) {
          userIndustry = businessInfoDoc.data().industry || 'general';
        }
        
        // Cargar categorías personalizadas del usuario
        const categoriesRef = doc(db, 'categories', auth.currentUser.uid);
        const categoriesDoc = await getDoc(categoriesRef);
        
        if (categoriesDoc.exists() && categoriesDoc.data().categories) {
          setCategories(categoriesDoc.data().categories);
        } else {
          // Si no hay categorías personalizadas, usar las predefinidas según la industria
          setCategories(getCategoriesForIndustry(userIndustry));
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        setCategories(getCategoriesForIndustry('general'));
      }
    };
    
    loadCategoriesAndIndustry();
  }, []);

  // Función para obtener el nombre de la categoría
  const getCategoryName = (categoryId, categoriesList) => {
    const category = categoriesList.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sin categoría';
  };

  return (
    <div>
      {/* Renderiza tu componente */}
    </div>
  );
};

export default SalesScreen; 