// Categorías predefinidas por tipo de industria
export const INDUSTRY_CATEGORIES = {
  general: [
    { id: 'general', name: 'General' },
    { id: 'offers', name: 'Ofertas' },
    { id: 'new', name: 'Nuevos' },
    { id: 'popular', name: 'Populares' }
  ],
  clothing: [
    { id: 'shirts', name: 'Camisetas' },
    { id: 'pants', name: 'Pantalones' },
    { id: 'dresses', name: 'Vestidos' },
    { id: 'shoes', name: 'Calzado' },
    { id: 'accessories', name: 'Accesorios' },
    { id: 'underwear', name: 'Ropa Interior' },
    { id: 'sportswear', name: 'Ropa Deportiva' },
    { id: 'outerwear', name: 'Abrigos' }
  ],
  pharmacy: [
    { id: 'medications', name: 'Medicamentos' },
    { id: 'vitamins', name: 'Vitaminas y Suplementos' },
    { id: 'personal_care', name: 'Cuidado Personal' },
    { id: 'first_aid', name: 'Primeros Auxilios' },
    { id: 'baby_care', name: 'Cuidado del Bebé' },
    { id: 'dermocosmetics', name: 'Dermocosmética' }
  ],
  grocery: [
    { id: 'dairy', name: 'Lácteos' },
    { id: 'meat', name: 'Carnes' },
    { id: 'fruits', name: 'Frutas y Verduras' },
    { id: 'bakery', name: 'Panadería' },
    { id: 'beverages', name: 'Bebidas' },
    { id: 'snacks', name: 'Snacks' },
    { id: 'canned', name: 'Enlatados' },
    { id: 'frozen', name: 'Congelados' },
    { id: 'cleaning', name: 'Limpieza' }
  ],
  electronics: [
    { id: 'smartphones', name: 'Smartphones' },
    { id: 'computers', name: 'Computadoras' },
    { id: 'tablets', name: 'Tablets' },
    { id: 'audio', name: 'Audio' },
    { id: 'tv', name: 'Televisores' },
    { id: 'accessories', name: 'Accesorios' },
    { id: 'gaming', name: 'Gaming' }
  ],
  restaurant: [
    { id: 'starters', name: 'Entradas' },
    { id: 'main_courses', name: 'Platos Principales' },
    { id: 'desserts', name: 'Postres' },
    { id: 'beverages', name: 'Bebidas' },
    { id: 'alcoholic', name: 'Bebidas Alcohólicas' },
    { id: 'specials', name: 'Especiales' }
  ],
  bakery: [
    { id: 'bread', name: 'Panes' },
    { id: 'pastries', name: 'Pastelería' },
    { id: 'cakes', name: 'Tortas' },
    { id: 'cookies', name: 'Galletas' },
    { id: 'sandwiches', name: 'Sándwiches' },
    { id: 'beverages', name: 'Bebidas' }
  ],
  hardware: [
    { id: 'tools', name: 'Herramientas' },
    { id: 'electrical', name: 'Eléctricos' },
    { id: 'plumbing', name: 'Plomería' },
    { id: 'paint', name: 'Pinturas' },
    { id: 'construction', name: 'Construcción' },
    { id: 'garden', name: 'Jardín' }
  ],
  beauty: [
    { id: 'skincare', name: 'Cuidado de la Piel' },
    { id: 'makeup', name: 'Maquillaje' },
    { id: 'haircare', name: 'Cuidado del Cabello' },
    { id: 'fragrances', name: 'Fragancias' },
    { id: 'nailcare', name: 'Cuidado de Uñas' },
    { id: 'tools', name: 'Herramientas de Belleza' }
  ],
  bookstore: [
    { id: 'fiction', name: 'Ficción' },
    { id: 'nonfiction', name: 'No Ficción' },
    { id: 'children', name: 'Infantil' },
    { id: 'academic', name: 'Académicos' },
    { id: 'magazines', name: 'Revistas' },
    { id: 'stationery', name: 'Papelería' }
  ],
  other: [
    { id: 'category1', name: 'Categoría 1' },
    { id: 'category2', name: 'Categoría 2' },
    { id: 'category3', name: 'Categoría 3' },
    { id: 'category4', name: 'Categoría 4' }
  ]
};

