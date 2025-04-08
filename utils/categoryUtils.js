export const INDUSTRY_CATEGORIES = {
  general: [
    { id: "general", name: "General" },
    { id: "offers", name: "Ofertas" },
    { id: "new", name: "Nuevos" },
    { id: "popular", name: "Populares" },
  ],
  clothing: [
    { id: "shirts", name: "Camisetas" },
    { id: "pants", name: "Pantalones" },
    { id: "dresses", name: "Vestidos" },
    { id: "shoes", name: "Calzado" },
    { id: "accessories", name: "Accesorios" },
    { id: "underwear", name: "Ropa Interior" },
    { id: "sportswear", name: "Ropa Deportiva" },
    { id: "outerwear", name: "Abrigos" },
  ],
  pharmacy: [
    { id: "medications", name: "Medicamentos" },
    { id: "vitamins", name: "Vitaminas y Suplementos" },
    { id: "personal_care", name: "Cuidado Personal" },
    { id: "first_aid", name: "Primeros Auxilios" },
    { id: "baby_care", name: "Cuidado del Bebé" },
    { id: "dermocosmetics", name: "Dermocosmética" },
  ],
  grocery: [
    { id: "almacen", name: "Almacén" },
    { id: "bazar", name: "Bazar" },
    { id: "bebidas", name: "Bebidas" },
    { id: "carnes", name: "Carnes" },
    { id: "cigarrillos", name: "Cigarrillos" },
    { id: "congelados", name: "Congelados" },
    { id: "cuidado_personal", name: "Cuidado Personal" },
    { id: "dulces", name: "Dulces" },
    { id: "frutas", name: "Frutas" },
    { id: "higiene", name: "Higiene" },
    { id: "lacteos", name: "Lácteos" },
    { id: "limpieza", name: "Limpieza" },
    { id: "otros", name: "Otros" },
    { id: "panaderia", name: "Panadería" },
    { id: "salsas", name: "Salsas" },
    { id: "snacks", name: "snacks" },
  ],
};

export const getCategoriesForIndustry = (industryType) => {
  const industryCategories = {
    grocery: [
      { id: "lacteos", name: "Lácteos", icon: "nutrition-outline" },
      { id: "carnes", name: "Carnes", icon: "restaurant-outline" },
      { id: "fruits", name: "Frutas y Verduras", icon: "leaf-outline" },
      { id: "bebidas", name: "Bebidas", icon: "wine-outline" },
      { id: "panaderia", name: "Panadería", icon: "fast-food-outline" },
      { id: "limpieza", name: "Limpieza", icon: "sparkles-outline" },
      {
        id: "cuidado_personal",
        name: "Cuidado Personal",
        icon: "body-outline",
      },
      { id: "higiene", name: "Higiene", icon: "water-outline" },
      { id: "almacen", name: "Almacén", icon: "cube-outline" },
      { id: "bazar", name: "Bazar", icon: "basket-outline" },
      { id: "dulces", name: "Dulces", icon: "ice-cream-outline" },
      { id: "snacks", name: "Snacks", icon: "pizza-outline" },
      { id: "cigarrillos", name: "Cigarrillos", icon: "flame-outline" },
      { id: "congelados", name: "Congelados", icon: "snow-outline" },
      { id: "salsas", name: "Salsas", icon: "nutrition-outline" },
      { id: "otros", name: "Otros", icon: "cube-outline" },
    ],
    clothing: [
      { id: "shirts", name: "Camisas", icon: "shirt-outline" },
      { id: "pants", name: "Pantalones", icon: "cut-outline" },
      { id: "shoes", name: "Calzado", icon: "footsteps-outline" },
      { id: "accessories", name: "Accesorios", icon: "watch-outline" },
    ],
  };

  return industryCategories[industryType];
};

// Función para obtener el nombre de una categoría por su ID
export const getCategoryName = (categoryId, categories) => {
  if (!categoryId) return "Sin categoría";

  const category = categories.find((cat) => cat.id === categoryId);
  return category ? category.name : "Sin categoría";
};

// Función para obtener el icono de una categoría por su ID
export const getCategoryIcon = (categoryId) => {
  const defaultIcons = {
    general: "cube-outline",
    offers: "pricetag-outline",
    new: "star-outline",
    popular: "flame-outline",
    shirts: "shirt-outline",
    pants: "cut-outline",
    shoes: "footsteps-outline",
    accessories: "watch-outline",
    medications: "medical-outline",
    vitamins: "fitness-outline",
    dairy: "nutrition-outline",
    meat: "restaurant-outline",
    fruits: "leaf-outline",
    beverages: "wine-outline",
    smartphones: "phone-portrait-outline",
    computers: "laptop-outline",
    starters: "restaurant-outline",
    desserts: "ice-cream-outline",
    bread: "fast-food-outline",
    tools: "construct-outline",
    skincare: "water-outline",
    makeup: "color-palette-outline",
    fiction: "book-outline",
    nonfiction: "document-text-outline",
  };

  return defaultIcons[categoryId] || "cube-outline"; // Icono por defecto
};

export const getCustomFieldsForIndustry = (industryType) => {
  const baseFields = [];

  switch (industryType) {
    case "grocery":
      return [...baseFields];
    case "clothing":
      return [
        ...baseFields,
        {
          id: "size",
          name: "Talle",
          type: "select",
          options: [
            "XS",
            "S",
            "M",
            "L",
            "XL",
            "XXL",
            "36",
            "38",
            "40",
            "42",
            "44",
            "46",
            "Único",
          ],
          required: false,
          showInList: true,
          order: 5,
          renderAs: "selector",
        },
        {
          id: "color",
          name: "Color",
          type: "text",
          required: false,
          showInList: true,
          order: 6,
        },
        {
          id: "material",
          name: "Material",
          type: "text",
          required: false,
          showInList: false,
          order: 7,
        },
      ];
    default:
      return baseFields;
  }
};
