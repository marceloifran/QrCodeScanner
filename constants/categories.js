import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

// Categorías predefinidas para un supermercado/minimercado
export const predefinedCategories = [
  { id: 'bebidas', name: 'Bebidas', icon: 'cafe-outline' },
  { id: 'lacteos', name: 'Lácteos', icon: 'nutrition-outline' },
  { id: 'panaderia', name: 'Panadería', icon: 'pizza-outline' },
  { id: 'carnes', name: 'Carnes', icon: 'fast-food-outline' },
  { id: 'frutas', name: 'Frutas y Verduras', icon: 'leaf-outline' },
  { id: 'congelados', name: 'Congelados', icon: 'snow-outline' },
  { id: 'snacks', name: 'Snacks', icon: 'fast-food-outline' },
  { id: 'dulces', name: 'Dulces', icon: 'ice-cream-outline' },
  { id: 'almacen', name: 'Almacén', icon: 'basket-outline' },
  { id: 'limpieza', name: 'Limpieza', icon: 'sparkles-outline' },
  { id: 'higiene', name: 'Higiene Personal', icon: 'water-outline' },
  { id: 'cigarrillos', name: 'Cigarrillos', icon: 'flame-outline' },
  { id: 'bazar', name: 'Bazar', icon: 'home-outline' },
  { id: 'papeleria', name: 'Papelería', icon: 'pencil-outline' },
  { id: 'mascotas', name: 'Mascotas', icon: 'paw-outline' },
  { id: 'otros', name: 'Otros', icon: 'grid-outline' }
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
  return category ? category.name : 'Sin categoría';
};

// Función para obtener el icono de una categoría por su ID
export const getCategoryIcon = (categoryId) => {
  const category = predefinedCategories.find(cat => cat.id === categoryId);
  return category ? category.icon : 'help-circle-outline';
}; 