// Función para obtener las categorías según la industria
export const getCategoriesForIndustry = (industry) => {
  // Categorías por defecto para todas las industrias
  const commonCategories = [
    { id: 'general', name: 'General', icon: 'cube-outline' },
    { id: 'offers', name: 'Ofertas', icon: 'pricetag-outline' },
    { id: 'new', name: 'Nuevos', icon: 'star-outline' },
    { id: 'popular', name: 'Populares', icon: 'flame-outline' },
  ];
  
  // Categorías específicas por industria
  const industryCategories = {
    'general': [
      { id: 'electronics', name: 'Electrónica', icon: 'hardware-chip-outline' },
      { id: 'home', name: 'Hogar', icon: 'home-outline' },
      { id: 'clothing', name: 'Ropa', icon: 'shirt-outline' },
      { id: 'food', name: 'Alimentos', icon: 'restaurant-outline' },
    ],
    'grocery': [
      { id: 'dairy', name: 'Lácteos', icon: 'nutrition-outline' },
      { id: 'meat', name: 'Carnes', icon: 'restaurant-outline' },
      { id: 'fruits', name: 'Frutas y Verduras', icon: 'leaf-outline' },
      { id: 'beverages', name: 'Bebidas', icon: 'wine-outline' },
      { id: 'bakery', name: 'Panadería', icon: 'fast-food-outline' },
      { id: 'cleaning', name: 'Limpieza', icon: 'sparkles-outline' },
      { id: 'personal', name: 'Cuidado Personal', icon: 'body-outline' },
    ],
    'clothing': [
      { id: 'shirts', name: 'Camisas', icon: 'shirt-outline' },
      { id: 'pants', name: 'Pantalones', icon: 'cut-outline' },
      { id: 'shoes', name: 'Calzado', icon: 'footsteps-outline' },
      { id: 'accessories', name: 'Accesorios', icon: 'watch-outline' },
    ],
    'pharmacy': [
      { id: 'medications', name: 'Medicamentos', icon: 'medical-outline' },
      { id: 'vitamins', name: 'Vitaminas', icon: 'fitness-outline' },
      { id: 'personal', name: 'Cuidado Personal', icon: 'body-outline' },
      { id: 'beauty', name: 'Belleza', icon: 'color-palette-outline' },
    ],
    'electronics': [
      { id: 'smartphones', name: 'Smartphones', icon: 'phone-portrait-outline' },
      { id: 'computers', name: 'Computadoras', icon: 'laptop-outline' },
      { id: 'accessories', name: 'Accesorios', icon: 'watch-outline' },
      { id: 'audio', name: 'Audio', icon: 'headset-outline' },
    ],
    'restaurant': [
      { id: 'starters', name: 'Entradas', icon: 'restaurant-outline' },
      { id: 'main', name: 'Platos Principales', icon: 'fast-food-outline' },
      { id: 'desserts', name: 'Postres', icon: 'ice-cream-outline' },
      { id: 'beverages', name: 'Bebidas', icon: 'wine-outline' },
    ],
    'bakery': [
      { id: 'bread', name: 'Panes', icon: 'fast-food-outline' },
      { id: 'pastries', name: 'Pastelería', icon: 'ice-cream-outline' },
      { id: 'cakes', name: 'Tortas', icon: 'cafe-outline' },
      { id: 'cookies', name: 'Galletas', icon: 'pizza-outline' },
    ],
    'hardware': [
      { id: 'tools', name: 'Herramientas', icon: 'construct-outline' },
      { id: 'materials', name: 'Materiales', icon: 'cube-outline' },
      { id: 'electrical', name: 'Eléctricos', icon: 'flash-outline' },
      { id: 'plumbing', name: 'Plomería', icon: 'water-outline' },
    ],
    'beauty': [
      { id: 'skincare', name: 'Cuidado de la Piel', icon: 'water-outline' },
      { id: 'makeup', name: 'Maquillaje', icon: 'color-palette-outline' },
      { id: 'hair', name: 'Cabello', icon: 'cut-outline' },
      { id: 'nails', name: 'Uñas', icon: 'hand-left-outline' },
    ],
    'bookstore': [
      { id: 'fiction', name: 'Ficción', icon: 'book-outline' },
      { id: 'nonfiction', name: 'No Ficción', icon: 'document-text-outline' },
      { id: 'children', name: 'Infantil', icon: 'happy-outline' },
      { id: 'academic', name: 'Académicos', icon: 'school-outline' },
    ],
    'other': commonCategories,
  };
  
  // Devolver las categorías específicas de la industria o las comunes si no hay específicas
  return industryCategories[industry] || commonCategories;
};

// Función para obtener el nombre de una categoría por su ID
export const getCategoryName = (categoryId, categories) => {
  if (!categoryId) return 'Sin categoría';
  
  const category = categories.find(cat => cat.id === categoryId);
  return category ? category.name : 'Sin categoría';
};

// Función para obtener el icono de una categoría por su ID
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

