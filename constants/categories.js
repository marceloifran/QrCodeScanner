import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';

// Categorías predefinidas para un supermercado/minimercado
export const predefinedCategories = [
  { id: 'lacteos', name: 'Lácteos', icon: 'nutrition-outline' },
  { id: 'panaderia', name: 'Panadería', icon: 'restaurant-outline' },
  { id: 'carnes', name: 'Carnes', icon: 'fast-food-outline' },
  { id: 'frutas_verduras', name: 'Frutas y Verduras', icon: 'leaf-outline' }, // Ajusté el ID para mejor legibilidad
  { id: 'bebidas', name: 'Bebidas', icon: 'wine-outline' },
  { id: 'limpieza', name: 'Limpieza', icon: 'sparkles-outline' },
  { id: 'cuidado_personal', name: 'Cuidado Personal', icon: 'body-outline' }, // Ajusté el ID para mejor legibilidad
  { id: 'snacks', name: 'Snacks', icon: 'pizza-outline' },
  { id: 'otros', name: 'Otros', icon: 'grid-outline' },
  { id: 'bazar', name: 'Bazar', icon: 'basket-outline' },
  { id: 'almacen', name: 'Almacén', icon: 'home-outline' },
  { id: 'dulces', name: 'Dulces', icon: 'ice-cream-outline' },
  { id: 'golosinas', name: 'Golosinas', icon: 'ice-cream-outline' },
  { id: 'cigarros', name: 'Cigarros', icon: 'flame-outline' },
  { id: 'medicamentos', name: 'Medicamentos', icon: 'medical-outline' },
  { id: 'condimentos', name: 'Condimentos', icon: 'pizza-outline' },
  { id: 'salsas', name: 'Salsas', icon: 'wine-outline' },
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
  if (!categoryId) return 'Sin categoría';
  
  const category = predefinedCategories.find(cat => cat.id === categoryId);
  return category ? category.name : categoryId;
};

// Función para obtener el icono de una categoría por su ID
export const getCategoryIcon = (categoryId) => {
  if (!categoryId) return 'help-circle-outline';
  
  const category = predefinedCategories.find(cat => cat.id === categoryId);
  return category ? category.icon : 'grid-outline';
}; 