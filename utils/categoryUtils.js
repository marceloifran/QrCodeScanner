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

// Función para obtener categorías según la industria
export const getCategoriesForIndustry = (industryType) => {
  // Categorías base que aparecen en todas las industrias
  const baseCategories = [
    { id: 'general', name: 'General', icon: 'cube-outline' },
    { id: 'offers', name: 'Ofertas', icon: 'pricetag-outline' },
    { id: 'new', name: 'Nuevos', icon: 'star-outline' },
    { id: 'popular', name: 'Populares', icon: 'flame-outline' }
  ];

  // Categorías específicas por industria
  switch (industryType) {
    case 'general':
      return [
        ...baseCategories,
        { id: 'electronics', name: 'Electrónica', icon: 'hardware-chip-outline' },
        { id: 'home', name: 'Hogar', icon: 'home-outline' },
        { id: 'clothing', name: 'Ropa', icon: 'shirt-outline' },
        { id: 'food', name: 'Alimentos', icon: 'restaurant-outline' },
      ];
    case 'grocery':
      return [
        ...baseCategories,
        { id: 'dairy', name: 'Lácteos', icon: 'nutrition-outline' },
        { id: 'meat', name: 'Carnes', icon: 'restaurant-outline' },
        { id: 'fruits', name: 'Frutas y Verduras', icon: 'leaf-outline' },
        { id: 'beverages', name: 'Bebidas', icon: 'wine-outline' },
        { id: 'bakery', name: 'Panadería', icon: 'fast-food-outline' },
        { id: 'cleaning', name: 'Limpieza', icon: 'sparkles-outline' },
        { id: 'personal', name: 'Cuidado Personal', icon: 'body-outline' },
      ];
    case 'clothing':
      return [
        ...baseCategories,
        { id: 'shirts', name: 'Camisas', icon: 'shirt-outline' },
        { id: 'pants', name: 'Pantalones', icon: 'cut-outline' },
        { id: 'shoes', name: 'Calzado', icon: 'footsteps-outline' },
        { id: 'accessories', name: 'Accesorios', icon: 'watch-outline' },
      ];
    case 'pharmacy':
      return [
        ...baseCategories,
        { id: 'medications', name: 'Medicamentos', icon: 'medical-outline' },
        { id: 'vitamins', name: 'Vitaminas', icon: 'fitness-outline' },
        { id: 'personal', name: 'Cuidado Personal', icon: 'body-outline' },
        { id: 'beauty', name: 'Belleza', icon: 'color-palette-outline' },
      ];
    case 'electronics':
      return [
        ...baseCategories,
        { id: 'smartphones', name: 'Smartphones', icon: 'phone-portrait-outline' },
        { id: 'computers', name: 'Computadoras', icon: 'laptop-outline' },
        { id: 'accessories', name: 'Accesorios', icon: 'watch-outline' },
        { id: 'audio', name: 'Audio', icon: 'headset-outline' },
      ];
    case 'restaurant':
      return [
        ...baseCategories,
        { id: 'starters', name: 'Entradas', icon: 'restaurant-outline' },
        { id: 'main', name: 'Platos Principales', icon: 'fast-food-outline' },
        { id: 'desserts', name: 'Postres', icon: 'ice-cream-outline' },
        { id: 'beverages', name: 'Bebidas', icon: 'wine-outline' },
      ];
    case 'bakery':
      return [
        ...baseCategories,
        { id: 'bread', name: 'Panes', icon: 'fast-food-outline' },
        { id: 'pastries', name: 'Pastelería', icon: 'ice-cream-outline' },
        { id: 'cakes', name: 'Tortas', icon: 'cafe-outline' },
        { id: 'cookies', name: 'Galletas', icon: 'pizza-outline' },
      ];
    case 'hardware':
      return [
        ...baseCategories,
        { id: 'tools', name: 'Herramientas', icon: 'construct-outline' },
        { id: 'materials', name: 'Materiales', icon: 'cube-outline' },
        { id: 'electrical', name: 'Eléctricos', icon: 'flash-outline' },
        { id: 'plumbing', name: 'Plomería', icon: 'water-outline' },
      ];
    case 'beauty':
      return [
        ...baseCategories,
        { id: 'skincare', name: 'Cuidado de la Piel', icon: 'water-outline' },
        { id: 'makeup', name: 'Maquillaje', icon: 'color-palette-outline' },
        { id: 'hair', name: 'Cabello', icon: 'cut-outline' },
        { id: 'nails', name: 'Uñas', icon: 'hand-left-outline' },
      ];
    case 'bookstore':
      return [
        ...baseCategories,
        { id: 'fiction', name: 'Ficción', icon: 'book-outline' },
        { id: 'nonfiction', name: 'No Ficción', icon: 'document-text-outline' },
        { id: 'children', name: 'Infantil', icon: 'happy-outline' },
        { id: 'academic', name: 'Académicos', icon: 'school-outline' },
      ];
    default:
      return baseCategories;
  }
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

// Función para obtener campos personalizados según la industria
export const getCustomFieldsForIndustry = (industryType) => {
  // Campos base que aparecen en todas las industrias
  const baseFields = [
    { 
      id: 'barcode', 
      name: 'Código de Barras', 
      type: 'text',
      required: false,
      showInList: true,
      order: 1
    },
    { 
      id: 'price', 
      name: 'Precio', 
      type: 'number',
      required: true,
      showInList: true,
      order: 2
    },
    { 
      id: 'stock', 
      name: 'Stock', 
      type: 'number',
      required: true,
      showInList: true,
      order: 3
    },
    { 
      id: 'category', 
      name: 'Categoría', 
      type: 'select',
      required: true,
      showInList: true,
      order: 4
    }
  ];

  // Campos específicos por industria
  switch (industryType) {
    case 'grocery':
      return [
        ...baseFields,
        { 
          id: 'expirationDate', 
          name: 'Fecha de Vencimiento', 
          type: 'date',
          required: false,
          showInList: true,
          order: 5
        },
        { 
          id: 'brand', 
          name: 'Marca', 
          type: 'text',
          required: false,
          showInList: true,
          order: 6
        },
        { 
          id: 'weight', 
          name: 'Peso/Volumen', 
          type: 'text',
          required: false,
          showInList: false,
          order: 7
        }
      ];
      
    case 'clothing':
      return [
        ...baseFields,
        { 
          id: 'size', 
          name: 'Talla', 
          type: 'text',
          required: false,
          showInList: true,
          order: 5
        },
        { 
          id: 'color', 
          name: 'Color', 
          type: 'text',
          required: false,
          showInList: true,
          order: 6
        },
        { 
          id: 'material', 
          name: 'Material', 
          type: 'text',
          required: false,
          showInList: false,
          order: 7
        },
        { 
          id: 'brand', 
          name: 'Marca', 
          type: 'text',
          required: false,
          showInList: true,
          order: 8
        }
      ];
      
    case 'pharmacy':
      return [
        ...baseFields,
        { 
          id: 'expirationDate', 
          name: 'Fecha de Vencimiento', 
          type: 'date',
          required: true,
          showInList: true,
          order: 5
        },
        { 
          id: 'laboratory', 
          name: 'Laboratorio', 
          type: 'text',
          required: false,
          showInList: true,
          order: 6
        },
        { 
          id: 'activeIngredient', 
          name: 'Principio Activo', 
          type: 'text',
          required: false,
          showInList: false,
          order: 7
        },
        { 
          id: 'requiresPrescription', 
          name: 'Requiere Receta', 
          type: 'boolean',
          required: true,
          showInList: true,
          order: 8
        }
      ];
      
    case 'electronics':
      return [
        ...baseFields,
        { 
          id: 'brand', 
          name: 'Marca', 
          type: 'text',
          required: false,
          showInList: true,
          order: 5
        },
        { 
          id: 'model', 
          name: 'Modelo', 
          type: 'text',
          required: false,
          showInList: true,
          order: 6
        },
        { 
          id: 'warranty', 
          name: 'Garantía (meses)', 
          type: 'number',
          required: false,
          showInList: false,
          order: 7
        }
      ];
      
    case 'restaurant':
      return [
        ...baseFields,
        { 
          id: 'ingredients', 
          name: 'Ingredientes', 
          type: 'textarea',
          required: false,
          showInList: false,
          order: 5
        },
        { 
          id: 'preparationTime', 
          name: 'Tiempo de Preparación (min)', 
          type: 'number',
          required: false,
          showInList: false,
          order: 6
        },
        { 
          id: 'allergens', 
          name: 'Alérgenos', 
          type: 'text',
          required: false,
          showInList: false,
          order: 7
        }
      ];
      
    case 'bakery':
      return [
        ...baseFields,
        { 
          id: 'ingredients', 
          name: 'Ingredientes', 
          type: 'textarea',
          required: false,
          showInList: false,
          order: 5
        },
        { 
          id: 'expirationDays', 
          name: 'Días de Duración', 
          type: 'number',
          required: false,
          showInList: false,
          order: 6
        },
        { 
          id: 'allergens', 
          name: 'Alérgenos', 
          type: 'text',
          required: false,
          showInList: false,
          order: 7
        }
      ];
      
    case 'hardware':
      return [
        ...baseFields,
        { 
          id: 'brand', 
          name: 'Marca', 
          type: 'text',
          required: false,
          showInList: true,
          order: 5
        },
        { 
          id: 'material', 
          name: 'Material', 
          type: 'text',
          required: false,
          showInList: false,
          order: 6
        },
        { 
          id: 'dimensions', 
          name: 'Dimensiones', 
          type: 'text',
          required: false,
          showInList: false,
          order: 7
        }
      ];
      
    case 'beauty':
      return [
        ...baseFields,
        { 
          id: 'brand', 
          name: 'Marca', 
          type: 'text',
          required: false,
          showInList: true,
          order: 5
        },
        { 
          id: 'expirationDate', 
          name: 'Fecha de Vencimiento', 
          type: 'date',
          required: false,
          showInList: true,
          order: 6
        },
        { 
          id: 'ingredients', 
          name: 'Ingredientes', 
          type: 'textarea',
          required: false,
          showInList: false,
          order: 7
        }
      ];
      
    case 'bookstore':
      return [
        ...baseFields,
        { 
          id: 'author', 
          name: 'Autor', 
          type: 'text',
          required: false,
          showInList: true,
          order: 5
        },
        { 
          id: 'publisher', 
          name: 'Editorial', 
          type: 'text',
          required: false,
          showInList: false,
          order: 6
        },
        { 
          id: 'isbn', 
          name: 'ISBN', 
          type: 'text',
          required: false,
          showInList: false,
          order: 7
        }
      ];
      
    default:
      return baseFields;
  }
}; 