// Función para obtener los campos personalizados según la industria
export const getCustomFieldsForIndustry = (industryType) => {
  switch (industryType) {
    case 'clothing':
      return {
        size: { 
          enabled: true, 
          required: false, 
          label: 'Talle',
          type: 'select',
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Único']
        },
        color: { 
          enabled: true, 
          required: false, 
          label: 'Color',
          type: 'select',
          options: ['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Rosa', 'Gris', 'Marrón', 'Otro']
        },
        material: { 
          enabled: true, 
          required: false, 
          label: 'Material',
          type: 'select',
          options: ['Algodón', 'Poliéster', 'Lana', 'Lino', 'Seda', 'Cuero', 'Mezclilla', 'Otro']
        },
        brand: { 
          enabled: true, 
          required: false, 
          label: 'Marca',
          type: 'text'
        },
        season: { 
          enabled: true, 
          required: false, 
          label: 'Temporada',
          type: 'select',
          options: ['Primavera/Verano', 'Otoño/Invierno', 'Todo el año']
        }
      };
    case 'pharmacy':
      return {
        expirationDate: { 
          enabled: true, 
          required: true, 
          label: 'Fecha de Vencimiento',
          type: 'date'
        },
        activeIngredient: { 
          enabled: true, 
          required: false, 
          label: 'Principio Activo',
          type: 'text'
        },
        laboratory: { 
          enabled: true, 
          required: false, 
          label: 'Laboratorio',
          type: 'text'
        },
        prescription: { 
          enabled: true, 
          required: false, 
          label: 'Requiere Receta',
          type: 'boolean'
        }
      };
    case 'grocery':
      return {
        expirationDate: { 
          enabled: true, 
          required: true, 
          label: 'Fecha de Vencimiento',
          type: 'date'
        },
        weight: { 
          enabled: true, 
          required: false, 
          label: 'Peso/Volumen',
          type: 'text'
        },
        brand: { 
          enabled: true, 
          required: false, 
          label: 'Marca',
          type: 'text'
        },
        origin: { 
          enabled: true, 
          required: false, 
          label: 'Origen',
          type: 'text'
        }
      };
    case 'electronics':
      return {
        brand: { 
          enabled: true, 
          required: false, 
          label: 'Marca',
          type: 'text'
        },
        model: { 
          enabled: true, 
          required: false, 
          label: 'Modelo',
          type: 'text'
        },
        warranty: { 
          enabled: true, 
          required: false, 
          label: 'Garantía',
          type: 'text'
        },
        specs: { 
          enabled: true, 
          required: false, 
          label: 'Especificaciones',
          type: 'textarea'
        }
      };
    case 'restaurant':
      return {
        ingredients: { 
          enabled: true, 
          required: false, 
          label: 'Ingredientes',
          type: 'textarea'
        },
        allergens: { 
          enabled: true, 
          required: false, 
          label: 'Alérgenos',
          type: 'textarea'
        },
        preparationTime: { 
          enabled: true, 
          required: false, 
          label: 'Tiempo de Preparación',
          type: 'text'
        },
        calories: { 
          enabled: true, 
          required: false, 
          label: 'Calorías',
          type: 'number'
        }
      };
    case 'bakery':
      return {
        ingredients: { 
          enabled: true, 
          required: false, 
          label: 'Ingredientes',
          type: 'textarea'
        },
        allergens: { 
          enabled: true, 
          required: false, 
          label: 'Alérgenos',
          type: 'textarea'
        },
        expirationDate: { 
          enabled: true, 
          required: true, 
          label: 'Fecha de Vencimiento',
          type: 'date'
        },
        weight: { 
          enabled: true, 
          required: false, 
          label: 'Peso',
          type: 'text'
        }
      };
    case 'hardware':
      return {
        brand: { 
          enabled: true, 
          required: false, 
          label: 'Marca',
          type: 'text'
        },
        material: { 
          enabled: true, 
          required: false, 
          label: 'Material',
          type: 'text'
        },
        dimensions: { 
          enabled: true, 
          required: false, 
          label: 'Dimensiones',
          type: 'text'
        },
        warranty: { 
          enabled: true, 
          required: false, 
          label: 'Garantía',
          type: 'text'
        }
      };
    case 'beauty':
      return {
        brand: { 
          enabled: true, 
          required: false, 
          label: 'Marca',
          type: 'text'
        },
        expirationDate: { 
          enabled: true, 
          required: true, 
          label: 'Fecha de Vencimiento',
          type: 'date'
        },
        ingredients: { 
          enabled: true, 
          required: false, 
          label: 'Ingredientes',
          type: 'textarea'
        },
        volume: { 
          enabled: true, 
          required: false, 
          label: 'Volumen/Peso',
          type: 'text'
        }
      };
    case 'bookstore':
      return {
        author: { 
          enabled: true, 
          required: false, 
          label: 'Autor',
          type: 'text'
        },
        publisher: { 
          enabled: true, 
          required: false, 
          label: 'Editorial',
          type: 'text'
        },
        isbn: { 
          enabled: true, 
          required: false, 
          label: 'ISBN',
          type: 'text'
        },
        pages: { 
          enabled: true, 
          required: false, 
          label: 'Páginas',
          type: 'number'
        }
      };
    default:
      return {
        brand: { 
          enabled: true, 
          required: false, 
          label: 'Marca',
          type: 'text'
        },
        model: { 
          enabled: true, 
          required: false, 
          label: 'Modelo',
          type: 'text'
        },
        description: { 
          enabled: true, 
          required: false, 
          label: 'Descripción',
          type: 'textarea'
        }
      };
  }
}; 