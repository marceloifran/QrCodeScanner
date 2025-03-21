import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { getCategoriesForIndustry } from '../utils/categoryUtils';

// Categorías (incluirá las personalizadas)
export let categories = [];

// Función para cargar categorías personalizadas
export const loadCustomCategories = async () => {
  if (!auth.currentUser) return;
  
  try {
    const customCategoriesRef = doc(db, 'customCategories', auth.currentUser.uid);
    const customCategoriesDoc = await getDoc(customCategoriesRef);
    
    if (customCategoriesDoc.exists()) {
      const customCategoriesData = customCategoriesDoc.data().categories || {};
      
      // Convertir objeto a array
      const customCategoriesArray = Object.entries(customCategoriesData).map(([id, data]) => ({
        id,
        name: data.name,
        icon: data.icon || 'pricetag-outline'
      }));
      
      categories = customCategoriesArray;
    } else {
      // Si no hay categorías personalizadas, cargar las predefinidas según la industria
      const businessInfoRef = doc(db, 'businessInfo', auth.currentUser.uid);
      const businessInfoDoc = await getDoc(businessInfoRef);
      
      if (businessInfoDoc.exists()) {
        const industry = businessInfoDoc.data().industry || 'general';
        categories = getCategoriesForIndustry(industry);
      } else {
        categories = getCategoriesForIndustry('general');
      }
    }
    
    return categories;
  } catch (error) {
    console.error('Error al cargar categorías personalizadas:', error);
    categories = getCategoriesForIndustry('general');
    return categories;
  }
};

// Función para obtener el nombre de la categoría
export const getCategoryName = (categoryId, categoriesList = categories) => {
  const category = categoriesList.find(cat => cat.id === categoryId);
  return category ? category.name : 'Sin categoría';
};

// Función para obtener el icono de la categoría
export const getCategoryIcon = (categoryId) => {
  // Iconos por defecto según el tipo de categoría
  const defaultIcons = {
    'general': 'cube-outline',
    'offers': 'pricetag-outline',
    'new': 'star-outline',
    'popular': 'flame-outline',
    'shirts': 'shirt-outline',
    'pants': 'cut-outline',
    'shoes': 'footsteps-outline',
    'accessories': 'watch-outline',
    'medications': 'medical-outline',
    'vitamins': 'fitness-outline',
    'dairy': 'nutrition-outline',
    'meat': 'restaurant-outline',
    'fruits': 'leaf-outline',
    'beverages': 'wine-outline',
    'smartphones': 'phone-portrait-outline',
    'computers': 'laptop-outline',
    'starters': 'restaurant-outline',
    'desserts': 'ice-cream-outline',
    'bread': 'fast-food-outline',
    'tools': 'construct-outline',
    'skincare': 'water-outline',
    'makeup': 'color-palette-outline',
    'fiction': 'book-outline',
    'nonfiction': 'document-text-outline',
    // Añadir más iconos según sea necesario
  };
  
  return defaultIcons[categoryId] || 'cube-outline'; // Icono por defecto
}; 