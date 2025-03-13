import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';

// Categorías predefinidas para un supermercado/minimercado
export const predefinedCategories = [
  { id: 'dairy', name: 'Lácteos', icon: 'nutrition-outline' },
  { id: 'bakery', name: 'Panadería', icon: 'restaurant-outline' },
  { id: 'meat', name: 'Carnes', icon: 'fast-food-outline' },
  { id: 'produce', name: 'Frutas y Verduras', icon: 'leaf-outline' },
  { id: 'beverages', name: 'Bebidas', icon: 'wine-outline' },
  { id: 'cleaning', name: 'Limpieza', icon: 'sparkles-outline' },
  { id: 'personal_care', name: 'Cuidado Personal', icon: 'body-outline' },
  { id: 'snacks', name: 'Snacks', icon: 'pizza-outline' },
  { id: 'other', name: 'Otros', icon: 'grid-outline' }
];

// Categorías (incluirá las predefinidas y las personalizadas)
export let categories = [...predefinedCategories];

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
      
      // Combinar categorías predefinidas y personalizadas
      categories = [...predefinedCategories, ...customCategoriesArray];
    } else {
      categories = [...predefinedCategories];
    }
  } catch (error) {
    console.error('Error al cargar categorías personalizadas:', error);
    categories = [...predefinedCategories];
  }
  
  return categories;
};

// Función para obtener el nombre de una categoría por su ID
export const getCategoryName = (categoryId) => {
  const category = predefinedCategories.find(cat => cat.id === categoryId);
  return category ? category.name : categoryId;
};

// Función para obtener el icono de una categoría por su ID
export const getCategoryIcon = (categoryId) => {
  const category = predefinedCategories.find(cat => cat.id === categoryId);
  return category ? category.icon : 'grid-outline';
}; 